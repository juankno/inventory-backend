import { createHash } from "node:crypto";

import type { PrismaClient } from "../../../generated/prisma/client.ts";
import type {
  LoginThrottleRepository,
  LoginThrottleState,
} from "../application/ports/login-throttle.repository.ts";

const hashEmail = (email: string): string =>
  createHash("sha256").update(email).digest("hex");

export class PrismaLoginThrottleRepository implements LoginThrottleRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async find(email: string): Promise<LoginThrottleState | null> {
    return this.prisma.loginThrottle.findUnique({
      where: { emailHash: hashEmail(email) },
      select: { failedAttempts: true, lastFailedAt: true, lockedUntil: true },
    });
  }

  async registerFailure(email: string, now: Date): Promise<number> {
    const emailHash = hashEmail(email);
    const { failedAttempts } = await this.prisma.loginThrottle.upsert({
      where: { emailHash },
      create: { emailHash, failedAttempts: 1, lastFailedAt: now },
      update: { failedAttempts: { increment: 1 }, lastFailedAt: now },
      select: { failedAttempts: true },
    });
    return failedAttempts;
  }

  async lock(email: string, until: Date): Promise<void> {
    await this.prisma.loginThrottle.update({
      where: { emailHash: hashEmail(email) },
      data: { lockedUntil: until },
    });
  }

  async clear(email: string): Promise<void> {
    await this.prisma.loginThrottle.deleteMany({
      where: { emailHash: hashEmail(email) },
    });
  }
}
