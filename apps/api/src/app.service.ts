import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'petmedi-api',
    };
  }

  getVersion() {
    return {
      version: '0.1.0',
      name: 'PetMedi API',
      description: '동물병원 통합 의료 플랫폼 API',
      environment: process.env.NODE_ENV || 'development',
    };
  }
}
