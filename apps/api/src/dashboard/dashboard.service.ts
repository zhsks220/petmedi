import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  // 통합 대시보드 통계
  async getDashboardStats(hospitalId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1);

    // 병렬로 모든 통계 쿼리 실행
    const [
      // 기본 카운트
      totalAnimals,
      totalRecords,

      // 오늘 예약 통계
      todayAppointments,
      confirmedAppointments,
      completedAppointments,
      cancelledAppointments,

      // 이번 주 예약
      weeklyAppointments,

      // 이번 달 매출
      monthlyRevenue,
      monthlyInvoices,
      pendingPayments,

      // 재고 알림
      lowStockProducts,
      expiringSoonProducts,

      // 최근 진료 기록
      recentRecords,

      // 오늘 예약 목록
      todayAppointmentsList,
    ] = await Promise.all([
      // 등록된 동물 수
      this.prisma.animal.count({
        where: {
          guardians: {
            some: {
              guardian: {
                hospitalStaff: {
                  some: { hospitalId },
                },
              },
            },
          },
        },
      }),

      // 진료 기록 수
      this.prisma.medicalRecord.count({
        where: { hospitalId },
      }),

      // 오늘 전체 예약 수
      this.prisma.appointment.count({
        where: {
          hospitalId,
          appointmentDate: {
            gte: today,
            lt: tomorrow,
          },
        },
      }),

      // 오늘 확정된 예약
      this.prisma.appointment.count({
        where: {
          hospitalId,
          appointmentDate: {
            gte: today,
            lt: tomorrow,
          },
          status: 'CONFIRMED',
        },
      }),

      // 오늘 완료된 예약
      this.prisma.appointment.count({
        where: {
          hospitalId,
          appointmentDate: {
            gte: today,
            lt: tomorrow,
          },
          status: 'COMPLETED',
        },
      }),

      // 오늘 취소된 예약
      this.prisma.appointment.count({
        where: {
          hospitalId,
          appointmentDate: {
            gte: today,
            lt: tomorrow,
          },
          status: 'CANCELLED',
        },
      }),

      // 이번 주 예약 수
      this.prisma.appointment.count({
        where: {
          hospitalId,
          appointmentDate: {
            gte: weekStart,
            lt: weekEnd,
          },
          status: { not: 'CANCELLED' },
        },
      }),

      // 이번 달 매출 합계
      this.prisma.payment.aggregate({
        where: {
          invoice: { hospitalId },
          paidAt: {
            gte: monthStart,
            lt: monthEnd,
          },
          status: 'COMPLETED',
        },
        _sum: { amount: true },
      }),

      // 이번 달 청구서 수
      this.prisma.invoice.count({
        where: {
          hospitalId,
          issueDate: {
            gte: monthStart,
            lt: monthEnd,
          },
        },
      }),

      // 미수금 합계
      this.prisma.invoice.aggregate({
        where: {
          hospitalId,
          status: { in: ['PENDING', 'PARTIAL'] },
        },
        _sum: { totalAmount: true, paidAmount: true },
      }),

      // 재고 부족 제품
      this.prisma.inventoryStock.count({
        where: {
          product: { hospitalId },
          quantity: { lte: 0 },
        },
      }).then(async (count) => {
        // 또는 재발주 기준 이하인 제품
        const lowStock = await this.prisma.product.count({
          where: {
            hospitalId,
            inventoryStocks: {
              some: {
                quantity: {
                  lte: 10, // 기본값
                },
              },
            },
          },
        });
        return lowStock || count;
      }),

      // 유통기한 임박 제품 (30일 이내)
      this.prisma.inventoryStock.count({
        where: {
          product: { hospitalId },
          expirationDate: {
            lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            gte: today,
          },
        },
      }),

      // 최근 진료 기록 (5개)
      this.prisma.medicalRecord.findMany({
        where: { hospitalId },
        include: {
          animal: {
            select: { id: true, name: true, species: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),

      // 오늘 예약 목록
      this.prisma.appointment.findMany({
        where: {
          hospitalId,
          appointmentDate: {
            gte: today,
            lt: tomorrow,
          },
          status: { not: 'CANCELLED' },
        },
        include: {
          animal: {
            select: { id: true, name: true, species: true },
          },
          vet: {
            select: { id: true, name: true },
          },
        },
        orderBy: { startTime: 'asc' },
        take: 10,
      }),
    ]);

    const pendingAmount = (pendingPayments._sum.totalAmount || 0) - (pendingPayments._sum.paidAmount || 0);

    return {
      // 기본 통계
      summary: {
        totalAnimals,
        totalRecords,
        todayAppointments,
        weeklyAppointments,
      },

      // 예약 통계
      appointments: {
        today: {
          total: todayAppointments,
          confirmed: confirmedAppointments,
          completed: completedAppointments,
          cancelled: cancelledAppointments,
        },
        thisWeek: weeklyAppointments,
      },

      // 매출 통계
      revenue: {
        thisMonth: monthlyRevenue._sum.amount || 0,
        monthlyInvoices,
        pendingAmount: Math.max(0, pendingAmount),
      },

      // 재고 알림
      inventory: {
        lowStockCount: lowStockProducts,
        expiringSoonCount: expiringSoonProducts,
      },

      // 최근 데이터
      recentRecords: recentRecords.map(record => ({
        id: record.id,
        animalName: record.animal?.name || '알 수 없음',
        animalSpecies: record.animal?.species || '',
        chiefComplaint: record.chiefComplaint,
        visitDate: record.visitDate,
        createdAt: record.createdAt,
      })),

      todayAppointments: todayAppointmentsList.map(apt => ({
        id: apt.id,
        animalName: apt.animal?.name || '알 수 없음',
        animalSpecies: apt.animal?.species || '',
        vetName: apt.vet?.name || '미배정',
        startTime: apt.startTime,
        endTime: apt.endTime,
        type: apt.type,
        status: apt.status,
        reason: apt.reason,
      })),
    };
  }

  // 주간 예약 트렌드
  async getWeeklyAppointmentTrend(hospitalId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const days: Date[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      days.push(date);
    }

    const trends = await Promise.all(
      days.map(async (date) => {
        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);

        const count = await this.prisma.appointment.count({
          where: {
            hospitalId,
            appointmentDate: {
              gte: date,
              lt: nextDate,
            },
            status: { not: 'CANCELLED' },
          },
        });

        return {
          date: date.toISOString().split('T')[0],
          dayOfWeek: ['일', '월', '화', '수', '목', '금', '토'][date.getDay()],
          count,
        };
      })
    );

    return trends;
  }

  // 월간 매출 트렌드
  async getMonthlyRevenueTrend(hospitalId: string, months: number = 6) {
    const trends: { month: string; monthName: string; revenue: number }[] = [];
    const today = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const start = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const end = new Date(today.getFullYear(), today.getMonth() - i + 1, 1);

      const revenue = await this.prisma.payment.aggregate({
        where: {
          invoice: { hospitalId },
          paidAt: {
            gte: start,
            lt: end,
          },
          status: 'COMPLETED',
        },
        _sum: { amount: true },
      });

      trends.push({
        month: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`,
        monthName: `${start.getMonth() + 1}월`,
        revenue: revenue._sum.amount || 0,
      });
    }

    return trends;
  }

  // 종별 환자 분포
  async getSpeciesDistribution(hospitalId: string) {
    const distribution = await this.prisma.animal.groupBy({
      by: ['species'],
      where: {
        guardians: {
          some: {
            guardian: {
              hospitalStaff: {
                some: { hospitalId },
              },
            },
          },
        },
      },
      _count: { species: true },
    });

    const speciesNames: Record<string, string> = {
      DOG: '강아지',
      CAT: '고양이',
      BIRD: '조류',
      RABBIT: '토끼',
      HAMSTER: '햄스터',
      REPTILE: '파충류',
      OTHER: '기타',
    };

    return distribution.map(item => ({
      species: item.species,
      name: speciesNames[item.species] || item.species,
      count: item._count?.species ?? 0,
    }));
  }
}
