import jwt, { type SignOptions } from "jsonwebtoken";

import type {
  TokenPayload,
  TokenService,
} from "../application/ports/token-service.port.ts";

export class JwtTokenService implements TokenService {
  constructor(
    private readonly secret: string,
    private readonly expiresIn: string,
  ) {}

  sign({ userId, businessId }: TokenPayload): string {
    return jwt.sign({ businessId }, this.secret, {
      algorithm: "HS256",
      subject: userId,
      expiresIn: this.expiresIn as SignOptions["expiresIn"],
    });
  }
}
