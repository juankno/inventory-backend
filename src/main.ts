import { createApp } from "./app.ts";
import { Login } from "./modules/auth/application/use-cases/login/login.use-case.ts";
import { RegisterAccount } from "./modules/auth/application/use-cases/register-account/register-account.use-case.ts";
import { BcryptPasswordHasher } from "./modules/auth/infrastructure/bcrypt-password-hasher.ts";
import { JwtTokenService } from "./modules/auth/infrastructure/jwt-token-service.ts";
import { PrismaUserRepository } from "./modules/auth/infrastructure/prisma-user.repository.ts";
import { loadConfig } from "./shared/infrastructure/config.ts";
import { createPrismaClient } from "./shared/infrastructure/prisma.ts";

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

app.listen(config.PORT, () => {
  console.log(`API escuchando en http://localhost:${config.PORT}/api/v1`);
});
