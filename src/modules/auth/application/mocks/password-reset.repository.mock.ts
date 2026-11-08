import type {
  NewPasswordResetToken,
  PasswordResetRepository,
  PasswordResetToken,
} from "../ports/password-reset.repository.ts";

export type StoredResetToken = PasswordResetToken & { usedAt: Date | null };

export class PasswordResetRepositoryMock implements PasswordResetRepository {
  readonly tokens: StoredResetToken[] = [];
  readonly passwordHashes = new Map<string, string>();

  async findActive(
    userId: string,
    now: Date,
  ): Promise<PasswordResetToken | null> {
    const active = this.tokens
      .filter(
        (token) =>
          token.userId === userId &&
          token.usedAt === null &&
          token.expiresAt > now,
      )
      .sort((a, b) => b.expiresAt.getTime() - a.expiresAt.getTime());
    return active[0] ?? null;
  }

  async replaceActive(data: NewPasswordResetToken): Promise<string> {
    for (const token of this.tokens) {
      if (token.userId === data.userId && token.usedAt === null) {
        token.usedAt = new Date();
      }
    }
    const id = `reset-${this.tokens.length + 1}`;
    this.tokens.push({ id, ...data, attempts: 0, usedAt: null });
    return id;
  }

  async discard(tokenId: string): Promise<void> {
    this.get(tokenId).usedAt = new Date();
  }

  async reserveAttempt(tokenId: string, maxAttempts: number): Promise<boolean> {
    const token = this.get(tokenId);
    if (token.usedAt !== null || token.attempts >= maxAttempts) return false;

    token.attempts += 1;
    return true;
  }

  async consume(
    tokenId: string,
    userId: string,
    passwordHash: string,
  ): Promise<boolean> {
    const token = this.get(tokenId);
    if (token.usedAt !== null || token.expiresAt <= new Date()) return false;

    token.usedAt = new Date();
    this.passwordHashes.set(userId, passwordHash);
    return true;
  }

  private get(tokenId: string): StoredResetToken {
    const token = this.tokens.find((item) => item.id === tokenId);
    if (!token) throw new Error(`No existe el código ${tokenId}`);
    return token;
  }
}
