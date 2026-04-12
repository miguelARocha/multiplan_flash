import { ApiProperty } from '@nestjs/swagger';
import { OfferStatus } from '@prisma/client';

class OfferShopkeeperDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  email: string;
}

export class OfferResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;

  @ApiProperty({
    description: 'Valor do produto em centavos.',
    example: 12990,
  })
  priceInCents: number;

  @ApiProperty()
  discountPercentage: number;

  @ApiProperty()
  stock: number;

  @ApiProperty()
  expiresAt: Date;

  @ApiProperty({ enum: OfferStatus })
  status: OfferStatus;

  @ApiProperty()
  shopkeeperId: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ type: OfferShopkeeperDto })
  shopkeeper: OfferShopkeeperDto;
}
