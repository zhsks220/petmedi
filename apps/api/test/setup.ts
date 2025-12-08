// Jest 전역 설정
import { Logger } from '@nestjs/common';

// 테스트 환경에서 불필요한 로그 억제
Logger.overrideLogger(['error', 'warn']);

// 테스트 환경 변수 설정
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-testing';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-for-testing';

// 전역 타임아웃 설정
jest.setTimeout(30000);

// 테스트 종료 후 정리
afterAll(async () => {
  // 비동기 작업 정리 시간 제공
  await new Promise((resolve) => setTimeout(resolve, 500));
});
