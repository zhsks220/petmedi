import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CreateHospitalDto, UpdateHospitalDto, AddStaffDto, UpdateStaffDto } from './dto/hospital.dto';
import { HospitalStatus, UserRole, Prisma } from '@petmedi/database';

@Injectable()
export class HospitalsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateHospitalDto, ownerId: string) {
    // 사업자등록번호 중복 확인
    const existing = await this.prisma.hospital.findUnique({
      where: { businessNumber: dto.businessNumber },
    });

    if (existing) {
      throw new ConflictException('이미 등록된 사업자등록번호입니다');
    }

    // 병원 생성 및 소유자를 HOSPITAL_ADMIN으로 등록
    const hospital = await this.prisma.hospital.create({
      data: {
        name: dto.name,
        businessNumber: dto.businessNumber,
        licenseNumber: dto.licenseNumber ?? null,
        address: dto.address,
        addressDetail: dto.addressDetail ?? null,
        zipCode: dto.zipCode ?? null,
        phone: dto.phone,
        email: dto.email ?? null,
        website: dto.website ?? null,
        description: dto.description ?? null,
        operatingHours: dto.operatingHours ? dto.operatingHours : Prisma.JsonNull,
        status: HospitalStatus.PENDING,
        staff: {
          create: {
            userId: ownerId,
            position: 'OWNER',
            isActive: true,
          },
        },
      },
      include: {
        staff: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    // 소유자의 role을 HOSPITAL_ADMIN으로 변경
    await this.prisma.user.update({
      where: { id: ownerId },
      data: { role: UserRole.HOSPITAL_ADMIN },
    });

    return hospital;
  }

  async findAll(page = 1, limit = 20, isNetworkOnly = false) {
    const skip = (page - 1) * limit;

    const where = isNetworkOnly
      ? { isNetworkMember: true, status: HospitalStatus.ACTIVE }
      : { status: HospitalStatus.ACTIVE };

    const [hospitals, total] = await Promise.all([
      this.prisma.hospital.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          businessNumber: true,
          phone: true,
          email: true,
          address: true,
          addressDetail: true,
          description: true,
          status: true,
          isNetworkMember: true,
          operatingHours: true,
          createdAt: true,
          _count: { select: { staff: true, animals: true } },
        },
        orderBy: { name: 'asc' },
      }),
      this.prisma.hospital.count({ where }),
    ]);

    return {
      data: hospitals,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string) {
    const hospital = await this.prisma.hospital.findUnique({
      where: { id },
      include: {
        staff: {
          where: { isActive: true },
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        departments: {
          where: { isActive: true },
        },
      },
    });

    if (!hospital) {
      throw new NotFoundException('병원을 찾을 수 없습니다');
    }

    return hospital;
  }

  async update(id: string, dto: UpdateHospitalDto, userId: string) {
    const hospital = await this.findById(id);

    // 권한 확인: OWNER 또는 MANAGER만 수정 가능
    const staff = hospital.staff.find((s) => s.userId === userId);
    if (!staff || !['OWNER', 'MANAGER'].includes(staff.position || '')) {
      throw new ForbiddenException('병원 정보를 수정할 권한이 없습니다');
    }

    const updateData: Record<string, unknown> = {};
    if (dto.name) updateData.name = dto.name;
    if (dto.address) updateData.address = dto.address;
    if (dto.addressDetail !== undefined) updateData.addressDetail = dto.addressDetail ?? null;
    if (dto.zipCode !== undefined) updateData.zipCode = dto.zipCode ?? null;
    if (dto.phone) updateData.phone = dto.phone;
    if (dto.email !== undefined) updateData.email = dto.email ?? null;
    if (dto.website !== undefined) updateData.website = dto.website ?? null;
    if (dto.description !== undefined) updateData.description = dto.description ?? null;
    if (dto.operatingHours !== undefined) updateData.operatingHours = dto.operatingHours ? dto.operatingHours : Prisma.JsonNull;

    return this.prisma.hospital.update({
      where: { id },
      data: updateData,
    });
  }

  async delete(id: string, userId: string) {
    const hospital = await this.findById(id);

    // OWNER만 삭제 가능
    const staff = hospital.staff.find((s) => s.userId === userId);
    if (!staff || staff.position !== 'OWNER') {
      throw new ForbiddenException('병원을 삭제할 권한이 없습니다');
    }

    // 소프트 삭제 (status를 INACTIVE로 변경)
    await this.prisma.hospital.update({
      where: { id },
      data: { status: HospitalStatus.INACTIVE },
    });

    return { message: '병원이 비활성화되었습니다' };
  }

  // Staff management
  async addStaff(hospitalId: string, dto: AddStaffDto, currentUserId: string) {
    const hospital = await this.findById(hospitalId);

    // 권한 확인
    const currentStaff = hospital.staff.find((s) => s.userId === currentUserId);
    if (!currentStaff || !['OWNER', 'MANAGER'].includes(currentStaff.position || '')) {
      throw new ForbiddenException('직원을 추가할 권한이 없습니다');
    }

    // 이미 등록된 직원인지 확인
    const existingStaff = hospital.staff.find((s) => s.userId === dto.userId);
    if (existingStaff) {
      throw new ConflictException('이미 등록된 직원입니다');
    }

    return this.prisma.hospitalStaff.create({
      data: {
        hospitalId,
        userId: dto.userId,
        position: dto.position ?? null,
        licenseNo: dto.licenseNumber ?? null,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async updateStaff(hospitalId: string, staffId: string, dto: UpdateStaffDto, currentUserId: string) {
    const hospital = await this.findById(hospitalId);

    // 권한 확인
    const currentStaff = hospital.staff.find((s) => s.userId === currentUserId);
    if (!currentStaff || !['OWNER', 'MANAGER'].includes(currentStaff.position || '')) {
      throw new ForbiddenException('직원 정보를 수정할 권한이 없습니다');
    }

    const targetStaff = await this.prisma.hospitalStaff.findUnique({
      where: { id: staffId },
    });

    if (!targetStaff || targetStaff.hospitalId !== hospitalId) {
      throw new NotFoundException('직원을 찾을 수 없습니다');
    }

    // OWNER는 변경 불가
    if (targetStaff.position === 'OWNER' && dto.position && dto.position !== 'OWNER') {
      throw new ForbiddenException('소유자 역할은 변경할 수 없습니다');
    }

    const updateData: Record<string, unknown> = {};
    if (dto.position !== undefined) updateData.position = dto.position ?? null;
    if (dto.licenseNumber !== undefined) updateData.licenseNo = dto.licenseNumber ?? null;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    return this.prisma.hospitalStaff.update({
      where: { id: staffId },
      data: updateData,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async removeStaff(hospitalId: string, staffId: string, currentUserId: string) {
    const hospital = await this.findById(hospitalId);

    // 권한 확인
    const currentStaff = hospital.staff.find((s) => s.userId === currentUserId);
    if (!currentStaff || !['OWNER', 'MANAGER'].includes(currentStaff.position || '')) {
      throw new ForbiddenException('직원을 삭제할 권한이 없습니다');
    }

    const targetStaff = await this.prisma.hospitalStaff.findUnique({
      where: { id: staffId },
    });

    if (!targetStaff || targetStaff.hospitalId !== hospitalId) {
      throw new NotFoundException('직원을 찾을 수 없습니다');
    }

    // OWNER는 삭제 불가
    if (targetStaff.position === 'OWNER') {
      throw new ForbiddenException('소유자는 삭제할 수 없습니다');
    }

    await this.prisma.hospitalStaff.update({
      where: { id: staffId },
      data: { isActive: false },
    });

    return { message: '직원이 비활성화되었습니다' };
  }

  // 내 병원 목록
  async getMyHospitals(userId: string) {
    const staffRecords = await this.prisma.hospitalStaff.findMany({
      where: { userId, isActive: true },
      include: {
        hospital: {
          select: {
            id: true,
            name: true,
            phone: true,
            address: true,
            isNetworkMember: true,
          },
        },
      },
    });

    return staffRecords.map((s) => ({
      ...s.hospital,
      myPosition: s.position,
    }));
  }
}
