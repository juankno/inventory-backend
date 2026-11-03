import cors from "cors";
import express, { Router } from "express";

import {
  errorHandler,
  notFoundHandler,
} from "./shared/errors/error-handler.middleware.ts";

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  const api = Router();
  api.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/v1", api);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
