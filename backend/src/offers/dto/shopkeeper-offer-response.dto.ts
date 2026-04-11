import { ApiProperty } from '@nestjs/swagger';
import { OfferResponseDto } from './offer-response.dto';

export class ShopkeeperOfferResponseDto extends OfferResponseDto {
  @ApiProperty({
    description: 'Quantidade de compradores interessados nesta oferta.',
    example: 3,
  })
  interestedCount: number;
}
