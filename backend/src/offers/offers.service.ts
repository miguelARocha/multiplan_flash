import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OfferStatus, type Prisma } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOfferDto } from './dto/create-offer.dto';
import { ListOffersQueryDto } from './dto/list-offers-query.dto';
import { UpdateOfferDto } from './dto/update-offer.dto';
import { OffersGateway } from './offers.gateway';

@Injectable()
export class OffersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly offersGateway: OffersGateway,
  ) {}

  async create(currentUser: AuthenticatedUser, createOfferDto: CreateOfferDto) {
    this.ensureShopkeeper(currentUser);

    const offer = await this.prisma.offer.create({
      data: {
        title: createOfferDto.title.trim(),
        description: createOfferDto.description.trim(),
        priceInCents: createOfferDto.priceInCents,
        discountPercentage: createOfferDto.discountPercentage,
        stock: createOfferDto.stock,
        expiresAt: new Date(createOfferDto.expiresAt),
        shopkeeperId: currentUser.sub,
      },
      include: {
        shopkeeper: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    this.offersGateway.notifyOfferCreated(offer);

    return offer;
  }

  async update(
    currentUser: AuthenticatedUser,
    offerId: string,
    updateOfferDto: UpdateOfferDto,
  ) {
    this.ensureShopkeeper(currentUser);
    await this.getOwnedOfferOrThrow(offerId, currentUser.sub);

    const updatedOffer = await this.prisma.offer.update({
      where: { id: offerId },
      data: this.buildUpdateData(updateOfferDto),
      include: {
        shopkeeper: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (updateOfferDto.status === OfferStatus.ATIVA) {
      this.offersGateway.notifyOfferCreated(updatedOffer);
    }

    return updatedOffer;
  }

  async close(currentUser: AuthenticatedUser, offerId: string) {
    this.ensureShopkeeper(currentUser);
    await this.getOwnedOfferOrThrow(offerId, currentUser.sub);

    return this.prisma.offer.update({
      where: { id: offerId },
      data: { status: OfferStatus.ENCERRADA },
      include: {
        shopkeeper: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async remove(currentUser: AuthenticatedUser, offerId: string) {
    this.ensureShopkeeper(currentUser);
    await this.getOwnedOfferOrThrow(offerId, currentUser.sub);

    await this.prisma.offer.delete({
      where: { id: offerId },
    });
  }

  async listPublic(query: ListOffersQueryDto) {
    return this.prisma.offer.findMany({
      where: {
        status: query.status ?? OfferStatus.ATIVA,
      },
      orderBy: [{ createdAt: 'desc' }],
      include: {
        shopkeeper: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async listMine(currentUser: AuthenticatedUser) {
    this.ensureShopkeeper(currentUser);

    const offers = await this.prisma.offer.findMany({
      where: {
        shopkeeperId: currentUser.sub,
      },
      orderBy: [{ createdAt: 'desc' }],
      include: {
        shopkeeper: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            interests: true,
          },
        },
      },
    });

    return offers.map(({ _count, ...offer }) => ({
      ...offer,
      interestedCount: _count.interests,
    }));
  }

  private ensureShopkeeper(currentUser: AuthenticatedUser) {
    if (currentUser.role !== 'LOJISTA') {
      throw new ForbiddenException(
        'Apenas usuarios lojistas podem gerenciar ofertas.',
      );
    }
  }

  private async getOwnedOfferOrThrow(offerId: string, shopkeeperId: string) {
    const offer = await this.prisma.offer.findUnique({
      where: { id: offerId },
    });

    if (!offer) {
      throw new NotFoundException('Oferta nao encontrada.');
    }

    if (offer.shopkeeperId !== shopkeeperId) {
      throw new ForbiddenException(
        'Voce nao tem permissao para alterar esta oferta.',
      );
    }

    return offer;
  }

  private buildUpdateData(
    updateOfferDto: UpdateOfferDto,
  ): Prisma.OfferUpdateInput {
    return {
      ...(updateOfferDto.title !== undefined
        ? { title: updateOfferDto.title.trim() }
        : {}),
      ...(updateOfferDto.description !== undefined
        ? { description: updateOfferDto.description.trim() }
        : {}),
      ...(updateOfferDto.priceInCents !== undefined
        ? { priceInCents: updateOfferDto.priceInCents }
        : {}),
      ...(updateOfferDto.discountPercentage !== undefined
        ? { discountPercentage: updateOfferDto.discountPercentage }
        : {}),
      ...(updateOfferDto.stock !== undefined
        ? { stock: updateOfferDto.stock }
        : {}),
      ...(updateOfferDto.expiresAt !== undefined
        ? { expiresAt: new Date(updateOfferDto.expiresAt) }
        : {}),
      ...(updateOfferDto.status !== undefined
        ? { status: updateOfferDto.status }
        : {}),
    };
  }
}
