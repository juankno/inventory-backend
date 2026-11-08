import type { AppDependencies } from "./app.ts";
import { ConfirmPasswordReset } from "./modules/auth/application/use-cases/confirm-password-reset/confirm-password-reset.use-case.ts";
import { Login } from "./modules/auth/application/use-cases/login/login.use-case.ts";
import { RegisterAccount } from "./modules/auth/application/use-cases/register-account/register-account.use-case.ts";
import { RequestPasswordReset } from "./modules/auth/application/use-cases/request-password-reset/request-password-reset.use-case.ts";
import { BcryptPasswordHasher } from "./modules/auth/infrastructure/bcrypt-password-hasher.ts";
import { JwtTokenService } from "./modules/auth/infrastructure/jwt-token-service.ts";
import { PrismaPasswordResetRepository } from "./modules/auth/infrastructure/prisma-password-reset.repository.ts";
import { PrismaUserRepository } from "./modules/auth/infrastructure/prisma-user.repository.ts";
import { RandomResetCodeGenerator } from "./modules/auth/infrastructure/random-reset-code-generator.ts";
import { requireAuthMiddleware } from "./modules/auth/presentation/require-auth.middleware.ts";
import { GetMovementHistory } from "./modules/inventory/application/use-cases/get-movement-history/get-movement-history.use-case.ts";
import { GetProduct } from "./modules/inventory/application/use-cases/get-product/get-product.use-case.ts";
import { ListInventory } from "./modules/inventory/application/use-cases/list-inventory/list-inventory.use-case.ts";
import { PrismaInventoryQueries } from "./modules/inventory/infrastructure/prisma-inventory-queries.repository.ts";
import { RegisterMovement } from "./modules/movements/application/use-cases/register-movement/register-movement.use-case.ts";
import { PrismaMovementRepository } from "./modules/movements/infrastructure/prisma-movement.repository.ts";
import { CreateProduct } from "./modules/products/application/use-cases/create-product/create-product.use-case.ts";
import { IdentifyProduct } from "./modules/products/application/use-cases/identify-product/identify-product.use-case.ts";
import { Base32IdGenerator } from "./modules/products/infrastructure/base32-id-generator.ts";
import { PrismaProductRepository } from "./modules/products/infrastructure/prisma-product.repository.ts";
import { createEmailSender } from "./shared/email/create-email-sender.ts";
import type { Config } from "./shared/infrastructure/config.ts";
import { createPrismaClient } from "./shared/infrastructure/prisma.ts";

export function buildDependencies(config: Config): AppDependencies {
  const prisma = createPrismaClient(config.DATABASE_URL);

  const userRepository = new PrismaUserRepository(prisma);
  const resetRepository = new PrismaPasswordResetRepository(prisma);
  const passwordHasher = new BcryptPasswordHasher();
  const tokenService = new JwtTokenService(
    config.JWT_SECRET,
    config.JWT_EXPIRES_IN,
  );
  const emailSender = createEmailSender(config);
  const productRepository = new PrismaProductRepository(prisma);
  const inventoryQueries = new PrismaInventoryQueries(prisma);

  return {
    requireAuth: requireAuthMiddleware(tokenService),
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
    products: {
      createProduct: new CreateProduct(
        productRepository,
        new Base32IdGenerator(),
      ),
      identifyProduct: new IdentifyProduct(productRepository),
    },
    movements: {
      registerMovement: new RegisterMovement(
        new PrismaMovementRepository(prisma),
      ),
    },
    inventory: {
      listInventory: new ListInventory(inventoryQueries),
      getProduct: new GetProduct(inventoryQueries),
      getMovementHistory: new GetMovementHistory(inventoryQueries),
    },
  };
}
