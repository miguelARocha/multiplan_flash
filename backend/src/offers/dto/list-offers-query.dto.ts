import { ApiPropertyOptional } from '@nestjs/swagger';
import { OfferStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class ListOffersQueryDto {
  @ApiPropertyOptional({ enum: OfferStatus, example: OfferStatus.ATIVA })
  @IsOptional()
  @IsEnum(OfferStatus)
  status?: OfferStatus;
}
