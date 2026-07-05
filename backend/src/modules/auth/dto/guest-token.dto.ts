import { IsString, IsUUID } from 'class-validator';

export class GuestTokenDto {
  @IsUUID()
  @IsString()
  userId!: string;
}
