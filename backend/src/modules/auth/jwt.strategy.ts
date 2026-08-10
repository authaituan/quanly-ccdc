import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

export interface JwtPayload {
  sub: string; // user id
  email: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    const secret = process.env.JWT_SECRET;
    // AUTH-01: no hardcoded/default secret. main.ts already fails fast at
    // bootstrap if this is unset (see assertRequiredEnv), but this
    // constructor also guards independently in case JwtStrategy is ever
    // instantiated outside that bootstrap path (e.g. in a unit test).
    if (!secret) {
      throw new Error('JWT_SECRET is not set - refusing to start JwtStrategy without it.');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  // Return value becomes req.user in guarded routes.
  async validate(payload: JwtPayload) {
    return { userId: payload.sub, email: payload.email, role: payload.role };
  }
}
