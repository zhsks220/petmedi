import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import {
  CreateAppointmentDto,
  UpdateAppointmentDto,
  UpdateStatusDto,
  AppointmentQueryDto,
  AvailableSlotsQueryDto,
  CreateTimeSlotDto,
  UpdateTimeSlotDto,
  CreateHolidayDto,
  AppointmentStatus,
} from './dto/appointment.dto';

@Injectable()
export class AppointmentsService {
  constructor(private readonly prisma: PrismaService) {}

  // ===========================
  // 예약 CRUD
  // ===========================

  async create(dto: CreateAppointmentDto, guardianId: string) {
    // 동물이 보호자 소유인지 확인
    const guardianAnimal = await this.prisma.guardianAnimal.findUnique({
      where: {
        guardianId_animalId: {
          guardianId,
          animalId: dto.animalId,
        },
      },
    });

    if (!guardianAnimal) {
      throw new ForbiddenException('해당 동물의 보호자가 아닙니다');
    }

    // 병원 존재 확인
    const hospital = await this.prisma.hospital.findUnique({
      where: { id: dto.hospitalId },
    });

    if (!hospital) {
      throw new NotFoundException('병원을 찾을 수 없습니다');
    }

    // 해당 시간 예약 가능 여부 확인
    const isAvailable = await this.checkSlotAvailability(
      dto.hospitalId,
      dto.appointmentDate,
      dto.startTime,
    );

    if (!isAvailable) {
      throw new BadRequestException('해당 시간은 예약이 불가능합니다');
    }

    // 예약 생성
    const appointment = await this.prisma.appointment.create({
      data: {
        hospitalId: dto.hospitalId,
        animalId: dto.animalId,
        guardianId,
        vetId: dto.vetId,
        appointmentDate: new Date(dto.appointmentDate),
        startTime: dto.startTime,
        endTime: dto.endTime,
        duration: dto.duration || 30,
        type: dto.type || 'CONSULTATION',
        status: 'SCHEDULED',
        reason: dto.reason,
        symptoms: dto.symptoms,
        notes: dto.notes,
      },
      include: {
        hospital: { select: { id: true, name: true, phone: true } },
        animal: { select: { id: true, code: true, name: true, species: true } },
        guardian: { select: { id: true, name: true, phone: true } },
        vet: { select: { id: true, name: true } },
      },
    });

    return appointment;
  }

  async findAll(query: AppointmentQueryDto, userId: string, userRole: string) {
    const {
      hospitalId,
      animalId,
      guardianId,
      vetId,
      status,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = query;

    const skip = (page - 1) * limit;

    // 권한에 따른 필터링
    const where: any = {};

    if (userRole === 'GUARDIAN') {
      where.guardianId = userId;
    } else if (userRole === 'VET' || userRole === 'STAFF') {
      // 수의사/직원은 소속 병원의 예약만 조회
      const staffHospital = await this.prisma.hospitalStaff.findFirst({
        where: { userId, isActive: true },
      });
      if (staffHospital) {
        where.hospitalId = staffHospital.hospitalId;
      }
    } else if (userRole === 'HOSPITAL_ADMIN') {
      // 병원 관리자는 소속 병원의 예약만 조회
      const staffHospital = await this.prisma.hospitalStaff.findFirst({
        where: { userId, isActive: true },
      });
      if (staffHospital) {
        where.hospitalId = staffHospital.hospitalId;
      }
    }
    // SUPER_ADMIN은 모든 예약 조회 가능

    // 추가 필터
    if (hospitalId) where.hospitalId = hospitalId;
    if (animalId) where.animalId = animalId;
    if (guardianId) where.guardianId = guardianId;
    if (vetId) where.vetId = vetId;
    if (status) where.status = status;

    if (startDate || endDate) {
      where.appointmentDate = {};
      if (startDate) where.appointmentDate.gte = new Date(startDate);
      if (endDate) where.appointmentDate.lte = new Date(endDate);
    }

    const [appointments, total] = await Promise.all([
      this.prisma.appointment.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { appointmentDate: 'asc' },
          { startTime: 'asc' },
        ],
        include: {
          hospital: { select: { id: true, name: true, phone: true } },
          animal: { select: { id: true, code: true, name: true, species: true, photoUrl: true } },
          guardian: { select: { id: true, name: true, phone: true } },
          vet: { select: { id: true, name: true } },
        },
      }),
      this.prisma.appointment.count({ where }),
    ]);

    return {
      data: appointments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: {
        hospital: { select: { id: true, name: true, phone: true, address: true } },
        animal: {
          select: {
            id: true,
            code: true,
            name: true,
            species: true,
            breed: true,
            birthDate: true,
            photoUrl: true,
          },
        },
        guardian: { select: { id: true, name: true, phone: true, email: true } },
        vet: { select: { id: true, name: true } },
      },
    });

    if (!appointment) {
      throw new NotFoundException('예약을 찾을 수 없습니다');
    }

    return appointment;
  }

  async update(id: string, dto: UpdateAppointmentDto, userId: string, userRole: string) {
    const appointment = await this.findById(id);

    // 권한 확인
    if (userRole === 'GUARDIAN' && appointment.guardianId !== userId) {
      throw new ForbiddenException('본인의 예약만 수정할 수 있습니다');
    }

    // 완료/취소된 예약은 수정 불가
    if (['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(appointment.status)) {
      throw new BadRequestException('완료되거나 취소된 예약은 수정할 수 없습니다');
    }

    // 시간 변경 시 가용성 확인
    if (dto.appointmentDate || dto.startTime) {
      const newDate = (dto.appointmentDate ?? appointment.appointmentDate.toISOString().split('T')[0]) as string;
      const newTime = (dto.startTime ?? appointment.startTime) as string;

      const isAvailable = await this.checkSlotAvailability(
        appointment.hospitalId,
        newDate,
        newTime,
        id,
      );

      if (!isAvailable) {
        throw new BadRequestException('해당 시간은 예약이 불가능합니다');
      }
    }

    const updated = await this.prisma.appointment.update({
      where: { id },
      data: {
        ...(dto.hospitalId && { hospitalId: dto.hospitalId }),
        ...(dto.vetId && { vetId: dto.vetId }),
        ...(dto.appointmentDate && { appointmentDate: new Date(dto.appointmentDate) }),
        ...(dto.startTime && { startTime: dto.startTime }),
        ...(dto.endTime && { endTime: dto.endTime }),
        ...(dto.duration && { duration: dto.duration }),
        ...(dto.type && { type: dto.type }),
        ...(dto.status && { status: dto.status }),
        ...(dto.reason !== undefined && { reason: dto.reason }),
        ...(dto.symptoms !== undefined && { symptoms: dto.symptoms }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.cancelReason && { cancelReason: dto.cancelReason }),
      },
      include: {
        hospital: { select: { id: true, name: true } },
        animal: { select: { id: true, code: true, name: true } },
        guardian: { select: { id: true, name: true } },
        vet: { select: { id: true, name: true } },
      },
    });

    return updated;
  }

  async updateStatus(id: string, dto: UpdateStatusDto, userId: string, userRole: string) {
    const appointment = await this.findById(id);

    // 보호자는 취소만 가능
    if (userRole === 'GUARDIAN') {
      if (appointment.guardianId !== userId) {
        throw new ForbiddenException('본인의 예약만 수정할 수 있습니다');
      }
      if (dto.status !== 'CANCELLED') {
        throw new ForbiddenException('보호자는 예약 취소만 가능합니다');
      }
    }

    // 취소 시 취소 사유 필수
    if (dto.status === 'CANCELLED' && !dto.cancelReason) {
      throw new BadRequestException('취소 사유를 입력해주세요');
    }

    const updateData: any = { status: dto.status };

    switch (dto.status) {
      case 'CHECKED_IN':
        updateData.checkedInAt = new Date();
        break;
      case 'COMPLETED':
        updateData.completedAt = new Date();
        break;
      case 'CANCELLED':
        updateData.cancelledAt = new Date();
        updateData.cancelReason = dto.cancelReason;
        break;
    }

    const updated = await this.prisma.appointment.update({
      where: { id },
      data: updateData,
      include: {
        hospital: { select: { id: true, name: true } },
        animal: { select: { id: true, code: true, name: true } },
        guardian: { select: { id: true, name: true } },
        vet: { select: { id: true, name: true } },
      },
    });

    return updated;
  }

  async delete(id: string, userId: string, userRole: string) {
    const appointment = await this.findById(id);

    // 보호자는 본인 예약만 삭제 가능
    if (userRole === 'GUARDIAN' && appointment.guardianId !== userId) {
      throw new ForbiddenException('본인의 예약만 삭제할 수 있습니다');
    }

    await this.prisma.appointment.delete({ where: { id } });

    return { message: '예약이 삭제되었습니다' };
  }

  // ===========================
  // 예약 가능 시간 조회
  // ===========================

  async getAvailableSlots(query: AvailableSlotsQueryDto) {
    const { hospitalId, date } = query;
    const targetDate = new Date(date);
    const dayOfWeek = targetDate.getDay();

    // 휴무일 확인
    const holiday = await this.prisma.hospitalHoliday.findFirst({
      where: {
        hospitalId,
        OR: [
          { date: targetDate },
          {
            isRecurring: true,
            date: {
              // 매년 반복 휴일 체크 (월/일만 비교)
              gte: new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()),
              lt: new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + 1),
            },
          },
        ],
      },
    });

    if (holiday) {
      return {
        date,
        isHoliday: true,
        holidayReason: holiday.reason,
        slots: [],
      };
    }

    // 해당 요일의 타임슬롯 조회
    const timeSlots = await this.prisma.timeSlot.findMany({
      where: {
        hospitalId,
        dayOfWeek,
        isActive: true,
      },
      orderBy: { startTime: 'asc' },
    });

    if (timeSlots.length === 0) {
      return {
        date,
        isHoliday: false,
        message: '해당 요일은 예약을 받지 않습니다',
        slots: [],
      };
    }

    // 해당 날짜의 기존 예약 조회
    const existingAppointments = await this.prisma.appointment.findMany({
      where: {
        hospitalId,
        appointmentDate: targetDate,
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
      },
      select: { startTime: true },
    });

    const bookedTimes = existingAppointments.map((a) => a.startTime);

    // 슬롯 생성
    const slots: Array<{
      startTime: string;
      endTime: string;
      available: boolean;
      remainingSlots: number;
    }> = [];

    for (const timeSlot of timeSlots) {
      const slotMinutes = timeSlot.slotDuration;
      let currentTime = this.timeToMinutes(timeSlot.startTime);
      const endMinutes = this.timeToMinutes(timeSlot.endTime);

      while (currentTime + slotMinutes <= endMinutes) {
        const startTimeStr = this.minutesToTime(currentTime);
        const endTimeStr = this.minutesToTime(currentTime + slotMinutes);

        const bookedCount = bookedTimes.filter((t) => t === startTimeStr).length;
        const remainingSlots = timeSlot.maxAppointments - bookedCount;

        slots.push({
          startTime: startTimeStr,
          endTime: endTimeStr,
          available: remainingSlots > 0,
          remainingSlots: Math.max(0, remainingSlots),
        });

        currentTime += slotMinutes;
      }
    }

    return {
      date,
      isHoliday: false,
      slots,
    };
  }

  // ===========================
  // 타임슬롯 관리
  // ===========================

  async createTimeSlot(dto: CreateTimeSlotDto) {
    // 중복 확인
    const existing = await this.prisma.timeSlot.findUnique({
      where: {
        hospitalId_dayOfWeek_startTime: {
          hospitalId: dto.hospitalId,
          dayOfWeek: dto.dayOfWeek,
          startTime: dto.startTime,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('해당 시간대의 슬롯이 이미 존재합니다');
    }

    return this.prisma.timeSlot.create({
      data: {
        hospitalId: dto.hospitalId,
        dayOfWeek: dto.dayOfWeek,
        startTime: dto.startTime,
        endTime: dto.endTime,
        slotDuration: dto.slotDuration || 30,
        maxAppointments: dto.maxAppointments || 1,
      },
    });
  }

  async getTimeSlots(hospitalId: string) {
    return this.prisma.timeSlot.findMany({
      where: { hospitalId },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
  }

  async updateTimeSlot(id: string, dto: UpdateTimeSlotDto) {
    return this.prisma.timeSlot.update({
      where: { id },
      data: dto,
    });
  }

  async deleteTimeSlot(id: string) {
    await this.prisma.timeSlot.delete({ where: { id } });
    return { message: '타임슬롯이 삭제되었습니다' };
  }

  // ===========================
  // 휴무일 관리
  // ===========================

  async createHoliday(dto: CreateHolidayDto) {
    return this.prisma.hospitalHoliday.create({
      data: {
        hospitalId: dto.hospitalId,
        date: new Date(dto.date),
        reason: dto.reason,
        isRecurring: dto.isRecurring || false,
      },
    });
  }

  async getHolidays(hospitalId: string, year?: number) {
    const where: any = { hospitalId };

    if (year) {
      where.date = {
        gte: new Date(`${year}-01-01`),
        lt: new Date(`${year + 1}-01-01`),
      };
    }

    return this.prisma.hospitalHoliday.findMany({
      where,
      orderBy: { date: 'asc' },
    });
  }

  async deleteHoliday(id: string) {
    await this.prisma.hospitalHoliday.delete({ where: { id } });
    return { message: '휴무일이 삭제되었습니다' };
  }

  // ===========================
  // 통계
  // ===========================

  async getStats(hospitalId: string, startDate?: string, endDate?: string) {
    const where: any = { hospitalId };

    if (startDate || endDate) {
      where.appointmentDate = {};
      if (startDate) where.appointmentDate.gte = new Date(startDate);
      if (endDate) where.appointmentDate.lte = new Date(endDate);
    }

    const [total, byStatus, byType] = await Promise.all([
      this.prisma.appointment.count({ where }),
      this.prisma.appointment.groupBy({
        by: ['status'],
        where,
        _count: { status: true },
      }),
      this.prisma.appointment.groupBy({
        by: ['type'],
        where,
        _count: { type: true },
      }),
    ]);

    return {
      total,
      byStatus: byStatus.reduce((acc, item) => {
        acc[item.status] = item._count.status;
        return acc;
      }, {} as Record<string, number>),
      byType: byType.reduce((acc, item) => {
        acc[item.type] = item._count.type;
        return acc;
      }, {} as Record<string, number>),
    };
  }

  // ===========================
  // Helper Methods
  // ===========================

  private async checkSlotAvailability(
    hospitalId: string,
    date: string,
    time: string,
    excludeAppointmentId?: string,
  ): Promise<boolean> {
    const targetDate = new Date(date);
    const dayOfWeek = targetDate.getDay();

    // 타임슬롯 확인
    const timeSlot = await this.prisma.timeSlot.findFirst({
      where: {
        hospitalId,
        dayOfWeek,
        isActive: true,
        startTime: { lte: time },
        endTime: { gt: time },
      },
    });

    if (!timeSlot) {
      return false;
    }

    // 기존 예약 수 확인
    const existingCount = await this.prisma.appointment.count({
      where: {
        hospitalId,
        appointmentDate: targetDate,
        startTime: time,
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
        ...(excludeAppointmentId && { id: { not: excludeAppointmentId } }),
      },
    });

    return existingCount < timeSlot.maxAppointments;
  }

  private timeToMinutes(time: string): number {
    const parts = time.split(':').map(Number);
    const hours = parts[0] ?? 0;
    const minutes = parts[1] ?? 0;
    return hours * 60 + minutes;
  }

  private minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }
}
