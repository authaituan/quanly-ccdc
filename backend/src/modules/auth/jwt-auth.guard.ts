import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * AUTH-01. Requires a valid, non-expired JWT bearer token. Delegates to
 * JwtStrategy (passport-jwt). On failure, passport throws 401 by default.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
