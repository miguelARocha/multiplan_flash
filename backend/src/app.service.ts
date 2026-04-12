import { Injectable } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';

export class HealthResponseDto {
  @ApiProperty({ example: 'ok' })
  status: 'ok';

  @ApiProperty({ example: 'multiplan-flash-api' })
  service: string;

  @ApiProperty({ example: '1' })
  version: string;

  @ApiProperty({ example: 'production' })
  environment: string;

  @ApiProperty({ example: 42 })
  uptimeInSeconds: number;

  @ApiProperty({ example: '2026-04-12T04:30:00.000Z' })
  timestamp: string;
}

@Injectable()
export class AppService {
  getHealth(): HealthResponseDto {
    return {
      status: 'ok',
      service: 'multiplan-flash-api',
      version: '1',
      environment: process.env.NODE_ENV ?? 'development',
      uptimeInSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }
}
