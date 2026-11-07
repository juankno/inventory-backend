import { createApp } from "../src/app.ts";
import { RegisterAccount } from "../src/modules/auth/application/use-cases/register-account/register-account.use-case.ts";
import { BcryptPasswordHasher } from "../src/modules/auth/infrastructure/bcrypt-password-hasher.ts";
import { JwtTokenService } from "../src/modules/auth/infrastructure/jwt-token-service.ts";
import { PrismaUserRepository } from "../src/modules/auth/infrastructure/prisma-user.repository.ts";
import { loadConfig } from "../src/shared/infrastructure/config.ts";
import { createPrismaClient } from "../src/shared/infrastructure/prisma.ts";

const config = loadConfig();
const prisma = createPrismaClient(config.DATABASE_URL);

const registerAccount = new RegisterAccount(
  new PrismaUserRepository(prisma),
  new BcryptPasswordHasher(),
  new JwtTokenService(config.JWT_SECRET, config.JWT_EXPIRES_IN),
);

const app = createApp({ registerAccount });

export default app;
