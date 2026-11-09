import cors from "cors";
import express, { Router, type RequestHandler } from "express";

import {
  authRouter,
  type AuthUseCases,
} from "./modules/auth/presentation/auth.router.ts";
import {
  inventoryRouter,
  type InventoryUseCases,
} from "./modules/inventory/presentation/inventory.router.ts";
import {
  movementsRouter,
  type MovementsUseCases,
} from "./modules/movements/presentation/movements.router.ts";
import {
  productsRouter,
  type ProductsUseCases,
} from "./modules/products/presentation/products.router.ts";
import {
  reportsRouter,
  type ReportsUseCases,
} from "./modules/reports/presentation/reports.router.ts";
import { docsRouter } from "./shared/docs/docs.router.ts";
import {
  errorHandler,
  notFoundHandler,
} from "./shared/errors/error-handler.middleware.ts";

export type AppDependencies = {
  requireAuth: RequestHandler;
  auth: AuthUseCases;
  products: ProductsUseCases;
  movements: MovementsUseCases;
  inventory: InventoryUseCases;
  reports: ReportsUseCases;
};

export function createApp(deps: AppDependencies) {
  const app = express();
  app.disable("x-powered-by");
  app.use(cors());
  app.use(express.json());

  const api = Router();
  api.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });
  api.use("/auth", authRouter(deps.auth));
  api.use(
    "/products",
    deps.requireAuth,
    productsRouter(deps.products),
    inventoryRouter(deps.inventory),
  );
  api.use("/movements", deps.requireAuth, movementsRouter(deps.movements));
  api.use("/reports", deps.requireAuth, reportsRouter(deps.reports));
  api.use(docsRouter());

  app.use("/api/v1", api);
  // La URL corta lleva a la documentación, que vive con la versión de la API.
  app.get("/", (_req, res) => {
    res.redirect("/api/v1/docs");
  });
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
