import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { GuestTokenDto } from './dto/guest-token.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('guest')
  @ApiOperation({ summary: 'Mint a JWT for an existing (guest or full) user' })
  async guestToken(@Body() body: GuestTokenDto): Promise<{ token: string; expiresIn: string }> {
    return this.auth.mintGuestToken(body.userId);
  }
}
