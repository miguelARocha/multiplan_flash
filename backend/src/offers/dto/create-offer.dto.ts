import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateOfferDto {
  @ApiProperty({ example: 'Tênis com 40% OFF' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'Oferta válida enquanto durar o estoque.' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    description: 'Valor do produto em centavos.',
    example: 12990,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  priceInCents: number;

  @ApiProperty({ example: 40, minimum: 1, maximum: 100 })
  @IsInt()
  @Min(1)
  @Max(100)
  discountPercentage: number;

  @ApiProperty({ example: 25, minimum: 0 })
  @IsInt()
  @Min(0)
  stock: number;

  @ApiProperty({ example: '2026-04-12T23:59:59.000Z' })
  @IsDateString()
  expiresAt: string;
}
