import cors from "cors";
import express, { Router } from "express";

import {
  authRouter,
  type AuthUseCases,
} from "./modules/auth/presentation/auth.router.ts";
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
  api.use("/auth", authRouter(deps.auth));

  app.use("/api/v1", api);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
