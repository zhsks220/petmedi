import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma.service';
import { GlobalExceptionFilter } from '../src/common/filters/http-exception.filter';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;

  const testUser = {
    email: `test-${Date.now()}@example.com`,
    password: 'testPassword123!',
    name: '테스트 사용자',
  };

  let accessToken: string;
  let refreshToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // 프로덕션과 동일한 설정 적용
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new GlobalExceptionFilter());
    app.setGlobalPrefix('api');

    await app.init();

    prismaService = app.get(PrismaService);
  });

  afterAll(async () => {
    // 테스트 사용자 정리
    try {
      await prismaService.user.deleteMany({
        where: { email: testUser.email },
      });
    } catch (error) {
      // 이미 삭제되었거나 존재하지 않는 경우 무시
    }
    await app.close();
  });

  describe('POST /api/auth/register', () => {
    it('새 사용자를 등록해야 함', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(testUser.email);

      accessToken = response.body.accessToken;
      refreshToken = response.body.refreshToken;
    });

    it('중복 이메일로 등록 시 409 에러를 반환해야 함', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(testUser)
        .expect(409);

      expect(response.body.statusCode).toBe(409);
      expect(response.body.message).toContain('이미 등록된');
    });

    it('유효하지 않은 이메일로 등록 시 400 에러를 반환해야 함', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: 'testPassword123!',
          name: '테스트',
        })
        .expect(400);

      expect(response.body.statusCode).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('올바른 자격 증명으로 로그인해야 함', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('user');

      accessToken = response.body.accessToken;
      refreshToken = response.body.refreshToken;
    });

    it('잘못된 비밀번호로 로그인 시 401 에러를 반환해야 함', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongPassword',
        })
        .expect(401);

      expect(response.body.statusCode).toBe(401);
    });

    it('존재하지 않는 이메일로 로그인 시 401 에러를 반환해야 함', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'anyPassword',
        })
        .expect(401);

      expect(response.body.statusCode).toBe(401);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('유효한 리프레시 토큰으로 새 토큰을 발급해야 함', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');

      accessToken = response.body.accessToken;
    });

    it('유효하지 않은 리프레시 토큰으로 401 에러를 반환해야 함', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(response.body.statusCode).toBe(401);
    });
  });

  describe('GET /api/auth/profile', () => {
    it('인증된 사용자의 프로필을 반환해야 함', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('email', testUser.email);
      expect(response.body).toHaveProperty('name', testUser.name);
    });

    it('인증 없이 접근 시 401 에러를 반환해야 함', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/auth/profile')
        .expect(401);

      expect(response.body.statusCode).toBe(401);
    });

    it('유효하지 않은 토큰으로 접근 시 401 에러를 반환해야 함', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.statusCode).toBe(401);
    });
  });
});
