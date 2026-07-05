import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RoomVisibility } from '@shared/index';

export class RoomPageMetadataDto {
  @IsUrl({ require_protocol: true, require_valid_protocol: true })
  url!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(512)
  title!: string;

  @IsString()
  @MaxLength(255)
  hostname!: string;

  @IsOptional()
  @IsUrl()
  ogImageUrl?: string | null;
}

export class UpsertUserPayloadDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  displayName!: string;

  @IsString()
  id!: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  avatarColor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  avatarUrl?: string | null;

  @IsOptional()
  @IsBoolean()
  isGuest?: boolean;
}

export class CreateRoomDto {
  @IsOptional()
  @IsString()
  @MaxLength(128)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  description?: string;

  @ValidateNested()
  @Type(() => RoomPageMetadataDto)
  page!: RoomPageMetadataDto;

  @IsOptional()
  @IsString()
  visibility?: RoomVisibility;

  @IsOptional()
  @IsInt()
  @Min(2)
  @Max(100)
  maxParticipants?: number;

  @ValidateNested()
  @Type(() => UpsertUserPayloadDto)
  hostUser!: UpsertUserPayloadDto;
}

export class JoinRoomDto {
  @ValidateNested()
  @Type(() => UpsertUserPayloadDto)
  user!: UpsertUserPayloadDto;
}

export class LeaveRoomDto {
  @IsString()
  userId!: string;
}
