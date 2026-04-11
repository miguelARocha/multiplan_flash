import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordService } from '../auth/password.service';

type SeedUser = {
  name: string;
  email: string;
  password: string;
  role: (typeof UserRole)[keyof typeof UserRole];
};

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
  ) {}

  async onApplicationBootstrap() {
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    try {
      await this.seedDefaultUsers();
    } catch (error) {
      if (this.isUsersTableMissing(error)) {
        this.logger.warn(
          'Seed ignorado porque a tabela "users" ainda nao existe. Rode as migrations antes de iniciar com dados seed.',
        );
        return;
      }

      throw error;
    }
  }

  private async seedDefaultUsers() {
    const users: SeedUser[] = [
      {
        name: 'Lojista Seed',
        email: 'lojista@multiplan.local',
        password: 'Lojista@123',
        role: UserRole.LOJISTA,
      },
      {
        name: 'Comprador Seed',
        email: 'comprador@multiplan.local',
        password: 'Comprador@123',
        role: UserRole.COMPRADOR,
      },
    ];

    for (const user of users) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: user.email },
      });

      if (existingUser) {
        continue;
      }

      const passwordHash = await this.passwordService.hash(user.password);

      await this.prisma.user.create({
        data: {
          name: user.name,
          email: user.email,
          passwordHash,
          role: user.role,
        },
      });

      this.logger.log(`Usuario seed criado: ${user.email}`);
    }
  }

  private isUsersTableMissing(error: unknown) {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2021'
    );
  }
}
