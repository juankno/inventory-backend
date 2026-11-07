export interface TokenPayload {
  userId: string;
  businessId: string;
}

export interface TokenService {
  sign(payload: TokenPayload): string;
  verify(token: string): TokenPayload | null;
}
