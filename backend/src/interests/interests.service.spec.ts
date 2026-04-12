import {
  ConflictException,
  ForbiddenException,
  GoneException,
  NotFoundException,
} from '@nestjs/common';
import { OfferStatus, Prisma, UserRole } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { InterestsService } from './interests.service';

describe('InterestsService', () => {
  const buyerUser: AuthenticatedUser = {
    sub: 'buyer-1',
    email: 'comprador@empresa.com',
    role: UserRole.COMPRADOR,
  };

  const shopkeeperUser: AuthenticatedUser = {
    sub: 'shopkeeper-1',
    email: 'lojista@empresa.com',
    role: UserRole.LOJISTA,
  };

  const txMock = {
    offer: {
      updateMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    interest: {
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
  };

  const prismaMock = {
    $transaction: jest.fn(),
    interest: {
      findMany: jest.fn(),
    },
  };

  const offersGatewayMock = {
    notifyInterestCreated: jest.fn(),
  };

  let interestsService: InterestsService;

  beforeEach(() => {
    txMock.offer.updateMany.mockReset();
    txMock.offer.findUnique.mockReset();
    txMock.offer.update.mockReset();
    txMock.interest.create.mockReset();
    txMock.interest.findUnique.mockReset();
    txMock.interest.delete.mockReset();
    prismaMock.$transaction.mockReset();
    prismaMock.interest.findMany.mockReset();
    offersGatewayMock.notifyInterestCreated.mockReset();
    prismaMock.$transaction.mockImplementation((callback) => callback(txMock));
    interestsService = new InterestsService(
      prismaMock as never,
      offersGatewayMock as never,
    );
  });

  it('deve registrar interesse e decrementar estoque na mesma transacao', async () => {
    txMock.offer.updateMany.mockResolvedValue({ count: 1 });
    const createdInterest = {
      id: 'interest-1',
      buyerId: 'buyer-1',
      offerId: 'offer-1',
      offer: {
        shopkeeperId: 'shopkeeper-1',
      },
    };
    txMock.interest.create.mockResolvedValue(createdInterest);

    await interestsService.create(buyerUser, 'offer-1');

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(txMock.offer.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'offer-1',
        status: OfferStatus.ATIVA,
        stock: { gt: 0 },
        expiresAt: { gt: expect.any(Date) },
      },
      data: {
        stock: { decrement: 1 },
      },
    });
    expect(txMock.interest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          buyerId: 'buyer-1',
          offerId: 'offer-1',
        },
        include: expect.objectContaining({
          offer: expect.any(Object),
        }),
      }),
    );
    expect(offersGatewayMock.notifyInterestCreated).toHaveBeenCalledWith(
      createdInterest,
    );
  });

  it('deve impedir interesse por lojista', async () => {
    await expect(
      interestsService.create(shopkeeperUser, 'offer-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(offersGatewayMock.notifyInterestCreated).not.toHaveBeenCalled();
  });

  it('deve listar interesses do comprador autenticado', async () => {
    prismaMock.interest.findMany.mockResolvedValue([]);

    await interestsService.listMine(buyerUser);

    expect(prismaMock.interest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          buyerId: 'buyer-1',
        },
        orderBy: [{ createdAt: 'desc' }],
      }),
    );
  });

  it('deve remover interesse e restaurar estoque', async () => {
    txMock.interest.findUnique.mockResolvedValue({ id: 'interest-1' });

    await interestsService.remove(buyerUser, 'offer-1');

    expect(txMock.interest.delete).toHaveBeenCalledWith({
      where: {
        id: 'interest-1',
      },
    });
    expect(txMock.offer.update).toHaveBeenCalledWith({
      where: {
        id: 'offer-1',
      },
      data: {
        stock: { increment: 1 },
      },
    });
  });

  it('deve falhar ao remover interesse inexistente', async () => {
    txMock.interest.findUnique.mockResolvedValue(null);

    await expect(
      interestsService.remove(buyerUser, 'offer-404'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('deve falhar quando oferta nao existir', async () => {
    txMock.offer.updateMany.mockResolvedValue({ count: 0 });
    txMock.offer.findUnique.mockResolvedValue(null);

    await expect(
      interestsService.create(buyerUser, 'offer-404'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('deve falhar quando oferta estiver sem estoque', async () => {
    txMock.offer.updateMany.mockResolvedValue({ count: 0 });
    txMock.offer.findUnique.mockResolvedValue({
      status: OfferStatus.ATIVA,
      stock: 0,
      expiresAt: new Date(Date.now() + 60_000),
    });

    await expect(
      interestsService.create(buyerUser, 'offer-1'),
    ).rejects.toBeInstanceOf(GoneException);
  });

  it('deve transformar interesse duplicado em conflito', async () => {
    txMock.offer.updateMany.mockResolvedValue({ count: 1 });
    txMock.interest.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );

    await expect(
      interestsService.create(buyerUser, 'offer-1'),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
