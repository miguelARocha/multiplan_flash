import { Module } from '@nestjs/common';
import { OffersModule } from '../offers/offers.module';
import { InterestsController } from './interests.controller';
import { InterestsService } from './interests.service';

@Module({
  imports: [OffersModule],
  controllers: [InterestsController],
  providers: [InterestsService],
})
export class InterestsModule {}
