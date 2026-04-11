import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import type { StringValue } from 'ms';
import { OffersController } from './offers.controller';
import { OffersGateway } from './offers.gateway';
import { OffersService } from './offers.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const expiresIn =
          (configService.get<string>('JWT_EXPIRES_IN') ?? '1d') as StringValue;

        return {
          secret:
            configService.get<string>('JWT_SECRET') ??
            'multiplan_flash_jwt_secret',
          signOptions: {
            expiresIn,
          },
        };
      },
    }),
  ],
  controllers: [OffersController],
  providers: [OffersService, OffersGateway],
  exports: [OffersGateway],
})
export class OffersModule {}
