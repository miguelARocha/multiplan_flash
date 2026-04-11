import crypto from 'node:crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';

jest.mock('../src/prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { AuthController } from '../src/auth/auth.controller';
import { AuthService } from '../src/auth/auth.service';
import { PasswordService } from '../src/auth/password.service';
import { PrismaService } from '../src/prisma/prisma.service';

type StoredUser = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: (typeof UserRole)[keyof typeof UserRole];
  createdAt: Date;
  updatedAt: Date;
};

describe('Fluxo de autenticacao', () => {
  let authController: AuthController;
  let passwordService: PasswordService;
  let users: StoredUser[];

  const prismaMock = {
    user: {
      findUnique: jest.fn(async ({ where }: { where: { email: string } }) => {
        return users.find((user) => user.email === where.email) ?? null;
      }),
      create: jest.fn(
        async ({
          data,
        }: {
          data: Omit<StoredUser, 'id' | 'createdAt' | 'updatedAt'>;
        }) => {
          const now = new Date();
          const user: StoredUser = {
            id: crypto.randomUUID(),
            createdAt: now,
            updatedAt: now,
            ...data,
          };
          users.push(user);
          return user;
        },
      ),
    },
  };

  beforeEach(async () => {
    users = [];

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        JwtModule.register({
          secret: 'test-secret',
          signOptions: { expiresIn: '1d' },
        }),
      ],
      controllers: [AuthController],
      providers: [
        AuthService,
        PasswordService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    authController = moduleFixture.get(AuthController);
    passwordService = moduleFixture.get(PasswordService);
    prismaMock.user.findUnique.mockClear();
    prismaMock.user.create.mockClear();
  });

  it('deve cadastrar um comprador e retornar um token', async () => {
    const response = await authController.register({
      name: 'Maria',
      email: 'maria@empresa.com',
      password: 'senhaSegura123',
      role: 'COMPRADOR',
    });

    expect(response.accessToken).toEqual(expect.any(String));
    expect(response.user).toMatchObject({
      name: 'Maria',
      email: 'maria@empresa.com',
      role: 'COMPRADOR',
    });
    expect(users).toHaveLength(1);
    expect(users[0].passwordHash).not.toBe('senhaSegura123');
  });

  it('deve autenticar um lojista existente no login', async () => {
    const passwordHash = await passwordService.hash('Lojista@123');
    users.push({
      id: 'user-1',
      name: 'Lojista Teste',
      email: 'lojista@empresa.com',
      passwordHash,
      role: UserRole.LOJISTA,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const response = await authController.login({
      email: 'lojista@empresa.com',
      password: 'Lojista@123',
    });

    expect(response.accessToken).toEqual(expect.any(String));
    expect(response.user).toMatchObject({
      email: 'lojista@empresa.com',
      role: 'LOJISTA',
    });
  });

  it('deve rejeitar credenciais invalidas no login', async () => {
    const passwordHash = await passwordService.hash('Comprador@123');
    users.push({
      id: 'user-2',
      name: 'Comprador Teste',
      email: 'comprador@empresa.com',
      passwordHash,
      role: UserRole.COMPRADOR,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      authController.login({
        email: 'comprador@empresa.com',
        password: 'senhaErrada123',
      }),
    ).rejects.toMatchObject({
      status: 401,
    });
  });
});
