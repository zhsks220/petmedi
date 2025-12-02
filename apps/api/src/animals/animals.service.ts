import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CreateAnimalDto, UpdateAnimalDto, AddGuardianDto } from './dto/animal.dto';
import { Species, Gender } from '@petmedi/database';

// 종별 코드 매핑
const SPECIES_CODES: Record<string, string> = {
  DOG: 'D',
  CAT: 'C',
  BIRD: 'B',
  RABBIT: 'R',
  HAMSTER: 'H',
  FISH: 'F',
  REPTILE: 'P',
  OTHER: 'X',
};

@Injectable()
export class AnimalsService {
  constructor(private prisma: PrismaService) {}

  /**
   * 동물 고유코드 생성
   * 형식: {종코드}-{생년월일}-{7자리순번}
   * 예: D-20200315-0000001
   */
  private async generateAnimalCode(species: string, birthDate?: Date): Promise<string> {
    const speciesCode = SPECIES_CODES[species] || 'X';
    const dateStr = birthDate
      ? birthDate.toISOString().slice(0, 10).replace(/-/g, '')
      : '00000000';

    // 해당 날짜의 현재 시퀀스 조회 또는 생성
    const sequence = await this.prisma.$transaction(async (tx) => {
      let seq = await tx.animalCodeSequence.findUnique({
        where: { date: dateStr },
      });

      if (!seq) {
        seq = await tx.animalCodeSequence.create({
          data: {
            date: dateStr,
            sequence: 1,
          },
        });
        return 1;
      }

      const updated = await tx.animalCodeSequence.update({
        where: { date: dateStr },
        data: { sequence: { increment: 1 } },
      });

      return updated.sequence;
    });

    const sequenceStr = sequence.toString().padStart(7, '0');
    return `${speciesCode}-${dateStr}-${sequenceStr}`;
  }

  async create(dto: CreateAnimalDto, guardianId: string) {
    const birthDate = dto.birthDate ? new Date(dto.birthDate) : null;

    // 고유코드 생성
    const code = await this.generateAnimalCode(dto.species, birthDate ?? undefined);

    // 동물 생성 및 보호자 연결
    const animal = await this.prisma.animal.create({
      data: {
        code,
        name: dto.name,
        species: dto.species as Species,
        breed: dto.breed ?? null,
        birthDate,
        gender: (dto.gender as Gender) ?? Gender.UNKNOWN,
        weight: dto.weight ?? null,
        color: dto.color ?? null,
        microchipId: dto.microchipId ?? null,
        isNeutered: dto.isNeutered ?? false,
        photoUrl: dto.profileImage ?? null,
        notes: dto.notes ?? null,
        guardians: {
          create: {
            guardianId,
            isPrimary: true,
            relation: dto.relationship ?? '보호자',
          },
        },
      },
      include: {
        guardians: {
          include: {
            guardian: {
              select: { id: true, name: true, email: true, phone: true },
            },
          },
        },
      },
    });

    return animal;
  }

  async findByCode(code: string) {
    const animal = await this.prisma.animal.findUnique({
      where: { code },
      include: {
        guardians: {
          where: { endDate: null },
          include: {
            guardian: {
              select: { id: true, name: true, phone: true },
            },
          },
        },
        medicalRecords: {
          take: 5,
          orderBy: { visitDate: 'desc' },
          select: {
            id: true,
            visitDate: true,
            chiefComplaint: true,
            diagnosis: true,
            hospital: {
              select: { id: true, name: true },
            },
          },
        },
        vaccinations: {
          take: 5,
          orderBy: { administeredAt: 'desc' },
        },
      },
    });

    if (!animal) {
      throw new NotFoundException('동물을 찾을 수 없습니다');
    }

    return animal;
  }

  async findById(id: string) {
    const animal = await this.prisma.animal.findUnique({
      where: { id },
      include: {
        guardians: {
          where: { endDate: null },
          include: {
            guardian: {
              select: { id: true, name: true, email: true, phone: true },
            },
          },
        },
      },
    });

    if (!animal) {
      throw new NotFoundException('동물을 찾을 수 없습니다');
    }

    return animal;
  }

  async findMyAnimals(userId: string) {
    const guardianAnimals = await this.prisma.guardianAnimal.findMany({
      where: { guardianId: userId, endDate: null },
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
            weight: true,
            photoUrl: true,
            isDeceased: true,
          },
        },
      },
    });

    return guardianAnimals.map((ga) => ({
      ...ga.animal,
      isPrimary: ga.isPrimary,
      relation: ga.relation,
    }));
  }

  async update(id: string, dto: UpdateAnimalDto, userId: string) {
    const animal = await this.findById(id);

    // 보호자인지 확인
    const isGuardian = animal.guardians.some((g) => g.guardianId === userId);
    if (!isGuardian) {
      throw new ForbiddenException('동물 정보를 수정할 권한이 없습니다');
    }

    const updateData: Record<string, unknown> = {};
    if (dto.name) updateData.name = dto.name;
    if (dto.breed !== undefined) updateData.breed = dto.breed ?? null;
    if (dto.birthDate) updateData.birthDate = new Date(dto.birthDate);
    if (dto.gender) updateData.gender = dto.gender as Gender;
    if (dto.weight !== undefined) updateData.weight = dto.weight ?? null;
    if (dto.color !== undefined) updateData.color = dto.color ?? null;
    if (dto.microchipId !== undefined) updateData.microchipId = dto.microchipId ?? null;
    if (dto.isNeutered !== undefined) updateData.isNeutered = dto.isNeutered;
    if (dto.profileImage !== undefined) updateData.photoUrl = dto.profileImage ?? null;
    if (dto.notes !== undefined) updateData.notes = dto.notes ?? null;

    return this.prisma.animal.update({
      where: { id },
      data: updateData,
    });
  }

  async delete(id: string, userId: string) {
    const animal = await this.findById(id);

    // 주 보호자인지 확인
    const isPrimary = animal.guardians.some((g) => g.guardianId === userId && g.isPrimary);
    if (!isPrimary) {
      throw new ForbiddenException('동물을 삭제할 권한이 없습니다');
    }

    // 소프트 삭제 (사망 처리)
    await this.prisma.animal.update({
      where: { id },
      data: { isDeceased: true, deceasedAt: new Date() },
    });

    return { message: '동물이 비활성화되었습니다' };
  }

  // 보호자 관리
  async addGuardian(animalId: string, dto: AddGuardianDto, currentUserId: string) {
    const animal = await this.findById(animalId);

    // 현재 사용자가 보호자인지 확인
    const isCurrentGuardian = animal.guardians.some((g) => g.guardianId === currentUserId);
    if (!isCurrentGuardian) {
      throw new ForbiddenException('보호자를 추가할 권한이 없습니다');
    }

    // 이미 보호자인지 확인
    const existingGuardian = animal.guardians.find((g) => g.guardianId === dto.userId);
    if (existingGuardian) {
      throw new BadRequestException('이미 등록된 보호자입니다');
    }

    return this.prisma.guardianAnimal.create({
      data: {
        animalId,
        guardianId: dto.userId,
        relation: dto.relationship ?? null,
        isPrimary: dto.isOwner ?? false,
      },
      include: {
        guardian: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async removeGuardian(animalId: string, guardianRecordId: string, currentUserId: string) {
    const animal = await this.findById(animalId);

    // 주 보호자만 다른 보호자 삭제 가능
    const isPrimary = animal.guardians.some((g) => g.guardianId === currentUserId && g.isPrimary);
    if (!isPrimary) {
      throw new ForbiddenException('보호자를 삭제할 권한이 없습니다');
    }

    const guardianRecord = await this.prisma.guardianAnimal.findUnique({
      where: { id: guardianRecordId },
    });

    if (!guardianRecord || guardianRecord.animalId !== animalId) {
      throw new NotFoundException('보호자를 찾을 수 없습니다');
    }

    // 주 보호자는 삭제 불가
    if (guardianRecord.isPrimary) {
      throw new ForbiddenException('주 보호자는 삭제할 수 없습니다');
    }

    await this.prisma.guardianAnimal.update({
      where: { id: guardianRecordId },
      data: { endDate: new Date() },
    });

    return { message: '보호자가 삭제되었습니다' };
  }

  // 동물 코드로 검색 (네트워크 병원용)
  async searchByCode(code: string, _hospitalId: string) {
    const animal = await this.prisma.animal.findUnique({
      where: { code },
      include: {
        guardians: {
          where: { endDate: null },
          select: {
            isPrimary: true,
            relation: true,
            guardian: {
              select: { id: true, name: true },
            },
          },
        },
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
    const hasConsent = animal.shareConsents.length > 0;

    return {
      ...animal,
      hasShareConsent: hasConsent,
      shareConsents: undefined,
    };
  }
}
