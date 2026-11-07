import { createApp } from "../src/app.ts";
import { Login } from "../src/modules/auth/application/use-cases/login/login.use-case.ts";
import { RegisterAccount } from "../src/modules/auth/application/use-cases/register-account/register-account.use-case.ts";
import { BcryptPasswordHasher } from "../src/modules/auth/infrastructure/bcrypt-password-hasher.ts";
import { JwtTokenService } from "../src/modules/auth/infrastructure/jwt-token-service.ts";
import { PrismaUserRepository } from "../src/modules/auth/infrastructure/prisma-user.repository.ts";
import { loadConfig } from "../src/shared/infrastructure/config.ts";
import { createPrismaClient } from "../src/shared/infrastructure/prisma.ts";

const config = loadConfig();
const prisma = createPrismaClient(config.DATABASE_URL);

const userRepository = new PrismaUserRepository(prisma);
const passwordHasher = new BcryptPasswordHasher();
const tokenService = new JwtTokenService(
  config.JWT_SECRET,
  config.JWT_EXPIRES_IN,
);

const app = createApp({
  auth: {
    registerAccount: new RegisterAccount(
      userRepository,
      passwordHasher,
      tokenService,
    ),
    login: new Login(userRepository, passwordHasher, tokenService),
  },
});

export default app;
