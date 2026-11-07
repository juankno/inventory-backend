import type { PrismaClient } from "../../../generated/prisma/client.ts";
import type {
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

  async replaceActive(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<string> {
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

  async registerFailedAttempt(tokenId: string): Promise<number> {
    const token = await this.prisma.passwordResetToken.update({
      where: { id: tokenId },
      data: { attempts: { increment: 1 } },
      select: { attempts: true },
    });
    return token.attempts;
  }

  async consume(
    tokenId: string,
    userId: string,
    passwordHash: string,
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.passwordResetToken.update({
        where: { id: tokenId },
        data: { usedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash },
      }),
    ]);
  }
}
