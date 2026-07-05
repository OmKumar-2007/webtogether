import { applyDecorators } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';

/**
 * Convenience decorator that marks an endpoint as JWT-protected in Swagger.
 */
export function ProtectedEndpoint(
  summary: string,
  responseShape = 'Object',
): MethodDecorator & ClassDecorator {
  return applyDecorators(
    ApiOperation({ summary }),
    ApiBearerAuth(),
    ApiResponse({ status: 401, description: 'Unauthorized' }),
    ApiResponse({ status: 200, description: `OK — ${responseShape}` }),
  );
}
