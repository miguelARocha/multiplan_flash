import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import type { AuthUserRole } from '../auth.types';

export class CurrentUserResponseDto {
  @ApiProperty()
  sub: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ enum: UserRole })
  role: AuthUserRole;
}
