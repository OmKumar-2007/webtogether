import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpsertUserDto } from './dto/upsert-user.dto';
import { PublicUser } from '@shared/index';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<PublicUser> {
    const u = await this.users.get(id);
    return {
      id: u.id,
      displayName: u.displayName,
      avatarColor: u.avatarColor,
      avatarUrl: u.avatarUrl ?? undefined,
      isGuest: u.isGuest,
    };
  }

  @Put(':id')
  async upsert(
    @Param('id') id: string,
    @Body() body: UpsertUserDto,
  ): Promise<PublicUser> {
    const u = await this.users.upsertGuest({
      id,
      displayName: body.displayName,
      avatarColor: body.avatarColor,
      avatarUrl: body.avatarUrl,
    });
    return {
      id: u.id,
      displayName: u.displayName,
      avatarColor: u.avatarColor,
      avatarUrl: u.avatarUrl ?? undefined,
      isGuest: u.isGuest,
    };
  }
}
