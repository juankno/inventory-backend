import { AppError } from "../../../../../shared/errors/app-error.ts";
import { normalizeEmail } from "../../../domain/rules/email.ts";
import type { PasswordHasher } from "../../ports/password-hasher.port.ts";
import type { PasswordResetRepository } from "../../ports/password-reset.repository.ts";
import type { UserRepository } from "../../ports/user.repository.ts";

/** Intentos con un código equivocado antes de que deje de servir. */
export const MAX_RESET_ATTEMPTS = 5;

export type ConfirmPasswordResetInput = {
  email: string;
  code: string;
  newPassword: string;
};

/**
 * Cambia la contraseña con el código enviado al correo (RF-04). Cualquier
 * falla responde INVALID_RESET_CODE, sin decir si el correo existe.
 */
export class ConfirmPasswordReset {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly resetRepository: PasswordResetRepository,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async execute(data: ConfirmPasswordResetInput): Promise<void> {
    const email = normalizeEmail(data.email);
    const account = await this.userRepository.findAccountByEmail(email);
    if (!account) throw new AppError("INVALID_RESET_CODE");

    const token = await this.resetRepository.findActive(
      account.user.id,
      new Date(),
    );
    if (!token || token.attempts >= MAX_RESET_ATTEMPTS) {
      throw new AppError("INVALID_RESET_CODE");
    }

    const isCodeValid = await this.passwordHasher.compare(
      data.code,
      token.tokenHash,
    );
    if (!isCodeValid) {
      await this.resetRepository.registerFailedAttempt(token.id);
      throw new AppError("INVALID_RESET_CODE");
    }

    await this.resetRepository.consume(
      token.id,
      account.user.id,
      await this.passwordHasher.hash(data.newPassword),
    );
  }
}
