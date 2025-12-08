import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../common/prisma.service';
import { RegisterDto, LoginDto, TokenResponseDto } from './dto/auth.dto';
import { JwtPayload } from './strategies/jwt.strategy';
import { UserRole } from '@petmedi/database';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<TokenResponseDto> {
    // 이메일 중복 확인
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('이미 등록된 이메일입니다');
    }

    // 비밀번호 해시
    const hashedPassword = await bcrypt.hash(dto.password, 12);

    // 사용자 생성
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash: hashedPassword,
        name: dto.name,
        phone: dto.phone ?? null,
        role: (dto.role as UserRole) || UserRole.GUARDIAN,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    // 토큰 생성
    const tokens = await this.generateTokens(user.id, user.email, user.role);

    return {
      ...tokens,
      user,
    };
  }

  async login(dto: LoginDto): Promise<TokenResponseDto> {
    // 사용자 조회
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        passwordHash: true,
        isActive: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('비활성화된 계정입니다');
    }

    // 비밀번호 확인
    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다');
    }

    // 토큰 생성
    const tokens = await this.generateTokens(user.id, user.email, user.role);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  async refreshToken(refreshToken: string): Promise<TokenResponseDto> {
    try {
      const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');
      if (!refreshSecret) {
        throw new Error('JWT_REFRESH_SECRET 환경변수가 설정되지 않았습니다');
      }
      const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: refreshSecret,
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
        },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('유효하지 않은 토큰입니다');
      }

      const tokens = await this.generateTokens(user.id, user.email, user.role);

      return {
        ...tokens,
        user,
      };
    } catch {
      throw new UnauthorizedException('유효하지 않은 토큰입니다');
    }
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
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

    if (!user) {
      throw new BadRequestException('사용자를 찾을 수 없습니다');
    }

    return user;
  }

  private async generateTokens(userId: string, email: string, role: UserRole) {
    const jwtSecret = this.configService.get<string>('JWT_SECRET');
    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');

    if (!jwtSecret || !refreshSecret) {
      throw new Error('JWT_SECRET 또는 JWT_REFRESH_SECRET 환경변수가 설정되지 않았습니다');
    }

    const payload: JwtPayload = {
      sub: userId,
      email,
      role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: jwtSecret,
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: refreshSecret,
        expiresIn: '7d',
      }),
    ]);

    return { accessToken, refreshToken };
  }
}
