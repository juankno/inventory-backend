import type { AppDependencies } from "./app.ts";
import { ConfirmPasswordReset } from "./modules/auth/application/use-cases/confirm-password-reset/confirm-password-reset.use-case.ts";
import { Login } from "./modules/auth/application/use-cases/login/login.use-case.ts";
import { RegisterAccount } from "./modules/auth/application/use-cases/register-account/register-account.use-case.ts";
import { RequestPasswordReset } from "./modules/auth/application/use-cases/request-password-reset/request-password-reset.use-case.ts";
import { BcryptPasswordHasher } from "./modules/auth/infrastructure/bcrypt-password-hasher.ts";
import { ConsoleEmailSender } from "./modules/auth/infrastructure/console-email-sender.ts";
import { JwtTokenService } from "./modules/auth/infrastructure/jwt-token-service.ts";
import { PrismaPasswordResetRepository } from "./modules/auth/infrastructure/prisma-password-reset.repository.ts";
import { PrismaUserRepository } from "./modules/auth/infrastructure/prisma-user.repository.ts";
import { RandomResetCodeGenerator } from "./modules/auth/infrastructure/random-reset-code-generator.ts";
import { ResendEmailSender } from "./modules/auth/infrastructure/resend-email-sender.ts";
import type { Config } from "./shared/infrastructure/config.ts";
import { createPrismaClient } from "./shared/infrastructure/prisma.ts";

/**
 * Arma las dependencias de la app. Lo usan src/main.ts (servidor local) y
 * api/index.ts (Vercel), así los dos entran con los mismos casos de uso.
 */
export function buildDependencies(config: Config): AppDependencies {
  const prisma = createPrismaClient(config.DATABASE_URL);

  const userRepository = new PrismaUserRepository(prisma);
  const resetRepository = new PrismaPasswordResetRepository(prisma);
  const passwordHasher = new BcryptPasswordHasher();
  const tokenService = new JwtTokenService(
    config.JWT_SECRET,
    config.JWT_EXPIRES_IN,
  );
  const emailSender = config.RESEND_API_KEY
    ? new ResendEmailSender(config.RESEND_API_KEY, config.EMAIL_FROM)
    : new ConsoleEmailSender(config.NODE_ENV === "production");

  return {
    auth: {
      registerAccount: new RegisterAccount(
        userRepository,
        passwordHasher,
        tokenService,
      ),
      login: new Login(userRepository, passwordHasher, tokenService),
      requestPasswordReset: new RequestPasswordReset(
        userRepository,
        resetRepository,
        passwordHasher,
        new RandomResetCodeGenerator(),
        emailSender,
      ),
      confirmPasswordReset: new ConfirmPasswordReset(
        userRepository,
        resetRepository,
        passwordHasher,
      ),
    },
  };
}
