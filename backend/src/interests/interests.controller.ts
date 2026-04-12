import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  UseGuards,
  Version,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { InterestResponseDto } from './dto/interest-response.dto';
import { InterestsService } from './interests.service';

@ApiTags('Interests')
@Controller()
export class InterestsController {
  constructor(private readonly interestsService: InterestsService) {}

  @Get('interests/mine')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Lista o historico de interesses do comprador autenticado',
  })
  @ApiOkResponse({ type: InterestResponseDto, isArray: true })
  listMine(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.interestsService.listMine(currentUser);
  }

  @Post('offers/:offerId/interests')
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

  @Delete('offers/:offerId/interests')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(204)
  @ApiOperation({
    summary: 'Remove interesse do comprador e restaura o estoque da oferta',
  })
  @ApiNoContentResponse({ description: 'Interesse removido com sucesso.' })
  remove(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('offerId') offerId: string,
  ) {
    return this.interestsService.remove(currentUser, offerId);
  }
}
