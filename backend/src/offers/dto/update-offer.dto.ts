import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { OfferStatus } from '@prisma/client';

export class UpdateOfferDto {
  @ApiPropertyOptional({ example: 'Tênis com 50% OFF' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ example: 'Últimas unidades da campanha.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Valor do produto em centavos.',
    example: 14990,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  priceInCents?: number;

  @ApiPropertyOptional({ example: 50, minimum: 1, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  discountPercentage?: number;

  @ApiPropertyOptional({ example: 10, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number;

  @ApiPropertyOptional({ example: '2026-04-13T23:59:59.000Z' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({ enum: OfferStatus, example: OfferStatus.ATIVA })
  @IsOptional()
  @IsEnum(OfferStatus)
  status?: OfferStatus;
}
