import { UserRole } from '@prisma/client';

export type AuthUserRole = (typeof UserRole)[keyof typeof UserRole];
