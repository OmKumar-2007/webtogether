import { Controller, Get, Param, Query, ParseIntPipe } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { MessagesService } from './messages.service';
import { MessageWithAuthor } from '@shared/index';

@ApiTags('messages')
@Controller('rooms/:idOrCode/messages')
export class MessagesController {
  constructor(private readonly messages: MessagesService) {}

  @Get()
  @ApiOperation({ summary: 'List messages for a room (newest first)' })
  async list(
    @Param('idOrCode') idOrCode: string,
    @Query('limit', ParseIntPipe) limit = 100,
    @Query('before') before?: string,
  ): Promise<MessageWithAuthor[]> {
    return this.messages.list(idOrCode, limit, before ? new Date(before) : undefined);
  }
}
