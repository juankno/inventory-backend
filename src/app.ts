import cors from "cors";
import express, { Router } from "express";

import type { RegisterAccount } from "./modules/auth/application/use-cases/register-account/register-account.use-case.ts";
import { authRouter } from "./modules/auth/presentation/auth.router.ts";
import { docsRouter } from "./shared/docs/docs.router.ts";
import {
  errorHandler,
  notFoundHandler,
} from "./shared/errors/error-handler.middleware.ts";

export type AppDependencies = {
  registerAccount: RegisterAccount;
};

export function createApp(deps: AppDependencies) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  const api = Router();
  api.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });
  api.use("/auth", authRouter(deps.registerAccount));
  api.use(docsRouter());

  app.use("/api/v1", api);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
