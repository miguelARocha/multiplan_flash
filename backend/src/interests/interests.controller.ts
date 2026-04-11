import { Controller, Param, Post, UseGuards, Version } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { InterestResponseDto } from './dto/interest-response.dto';
import { InterestsService } from './interests.service';

@ApiTags('Interests')
@Controller('offers/:offerId/interests')
export class InterestsController {
  constructor(private readonly interestsService: InterestsService) {}

  @Post()
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Registra interesse do comprador e decrementa o estoque',
  })
  @ApiCreatedResponse({ type: InterestResponseDto })
  create(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('offerId') offerId: string,
  ) {
    return this.interestsService.create(currentUser, offerId);
  }
}
