import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { AVATAR_COLORS } from '@shared/index';

export class UpsertUserDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  displayName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  avatarColor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  avatarUrl?: string | null;

  /** Quick runtime check; not enforced server-side beyond type. */
  readonly _palette: typeof AVATAR_COLORS = AVATAR_COLORS;
}
