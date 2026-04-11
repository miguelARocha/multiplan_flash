import {
  ConflictException,
  ForbiddenException,
  GoneException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OfferStatus, Prisma } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InterestsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(currentUser: AuthenticatedUser, offerId: string) {
    this.ensureBuyer(currentUser);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const stockReservation = await tx.offer.updateMany({
          where: {
            id: offerId,
            status: OfferStatus.ATIVA,
            stock: { gt: 0 },
            expiresAt: { gt: new Date() },
          },
          data: {
            stock: { decrement: 1 },
          },
        });

        if (stockReservation.count === 0) {
          await this.throwUnavailableOfferError(tx, offerId);
        }

        return tx.interest.create({
          data: {
            buyerId: currentUser.sub,
            offerId,
          },
          include: {
            buyer: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            offer: {
              select: {
                id: true,
                title: true,
                stock: true,
              },
            },
          },
        });
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('Interesse ja registrado para esta oferta.');
      }

      throw error;
    }
  }

  private ensureBuyer(currentUser: AuthenticatedUser) {
    if (currentUser.role !== 'COMPRADOR') {
      throw new ForbiddenException(
        'Apenas usuarios compradores podem registrar interesse.',
      );
    }
  }

  private async throwUnavailableOfferError(
    tx: Prisma.TransactionClient,
    offerId: string,
  ): Promise<never> {
    const offer = await tx.offer.findUnique({
      where: { id: offerId },
      select: {
        status: true,
        stock: true,
        expiresAt: true,
      },
    });

    if (!offer) {
      throw new NotFoundException('Oferta nao encontrada.');
    }

    if (
      offer.status !== OfferStatus.ATIVA ||
      offer.stock <= 0 ||
      offer.expiresAt <= new Date()
    ) {
      throw new GoneException('Oferta indisponivel para novos interesses.');
    }

    throw new ConflictException('Nao foi possivel registrar interesse.');
  }

  private isUniqueConstraintError(error: unknown) {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }
}
