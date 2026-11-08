export interface PasswordResetToken {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  attempts: number;
}

export interface NewPasswordResetToken {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

export interface PasswordResetRepository {
  findActive(userId: string, now: Date): Promise<PasswordResetToken | null>;
  replaceActive(data: NewPasswordResetToken): Promise<string>;
  discard(tokenId: string): Promise<void>;
  reserveAttempt(tokenId: string, maxAttempts: number): Promise<boolean>;
  consume(tokenId: string, userId: string, passwordHash: string): Promise<boolean>;
}
