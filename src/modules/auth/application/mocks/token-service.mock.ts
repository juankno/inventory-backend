import type {
  TokenPayload,
  TokenService,
} from "../ports/token-service.port.ts";

export class TokenServiceMock implements TokenService {
  async sign(payload: TokenPayload): Promise<string> {
    return `token:${payload.userId}:${payload.businessId}`;
  }
}
