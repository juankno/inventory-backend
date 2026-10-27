import cors from "cors";
import express, { Router } from "express";
import helmet from "helmet";

import { errorHandler, notFoundHandler } from "./shared/errors/errorHandler.ts";

// Construye la aplicación Express. Las rutas de cada módulo se montan bajo /api/v1 (G-03).
export function createApp() {
  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(express.json());

  const api = Router();
  api.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });
  // TODO: montar las rutas de auth, products, movements e inventory.

  app.use("/api/v1", api);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
