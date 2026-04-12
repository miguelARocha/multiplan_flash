import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { OfferStatus, UserRole } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { OffersService } from './offers.service';

describe('OffersService', () => {
  const shopkeeperUser: AuthenticatedUser = {
    sub: 'shopkeeper-1',
    email: 'lojista@empresa.com',
    role: UserRole.LOJISTA,
  };

  const buyerUser: AuthenticatedUser = {
    sub: 'buyer-1',
    email: 'comprador@empresa.com',
    role: UserRole.COMPRADOR,
  };

  const prismaMock = {
    offer: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
    },
  };

  const offersGatewayMock = {
    notifyOfferCreated: jest.fn(),
    notifyOfferUpdated: jest.fn(),
  };

  let offersService: OffersService;

  beforeEach(() => {
    prismaMock.offer.create.mockReset();
    prismaMock.offer.findUnique.mockReset();
    prismaMock.offer.update.mockReset();
    prismaMock.offer.findMany.mockReset();
    prismaMock.offer.delete.mockReset();
    offersGatewayMock.notifyOfferCreated.mockReset();
    offersGatewayMock.notifyOfferUpdated.mockReset();
    offersService = new OffersService(
      prismaMock as never,
      offersGatewayMock as never,
    );
  });

  it('deve criar oferta para um lojista', async () => {
    const createdOffer = { id: 'offer-1' };
    prismaMock.offer.create.mockResolvedValue(createdOffer);

    await offersService.create(shopkeeperUser, {
      title: 'Oferta nova',
      description: 'Descricao da oferta',
      priceInCents: 12990,
      discountPercentage: 30,
      stock: 15,
      expiresAt: '2026-04-20T10:00:00.000Z',
    });

    expect(prismaMock.offer.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          shopkeeperId: 'shopkeeper-1',
          title: 'Oferta nova',
          priceInCents: 12990,
          discountPercentage: 30,
        }),
      }),
    );
    expect(offersGatewayMock.notifyOfferCreated).toHaveBeenCalledWith(
      createdOffer,
    );
  });

  it('deve impedir criacao de oferta por comprador', async () => {
    await expect(
      offersService.create(buyerUser, {
        title: 'Oferta invalida',
        description: 'Nao deveria criar',
        priceInCents: 9990,
        discountPercentage: 20,
        stock: 10,
        expiresAt: '2026-04-20T10:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(offersGatewayMock.notifyOfferCreated).not.toHaveBeenCalled();
  });

  it('deve editar oferta do proprio lojista', async () => {
    prismaMock.offer.findUnique.mockResolvedValue({
      id: 'offer-1',
      shopkeeperId: 'shopkeeper-1',
      status: OfferStatus.ATIVA,
    });
    prismaMock.offer.update.mockResolvedValue({ id: 'offer-1' });

    await offersService.update(shopkeeperUser, 'offer-1', {
      title: 'Oferta atualizada',
      priceInCents: 14990,
      stock: 8,
    });

    expect(prismaMock.offer.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'offer-1' },
        data: expect.objectContaining({
          title: 'Oferta atualizada',
          priceInCents: 14990,
          stock: 8,
        }),
      }),
    );
  });

  it('deve permitir editar e reativar oferta encerrada', async () => {
    prismaMock.offer.findUnique.mockResolvedValue({
      id: 'offer-1',
      shopkeeperId: 'shopkeeper-1',
      status: OfferStatus.ENCERRADA,
    });
    prismaMock.offer.update.mockResolvedValue({
      id: 'offer-1',
      status: OfferStatus.ATIVA,
    });

    await offersService.update(shopkeeperUser, 'offer-1', {
      title: 'Pode voltar',
      status: OfferStatus.ATIVA,
    });

    expect(prismaMock.offer.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'offer-1' },
        data: expect.objectContaining({
          title: 'Pode voltar',
          status: OfferStatus.ATIVA,
        }),
      }),
    );
    expect(offersGatewayMock.notifyOfferCreated).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'offer-1',
        status: OfferStatus.ATIVA,
      }),
    );
  });

  it('deve impedir alteracao de oferta de outro lojista', async () => {
    prismaMock.offer.findUnique.mockResolvedValue({
      id: 'offer-1',
      shopkeeperId: 'shopkeeper-2',
      status: OfferStatus.ATIVA,
    });

    await expect(
      offersService.close(shopkeeperUser, 'offer-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('deve falhar quando oferta nao existir', async () => {
    prismaMock.offer.findUnique.mockResolvedValue(null);

    await expect(
      offersService.close(shopkeeperUser, 'offer-404'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('deve excluir oferta do lojista autenticado', async () => {
    prismaMock.offer.findUnique.mockResolvedValue({
      id: 'offer-1',
      shopkeeperId: 'shopkeeper-1',
      status: OfferStatus.ATIVA,
    });

    await offersService.remove(shopkeeperUser, 'offer-1');

    expect(prismaMock.offer.delete).toHaveBeenCalledWith({
      where: { id: 'offer-1' },
    });
  });

  it('deve listar publicamente apenas ofertas ativas por padrao', async () => {
    prismaMock.offer.findMany.mockResolvedValue([]);

    await offersService.listPublic({});

    expect(prismaMock.offer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: OfferStatus.ATIVA,
          expiresAt: { gt: expect.any(Date) },
        },
      }),
    );
  });

  it('deve notificar compradores quando uma oferta ativa muda de preco', async () => {
    const previousOffer = {
      id: 'offer-1',
      shopkeeperId: 'shopkeeper-1',
      status: OfferStatus.ATIVA,
      title: 'Oferta',
      description: 'Descricao',
      priceInCents: 12990,
      discountPercentage: 30,
      stock: 10,
      expiresAt: new Date('2026-04-20T10:00:00.000Z'),
    };
    const updatedOffer = {
      ...previousOffer,
      priceInCents: 11990,
    };
    prismaMock.offer.findUnique.mockResolvedValue(previousOffer);
    prismaMock.offer.update.mockResolvedValue(updatedOffer);

    await offersService.update(shopkeeperUser, 'offer-1', {
      priceInCents: 11990,
    });

    expect(offersGatewayMock.notifyOfferUpdated).toHaveBeenCalledWith(
      updatedOffer,
    );
  });

  it('deve listar ofertas do lojista com quantidade de interessados', async () => {
    prismaMock.offer.findMany.mockResolvedValue([
      {
        id: 'offer-1',
        shopkeeperId: 'shopkeeper-1',
        _count: {
          interests: 2,
        },
      },
    ]);

    const offers = await offersService.listMine(shopkeeperUser);

    expect(prismaMock.offer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { shopkeeperId: 'shopkeeper-1' },
        include: expect.objectContaining({
          _count: {
            select: {
              interests: true,
            },
          },
        }),
      }),
    );
    expect(offers).toEqual([
      {
        id: 'offer-1',
        shopkeeperId: 'shopkeeper-1',
        interestedCount: 2,
      },
    ]);
  });

  it('deve impedir comprador de listar ofertas como lojista', async () => {
    await expect(offersService.listMine(buyerUser)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
