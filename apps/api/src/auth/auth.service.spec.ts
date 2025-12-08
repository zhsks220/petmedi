import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../common/prisma.service';
import { UserRole } from '@petmedi/database';

// bcrypt 모킹
jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: jest.Mocked<PrismaService>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;

  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    name: '테스트 사용자',
    role: UserRole.GUARDIAN,
    passwordHash: 'hashed-password',
    isActive: true,
    phone: '010-1234-5678',
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
              create: jest.fn(),
            },
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn(),
            verify: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'JWT_SECRET') return 'test-jwt-secret';
              if (key === 'JWT_REFRESH_SECRET') return 'test-refresh-secret';
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get(PrismaService);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    const registerDto = {
      email: 'newuser@example.com',
      password: 'password123',
      name: '새 사용자',
    };

    it('새로운 사용자를 성공적으로 등록해야 함', async () => {
      const createdUser = {
        id: 'new-user-id',
        email: registerDto.email,
        name: registerDto.name,
        role: UserRole.GUARDIAN,
      };

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.user.create as jest.Mock).mockResolvedValue(createdUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      (jwtService.signAsync as jest.Mock)
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      const result = await service.register(registerDto);

      expect(result).toHaveProperty('accessToken', 'access-token');
      expect(result).toHaveProperty('refreshToken', 'refresh-token');
      expect(result).toHaveProperty('user');
      expect(result.user.email).toBe(registerDto.email);
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: registerDto.email },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith(registerDto.password, 12);
    });

    it('이미 존재하는 이메일로 등록 시 ConflictException을 던져야 함', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
      expect(prismaService.user.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('올바른 자격 증명으로 로그인해야 함', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwtService.signAsync as jest.Mock)
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('accessToken', 'access-token');
      expect(result).toHaveProperty('refreshToken', 'refresh-token');
      expect(result.user.email).toBe(loginDto.email);
    });

    it('존재하지 않는 이메일로 로그인 시 UnauthorizedException을 던져야 함', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('비활성화된 계정으로 로그인 시 UnauthorizedException을 던져야 함', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue({
        ...mockUser,
        isActive: false,
      });

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('잘못된 비밀번호로 로그인 시 UnauthorizedException을 던져야 함', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('refreshToken', () => {
    it('유효한 리프레시 토큰으로 새 토큰을 발급해야 함', async () => {
      const payload = {
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      };

      (jwtService.verify as jest.Mock).mockReturnValue(payload);
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        role: mockUser.role,
        isActive: true,
      });
      (jwtService.signAsync as jest.Mock)
        .mockResolvedValueOnce('new-access-token')
        .mockResolvedValueOnce('new-refresh-token');

      const result = await service.refreshToken('valid-refresh-token');

      expect(result).toHaveProperty('accessToken', 'new-access-token');
      expect(result).toHaveProperty('refreshToken', 'new-refresh-token');
    });

    it('유효하지 않은 리프레시 토큰으로 UnauthorizedException을 던져야 함', async () => {
      (jwtService.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.refreshToken('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('비활성화된 사용자의 리프레시 토큰으로 UnauthorizedException을 던져야 함', async () => {
      const payload = {
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      };

      (jwtService.verify as jest.Mock).mockReturnValue(payload);
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue({
        ...mockUser,
        isActive: false,
      });

      await expect(service.refreshToken('valid-refresh-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('getProfile', () => {
    it('사용자 프로필을 반환해야 함', async () => {
      const profileData = {
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        phone: mockUser.phone,
        role: mockUser.role,
        isActive: mockUser.isActive,
        createdAt: mockUser.createdAt,
      };

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(profileData);

      const result = await service.getProfile(mockUser.id);

      expect(result).toEqual(profileData);
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        select: expect.any(Object),
      });
    });
  });
});
