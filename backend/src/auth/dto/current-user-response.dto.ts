import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import type { AuthUserRole } from '../auth.types';

export class CurrentUserResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ enum: UserRole })
  role: AuthUserRole;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
