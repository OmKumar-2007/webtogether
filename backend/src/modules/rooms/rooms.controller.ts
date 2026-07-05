import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RoomsService } from './rooms.service';
import { CreateRoomDto, JoinRoomDto, LeaveRoomDto } from './dto/create-room.dto';
import { RoomWithMeta } from '@shared/index';

@ApiTags('rooms')
@Controller('rooms')
export class RoomsController {
  constructor(private readonly rooms: RoomsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new room with page metadata' })
  @ApiResponse({ status: 201, description: 'Room created', type: Object })
  async create(@Body() dto: CreateRoomDto): Promise<RoomWithMeta> {
    return this.rooms.create(dto);
  }

  @Get(':idOrCode')
  @ApiOperation({ summary: 'Get a room by id or 8-char code' })
  async findOne(@Param('idOrCode') idOrCode: string): Promise<RoomWithMeta> {
    return this.rooms.get(idOrCode);
  }

  @Post(':idOrCode/join')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Join a room (idempotent)' })
  async join(
    @Param('idOrCode') idOrCode: string,
    @Body() dto: JoinRoomDto,
  ): Promise<RoomWithMeta> {
    return this.rooms.join(idOrCode, dto);
  }

  @Post(':idOrCode/leave')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Leave a room; host leaving archives the room' })
  async leave(
    @Param('idOrCode') idOrCode: string,
    @Body() dto: LeaveRoomDto,
  ): Promise<{ archived: boolean }> {
    return this.rooms.leave(idOrCode, dto.userId);
  }
}
