import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  // 통합 대시보드 통계 - 최적화 버전
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

    // 🚀 모든 독립 쿼리를 단일 Promise.all로 병렬 실행
    const [
      // 기본 카운트
      totalAnimals,
      totalRecords,
      // 예약 통계 (groupBy로 한 번에)
      todayAppointmentStats,
      weeklyAppointments,
      // 매출 관련
      monthlyRevenue,
      monthlyInvoices,
      pendingPayments,
      // 재고 관련
      zeroStockCount,
      lowStockCount,
      expiringSoonProducts,
      // 리스트 데이터
      recentRecords,
      todayAppointmentsList,
    ] = await Promise.all([
      // 1. 등록된 동물 수 - 단순화된 쿼리
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

      // 2. 진료 기록 수
      this.prisma.medicalRecord.count({
        where: { hospitalId },
      }),

      // 3. 오늘 예약 상태별 카운트 (groupBy로 한 번에!)
      this.prisma.appointment.groupBy({
        by: ['status'],
        where: {
          hospitalId,
          appointmentDate: {
            gte: today,
            lt: tomorrow,
          },
        },
        _count: { status: true },
      }),

      // 4. 이번 주 예약 수
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

      // 5. 이번 달 매출 합계
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

      // 6. 이번 달 청구서 수
      this.prisma.invoice.count({
        where: {
          hospitalId,
          issueDate: {
            gte: monthStart,
            lt: monthEnd,
          },
        },
      }),

      // 7. 미수금 합계
      this.prisma.invoice.aggregate({
        where: {
          hospitalId,
          status: { in: ['PENDING', 'PARTIAL'] },
        },
        _sum: { totalAmount: true, paidAmount: true },
      }),

      // 8. 재고 0인 제품
      this.prisma.inventoryStock.count({
        where: {
          product: { hospitalId },
          quantity: { lte: 0 },
        },
      }),

      // 9. 재고 부족 제품 (10개 이하)
      this.prisma.inventoryStock.count({
        where: {
          product: { hospitalId },
          quantity: { gt: 0, lte: 10 },
        },
      }),

      // 10. 유통기한 임박 제품 (30일 이내)
      this.prisma.inventoryStock.count({
        where: {
          product: { hospitalId },
          expirationDate: {
            lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            gte: today,
          },
        },
      }),

      // 11. 최근 진료 기록 (5개) - select 최소화
      this.prisma.medicalRecord.findMany({
        where: { hospitalId },
        select: {
          id: true,
          chiefComplaint: true,
          visitDate: true,
          createdAt: true,
          animal: {
            select: { name: true, species: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),

      // 12. 오늘 예약 목록 - select 최소화
      this.prisma.appointment.findMany({
        where: {
          hospitalId,
          appointmentDate: {
            gte: today,
            lt: tomorrow,
          },
          status: { not: 'CANCELLED' },
        },
        select: {
          id: true,
          startTime: true,
          endTime: true,
          type: true,
          status: true,
          reason: true,
          animal: {
            select: { name: true, species: true },
          },
          vet: {
            select: { name: true },
          },
        },
        orderBy: { startTime: 'asc' },
        take: 10,
      }),
    ]);

    // 오늘 예약 상태별 카운트 파싱
    const appointmentCounts = {
      total: 0,
      confirmed: 0,
      completed: 0,
      cancelled: 0,
    };

    todayAppointmentStats.forEach((stat) => {
      const count = stat._count.status;
      appointmentCounts.total += count;
      if (stat.status === 'CONFIRMED') appointmentCounts.confirmed = count;
      else if (stat.status === 'COMPLETED') appointmentCounts.completed = count;
      else if (stat.status === 'CANCELLED') appointmentCounts.cancelled = count;
    });

    const pendingAmount = (pendingPayments._sum.totalAmount || 0) - (pendingPayments._sum.paidAmount || 0);
    const lowStockProducts = lowStockCount + zeroStockCount;

    return {
      summary: {
        totalAnimals,
        totalRecords,
        todayAppointments: appointmentCounts.total,
        weeklyAppointments,
      },
      appointments: {
        today: appointmentCounts,
        thisWeek: weeklyAppointments,
      },
      revenue: {
        thisMonth: monthlyRevenue._sum.amount || 0,
        monthlyInvoices,
        pendingAmount: Math.max(0, pendingAmount),
      },
      inventory: {
        lowStockCount: lowStockProducts,
        expiringSoonCount: expiringSoonProducts,
      },
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

  // 주간 예약 트렌드 - 최적화: groupBy 사용
  async getWeeklyAppointmentTrend(hospitalId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 6);

    // 단일 쿼리로 7일 데이터 가져오기
    const appointments = await this.prisma.appointment.findMany({
      where: {
        hospitalId,
        appointmentDate: {
          gte: weekAgo,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        },
        status: { not: 'CANCELLED' },
      },
      select: {
        appointmentDate: true,
      },
    });

    // 날짜별로 그룹핑
    const countByDate = new Map<string, number>();
    appointments.forEach(apt => {
      const dateStr = apt.appointmentDate.toISOString().split('T')[0] as string;
      countByDate.set(dateStr, (countByDate.get(dateStr) || 0) + 1);
    });

    // 7일간의 트렌드 생성
    const trends: { date: string; dayOfWeek: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0] as string;
      const dayOfWeekArr = ['일', '월', '화', '수', '목', '금', '토'];

      trends.push({
        date: dateStr,
        dayOfWeek: dayOfWeekArr[date.getDay()] as string,
        count: countByDate.get(dateStr) || 0,
      });
    }

    return trends;
  }

  // 월간 매출 트렌드 - 최적화: 단일 쿼리
  async getMonthlyRevenueTrend(hospitalId: string, months: number = 6) {
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth() - months + 1, 1);

    // 단일 쿼리로 모든 결제 데이터 가져오기
    const payments = await this.prisma.payment.findMany({
      where: {
        invoice: { hospitalId },
        paidAt: {
          gte: startDate,
        },
        status: 'COMPLETED',
      },
      select: {
        amount: true,
        paidAt: true,
      },
    });

    // 월별로 그룹핑
    const revenueByMonth = new Map<string, number>();
    payments.forEach(payment => {
      if (payment.paidAt) {
        const monthKey = `${payment.paidAt.getFullYear()}-${String(payment.paidAt.getMonth() + 1).padStart(2, '0')}`;
        revenueByMonth.set(monthKey, (revenueByMonth.get(monthKey) || 0) + (payment.amount || 0));
      }
    });

    // 트렌드 생성
    const trends: { month: string; monthName: string; revenue: number }[] = [];
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      trends.push({
        month: monthKey,
        monthName: `${date.getMonth() + 1}월`,
        revenue: revenueByMonth.get(monthKey) || 0,
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
