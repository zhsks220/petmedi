import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../common/prisma.service';
import { UpdateUserDto, ChangePasswordDto, AdminUpdateUserDto } from './dto/user.dto';
import { UserRole } from '@petmedi/database';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count(),
    ]);

    return {
      data: users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        guardianAnimals: {
          where: { endDate: null },
          select: {
            isPrimary: true,
            relation: true,
            animal: {
              select: {
                id: true,
                code: true,
                name: true,
                species: true,
                breed: true,
                photoUrl: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다');
    }

    return user;
  }

  async update(id: string, dto: UpdateUserDto, currentUserId: string) {
    // 본인만 수정 가능
    if (id !== currentUserId) {
      throw new ForbiddenException('본인의 정보만 수정할 수 있습니다');
    }

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다');
    }

    const updateData: { name?: string; phone?: string | null } = {};
    if (dto.name) updateData.name = dto.name;
    if (dto.phone !== undefined) updateData.phone = dto.phone ?? null;

    return this.prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  async changePassword(id: string, dto: ChangePasswordDto, currentUserId: string) {
    if (id !== currentUserId) {
      throw new ForbiddenException('본인의 비밀번호만 변경할 수 있습니다');
    }

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다');
    }

    const isPasswordValid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      throw new BadRequestException('현재 비밀번호가 올바르지 않습니다');
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 12);

    await this.prisma.user.update({
      where: { id },
      data: { passwordHash: hashedPassword },
    });

    return { message: '비밀번호가 변경되었습니다' };
  }

  // Admin only
  async adminUpdate(id: string, dto: AdminUpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다');
    }

    const updateData: { name?: string; phone?: string | null; role?: UserRole; isActive?: boolean } = {};
    if (dto.name) updateData.name = dto.name;
    if (dto.phone !== undefined) updateData.phone = dto.phone ?? null;
    if (dto.role) updateData.role = dto.role as UserRole;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    return this.prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  async delete(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다');
    }

    // 소프트 삭제 (비활성화)
    await this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    return { message: '사용자가 비활성화되었습니다' };
  }
}
