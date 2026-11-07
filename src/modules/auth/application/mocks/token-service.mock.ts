import type {
  TokenPayload,
  TokenService,
} from "../ports/token-service.port.ts";

export class TokenServiceMock implements TokenService {
  sign(payload: TokenPayload): string {
    return `token:${payload.userId}:${payload.businessId}`;
  }

  verify(token: string): TokenPayload | null {
    const [prefix, userId, businessId] = token.split(":");

    if (prefix !== "token" || !userId || !businessId) {
      return null;
    }

    return { userId, businessId };
  }
}
