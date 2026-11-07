import jwt, { type SignOptions } from "jsonwebtoken";

import type {
  TokenPayload,
  TokenService,
} from "../application/ports/token-service.port.ts";

const ALGORITHM = "HS256";

export class JwtTokenService implements TokenService {
  constructor(
    private readonly secret: string,
    private readonly expiresIn: string,
  ) {}

  sign({ userId, businessId }: TokenPayload): string {
    return jwt.sign({ businessId }, this.secret, {
      algorithm: ALGORITHM,
      subject: userId,
      expiresIn: this.expiresIn as SignOptions["expiresIn"],
    });
  }

  verify(token: string): TokenPayload | null {
    try {
      const decoded = jwt.verify(token, this.secret, {
        algorithms: [ALGORITHM],
      });

      if (
        typeof decoded === "string" ||
        typeof decoded.sub !== "string" ||
        typeof decoded.businessId !== "string" ||
        decoded.sub === "" ||
        decoded.businessId === ""
      ) {
        return null;
      }

      return { userId: decoded.sub, businessId: decoded.businessId };
    } catch {
      return null;
    }
  }
}
