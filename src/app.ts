import cors from "cors";
import express, { Router } from "express";

<<<<<<< HEAD
import {
  authRouter,
  type AuthUseCases,
} from "./modules/auth/presentation/auth.router.ts";
=======
import type { RegisterAccount } from "./modules/auth/application/use-cases/register-account/register-account.use-case.ts";
import { authRouter } from "./modules/auth/presentation/auth.router.ts";
import { docsRouter } from "./shared/docs/docs.router.ts";
>>>>>>> 7084958bfc54bd1c2e15d15ebb7949e24cf0d934
import {
  errorHandler,
  notFoundHandler,
} from "./shared/errors/error-handler.middleware.ts";

export type AppDependencies = {
  auth: AuthUseCases;
};

export function createApp(deps: AppDependencies) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  const api = Router();
  api.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });
<<<<<<< HEAD
  api.use("/auth", authRouter(deps.auth));
=======
  api.use("/auth", authRouter(deps.registerAccount));
  api.use(docsRouter());
>>>>>>> 7084958bfc54bd1c2e15d15ebb7949e24cf0d934

  app.use("/api/v1", api);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
