import { ApiProperty } from '@nestjs/swagger';

class InterestBuyerDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  email: string;
}

class InterestOfferDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  shopkeeperId: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  stock: number;
}

export class InterestResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  buyerId: string;

  @ApiProperty()
  offerId: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ type: InterestBuyerDto })
  buyer: InterestBuyerDto;

  @ApiProperty({ type: InterestOfferDto })
  offer: InterestOfferDto;
}
