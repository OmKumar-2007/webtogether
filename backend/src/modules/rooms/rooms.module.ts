import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  RoomEntity,
  RoomParticipantEntity,
  UserEntity,
  MessageEntity,
} from '../../database/entities';
import { RoomsController } from './rooms.controller';
import { RoomsService } from './rooms.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RoomEntity,
      RoomParticipantEntity,
      UserEntity,
      MessageEntity,
    ]),
    UsersModule,
  ],
  controllers: [RoomsController],
  providers: [RoomsService],
  exports: [RoomsService],
})
export class RoomsModule {}
