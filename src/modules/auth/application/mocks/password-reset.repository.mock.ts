import type {
  PasswordResetRepository,
  PasswordResetToken,
} from "../ports/password-reset.repository.ts";

export type StoredResetToken = PasswordResetToken & { usedAt: Date | null };

export class PasswordResetRepositoryMock implements PasswordResetRepository {
  readonly tokens: StoredResetToken[] = [];
  /** Contraseñas cambiadas con consume(), por id de usuario. */
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

  async replaceActive(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<string> {
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

  async registerFailedAttempt(tokenId: string): Promise<number> {
    const token = this.get(tokenId);
    token.attempts += 1;
    return token.attempts;
  }

  async consume(
    tokenId: string,
    userId: string,
    passwordHash: string,
  ): Promise<void> {
    this.get(tokenId).usedAt = new Date();
    this.passwordHashes.set(userId, passwordHash);
  }

  private get(tokenId: string): StoredResetToken {
    const token = this.tokens.find((item) => item.id === tokenId);
    if (!token) throw new Error(`No existe el código ${tokenId}`);
    return token;
  }
}
