import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  Version,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateOfferDto } from './dto/create-offer.dto';
import { ListOffersQueryDto } from './dto/list-offers-query.dto';
import { OfferResponseDto } from './dto/offer-response.dto';
import { ShopkeeperOfferResponseDto } from './dto/shopkeeper-offer-response.dto';
import { UpdateOfferDto } from './dto/update-offer.dto';
import { OffersService } from './offers.service';

@ApiTags('Offers')
@Controller('offers')
export class OffersController {
  constructor(private readonly offersService: OffersService) {}

  @Post()
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cria uma oferta para o lojista autenticado' })
  @ApiCreatedResponse({ type: OfferResponseDto })
  create(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() createOfferDto: CreateOfferDto,
  ) {
    return this.offersService.create(currentUser, createOfferDto);
  }

  @Get('mine')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Lista ofertas do lojista autenticado com quantidade de interessados',
  })
  @ApiOkResponse({ type: ShopkeeperOfferResponseDto, isArray: true })
  listMine(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.offersService.listMine(currentUser);
  }

  @Patch(':id')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Edita uma oferta do lojista autenticado' })
  @ApiOkResponse({ type: OfferResponseDto })
  update(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id') id: string,
    @Body() updateOfferDto: UpdateOfferDto,
  ) {
    return this.offersService.update(currentUser, id, updateOfferDto);
  }

  @Patch(':id/close')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Encerra uma oferta do lojista autenticado' })
  @ApiOkResponse({ type: OfferResponseDto })
  close(@CurrentUser() currentUser: AuthenticatedUser, @Param('id') id: string) {
    return this.offersService.close(currentUser, id);
  }

  @Get()
  @Version('1')
  @ApiOperation({ summary: 'Lista publicamente as ofertas, por padrao apenas ativas' })
  @ApiOkResponse({ type: OfferResponseDto, isArray: true })
  listPublic(@Query() query: ListOffersQueryDto) {
    return this.offersService.listPublic(query);
  }
}
