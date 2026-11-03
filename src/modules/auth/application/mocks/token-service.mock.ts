import type {
  TokenPayload,
  TokenService,
} from "../ports/token-service.port.ts";

export class TokenServiceMock implements TokenService {
  sign(payload: TokenPayload): string {
    return `token:${payload.userId}:${payload.businessId}`;
  }
}
