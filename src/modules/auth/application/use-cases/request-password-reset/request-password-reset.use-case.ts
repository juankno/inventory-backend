import { normalizeEmail } from "../../../domain/rules/email.ts";
import type { EmailSender } from "../../../../../shared/email/email-sender.port.ts";
import type { PasswordHasher } from "../../ports/password-hasher.port.ts";
import type { PasswordResetRepository } from "../../ports/password-reset.repository.ts";
import type { ResetCodeGenerator } from "../../ports/reset-code-generator.port.ts";
import type { UserRepository } from "../../ports/user.repository.ts";
import { resetCodeEmail } from "./reset-code-email.ts";

export const RESET_CODE_TTL_MINUTES = 15;
export const RESET_CODE_COOLDOWN_MS = 60_000;

export type RequestPasswordResetInput = {
  email: string;
};

export class RequestPasswordReset {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly resetRepository: PasswordResetRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly codeGenerator: ResetCodeGenerator,
    private readonly emailSender: EmailSender,
  ) {}

  async execute(data: RequestPasswordResetInput): Promise<void> {
    const email = normalizeEmail(data.email);
    const account = await this.userRepository.findAccountByEmail(email);
    if (!account) return;

    const now = new Date();
    const active = await this.resetRepository.findActive(account.user.id, now);
    if (active && issuedAt(active.expiresAt) > now.getTime() - RESET_CODE_COOLDOWN_MS) {
      return;
    }

    const code = this.codeGenerator.generate();
    const tokenId = await this.resetRepository.replaceActive({
      userId: account.user.id,
      tokenHash: await this.passwordHasher.hash(code),
      expiresAt: new Date(now.getTime() + RESET_CODE_TTL_MINUTES * 60_000),
    });

    try {
      await this.emailSender.send(
        resetCodeEmail({
          to: account.user.email,
          ownerName: account.user.ownerName,
          code,
          ttlMinutes: RESET_CODE_TTL_MINUTES,
        }),
      );
    } catch (error) {
      await this.resetRepository.discard(tokenId);
      throw error;
    }
  }
}

const issuedAt = (expiresAt: Date) =>
  expiresAt.getTime() - RESET_CODE_TTL_MINUTES * 60_000;
