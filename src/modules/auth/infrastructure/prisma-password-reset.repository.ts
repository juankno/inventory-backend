import type { PrismaClient } from "../../../generated/prisma/client.ts";
import type {
  NewPasswordResetToken,
  PasswordResetRepository,
  PasswordResetToken,
} from "../application/ports/password-reset.repository.ts";

export class PrismaPasswordResetRepository implements PasswordResetRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findActive(
    userId: string,
    now: Date,
  ): Promise<PasswordResetToken | null> {
    return this.prisma.passwordResetToken.findFirst({
      where: { userId, usedAt: null, expiresAt: { gt: now } },
      orderBy: { expiresAt: "desc" },
      select: {
        id: true,
        userId: true,
        tokenHash: true,
        expiresAt: true,
        attempts: true,
      },
    });
  }

  async replaceActive(data: NewPasswordResetToken): Promise<string> {
    const [, token] = await this.prisma.$transaction([
      this.prisma.passwordResetToken.updateMany({
        where: { userId: data.userId, usedAt: null },
        data: { usedAt: new Date() },
      }),
      this.prisma.passwordResetToken.create({
        data,
        select: { id: true },
      }),
    ]);
    return token.id;
  }

  async discard(tokenId: string): Promise<void> {
    await this.prisma.passwordResetToken.update({
      where: { id: tokenId },
      data: { usedAt: new Date() },
    });
  }

  async reserveAttempt(tokenId: string, maxAttempts: number): Promise<boolean> {
    const { count } = await this.prisma.passwordResetToken.updateMany({
      where: { id: tokenId, usedAt: null, attempts: { lt: maxAttempts } },
      data: { attempts: { increment: 1 } },
    });
    return count === 1;
  }

  async consume(
    tokenId: string,
    userId: string,
    passwordHash: string,
  ): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const { count } = await tx.passwordResetToken.updateMany({
        where: { id: tokenId, usedAt: null, expiresAt: { gt: now } },
        data: { usedAt: now },
      });
      if (count === 0) return false;

      await tx.user.update({
        where: { id: userId },
        data: { passwordHash },
      });
      return true;
    });
  }
}
