import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CreateMedicalRecordDto, UpdateMedicalRecordDto } from './dto/medical-record.dto';
import { VisitType, UserRole } from '@petmedi/database';

@Injectable()
export class MedicalRecordsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateMedicalRecordDto, vetId: string) {
    // 수의사가 해당 병원 소속인지 확인
    const staff = await this.prisma.hospitalStaff.findFirst({
      where: {
        hospitalId: dto.hospitalId,
        userId: vetId,
        isActive: true,
      },
    });

    if (!staff) {
      throw new ForbiddenException('해당 병원에서 진료 기록을 작성할 권한이 없습니다');
    }

    // 사용자가 VET 또는 HOSPITAL_ADMIN 역할인지 확인
    const user = await this.prisma.user.findUnique({
      where: { id: vetId },
      select: { role: true },
    });

    const allowedRoles = [UserRole.VET, UserRole.HOSPITAL_ADMIN, UserRole.SUPER_ADMIN] as string[];
    if (!user || !allowedRoles.includes(user.role)) {
      throw new ForbiddenException('수의사 또는 병원 관리자만 진료 기록을 작성할 수 있습니다');
    }

    // 동물 존재 확인
    const animal = await this.prisma.animal.findUnique({
      where: { id: dto.animalId },
    });

    if (!animal) {
      throw new NotFoundException('동물을 찾을 수 없습니다');
    }

    // 바이탈 사인 정보 추출
    const vitalSigns = dto.vitalSigns;

    // 진료 기록 생성
    const record = await this.prisma.medicalRecord.create({
      data: {
        animalId: dto.animalId,
        hospitalId: dto.hospitalId,
        vetId,
        visitDate: dto.visitDate ? new Date(dto.visitDate) : new Date(),
        visitType: VisitType.INITIAL,
        chiefComplaint: dto.chiefComplaint ?? null,
        subjective: dto.subjective ?? null,
        objective: dto.physicalExamination ?? null,
        assessment: dto.diagnosis ?? null,
        plan: dto.treatmentPlan ?? null,
        diagnosis: dto.diagnosis ?? null,
        weight: vitalSigns?.weight ?? null,
        temperature: vitalSigns?.temperature ?? null,
        heartRate: vitalSigns?.heartRate ?? null,
        respiratoryRate: vitalSigns?.respiratoryRate ?? null,
      },
      include: {
        animal: {
          select: { id: true, code: true, name: true, species: true },
        },
        hospital: {
          select: { id: true, name: true },
        },
        vet: {
          select: { id: true, name: true },
        },
      },
    });

    // 처방전 생성
    if (dto.prescriptions && dto.prescriptions.length > 0) {
      await this.prisma.prescription.createMany({
        data: dto.prescriptions.map((p) => ({
          medicalRecordId: record.id,
          medicineName: p.medicationName,
          dosage: p.dosage,
          frequency: p.frequency,
          duration: String(p.duration) + '일',
          instructions: p.instructions ?? null,
        })),
      });
    }

    // 검사 결과 생성
    if (dto.labResults && dto.labResults.length > 0) {
      await this.prisma.labResult.createMany({
        data: dto.labResults.map((l) => ({
          medicalRecordId: record.id,
          testName: l.testName,
          testType: l.testItem ?? null,
          result: l.resultValue,
          referenceRange: l.referenceRange ?? null,
          unit: l.unit ?? null,
          isAbnormal: l.isAbnormal ?? false,
          testedAt: new Date(),
        })),
      });
    }

    return this.findById(record.id);
  }

  async findById(id: string) {
    const record = await this.prisma.medicalRecord.findUnique({
      where: { id },
      include: {
        animal: {
          select: {
            id: true,
            code: true,
            name: true,
            species: true,
            breed: true,
            birthDate: true,
            gender: true,
          },
        },
        hospital: {
          select: { id: true, name: true, phone: true, address: true },
        },
        vet: {
          select: { id: true, name: true },
        },
        prescriptions: true,
        labResults: true,
        attachments: true,
      },
    });

    if (!record) {
      throw new NotFoundException('진료 기록을 찾을 수 없습니다');
    }

    // 바이탈 사인 정보를 객체로 조합
    const vitalSigns = {
      weight: record.weight,
      temperature: record.temperature,
      heartRate: record.heartRate,
      respiratoryRate: record.respiratoryRate,
    };

    return {
      ...record,
      vitalSigns,
    };
  }

  async findByAnimal(animalId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [records, total] = await Promise.all([
      this.prisma.medicalRecord.findMany({
        where: { animalId },
        skip,
        take: limit,
        orderBy: { visitDate: 'desc' },
        include: {
          hospital: {
            select: { id: true, name: true },
          },
          vet: {
            select: { id: true, name: true },
          },
          prescriptions: true,
        },
      }),
      this.prisma.medicalRecord.count({ where: { animalId } }),
    ]);

    return {
      data: records.map((r) => ({
        ...r,
        vitalSigns: {
          weight: r.weight,
          temperature: r.temperature,
          heartRate: r.heartRate,
          respiratoryRate: r.respiratoryRate,
        },
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findByHospital(hospitalId: string, page = 1, limit = 20, date?: string) {
    const skip = (page - 1) * limit;

    const whereClause: Record<string, unknown> = { hospitalId };

    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      whereClause.visitDate = {
        gte: startDate,
        lt: endDate,
      };
    }

    const [records, total] = await Promise.all([
      this.prisma.medicalRecord.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { visitDate: 'desc' },
        include: {
          animal: {
            select: { id: true, code: true, name: true, species: true },
          },
          vet: {
            select: { id: true, name: true },
          },
        },
      }),
      this.prisma.medicalRecord.count({ where: whereClause }),
    ]);

    return {
      data: records,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async update(id: string, dto: UpdateMedicalRecordDto, vetId: string) {
    const record = await this.prisma.medicalRecord.findUnique({
      where: { id },
      include: { hospital: true },
    });

    if (!record) {
      throw new NotFoundException('진료 기록을 찾을 수 없습니다');
    }

    // 작성자 또는 같은 병원 수의사만 수정 가능
    const staff = await this.prisma.hospitalStaff.findFirst({
      where: {
        hospitalId: record.hospitalId,
        userId: vetId,
        isActive: true,
      },
    });

    if (!staff) {
      throw new ForbiddenException('진료 기록을 수정할 권한이 없습니다');
    }

    const updateData: Record<string, unknown> = {};

    if (dto.subjective !== undefined) updateData.subjective = dto.subjective ?? null;
    if (dto.physicalExamination !== undefined) updateData.objective = dto.physicalExamination ?? null;
    if (dto.diagnosis !== undefined) {
      updateData.assessment = dto.diagnosis ?? null;
      updateData.diagnosis = dto.diagnosis ?? null;
    }
    if (dto.treatmentPlan !== undefined) updateData.plan = dto.treatmentPlan ?? null;

    // 바이탈 사인 업데이트
    if (dto.vitalSigns) {
      if (dto.vitalSigns.weight !== undefined) updateData.weight = dto.vitalSigns.weight ?? null;
      if (dto.vitalSigns.temperature !== undefined) updateData.temperature = dto.vitalSigns.temperature ?? null;
      if (dto.vitalSigns.heartRate !== undefined) updateData.heartRate = dto.vitalSigns.heartRate ?? null;
      if (dto.vitalSigns.respiratoryRate !== undefined) updateData.respiratoryRate = dto.vitalSigns.respiratoryRate ?? null;
    }

    return this.prisma.medicalRecord.update({
      where: { id },
      data: updateData,
    });
  }

  async delete(id: string, vetId: string) {
    const record = await this.prisma.medicalRecord.findUnique({
      where: { id },
    });

    if (!record) {
      throw new NotFoundException('진료 기록을 찾을 수 없습니다');
    }

    // 작성자만 삭제 가능
    if (record.vetId !== vetId) {
      throw new ForbiddenException('진료 기록을 삭제할 권한이 없습니다');
    }

    // 소프트 삭제 대신 하드 삭제 (진료 기록은 보관이 필요할 수 있어 주의)
    await this.prisma.medicalRecord.delete({
      where: { id },
    });

    return { message: '진료 기록이 삭제되었습니다' };
  }

  // SUPER_ADMIN은 전체, 그 외는 공유된 진료 기록 조회
  async findSharedOrAll(
    user: { id: string; role: string },
    code?: string,
    hospitalId?: string,
    page = 1,
    limit = 20,
  ) {
    const skip = (page - 1) * limit;

    // SUPER_ADMIN은 전체 진료 기록 조회 가능
    if (user.role === 'SUPER_ADMIN') {
      const [records, total] = await Promise.all([
        this.prisma.medicalRecord.findMany({
          skip,
          take: limit,
          orderBy: { visitDate: 'desc' },
          include: {
            animal: {
              select: { id: true, code: true, name: true, species: true },
            },
            hospital: {
              select: { id: true, name: true },
            },
            vet: {
              select: { id: true, name: true },
            },
          },
        }),
        this.prisma.medicalRecord.count(),
      ]);

      return {
        data: records.map((r) => ({
          ...r,
          vitalSigns: {
            weight: r.weight,
            temperature: r.temperature,
            heartRate: r.heartRate,
            respiratoryRate: r.respiratoryRate,
          },
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    }

    // 그 외는 코드와 hospitalId 필수
    if (!code || !hospitalId) {
      return { data: [], pagination: { page, limit, total: 0, totalPages: 0 } };
    }

    const records = await this.findSharedRecords(code, hospitalId);
    return {
      data: records,
      pagination: {
        page: 1,
        limit: records.length,
        total: records.length,
        totalPages: 1,
      },
    };
  }

  // 공유된 진료 기록 조회 (네트워크 병원용)
  async findSharedRecords(animalCode: string, _hospitalId: string) {
    const animal = await this.prisma.animal.findUnique({
      where: { code: animalCode },
      include: {
        shareConsents: {
          where: {
            isActive: true,
          },
        },
      },
    });

    if (!animal) {
      throw new NotFoundException('동물을 찾을 수 없습니다');
    }

    // 공유 동의 확인
    if (animal.shareConsents.length === 0) {
      throw new ForbiddenException('진료 기록 공유 동의가 없습니다');
    }

    // 공유 동의 범위에 따라 진료 기록 조회
    const records = await this.prisma.medicalRecord.findMany({
      where: { animalId: animal.id },
      orderBy: { visitDate: 'desc' },
      include: {
        hospital: {
          select: { id: true, name: true },
        },
        vet: {
          select: { name: true },
        },
        prescriptions: true,
        labResults: true,
      },
    });

    return records.map((r) => ({
      ...r,
      vitalSigns: {
        weight: r.weight,
        temperature: r.temperature,
        heartRate: r.heartRate,
        respiratoryRate: r.respiratoryRate,
      },
    }));
  }
}
