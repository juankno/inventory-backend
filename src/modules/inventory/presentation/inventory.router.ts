import { Router } from "express";

import { validate } from "../../../shared/validation/validate.ts";
import type { GetLowStockAlerts } from "../application/use-cases/get-low-stock-alerts/get-low-stock-alerts.use-case.ts";
import type { GetMovementHistory } from "../application/use-cases/get-movement-history/get-movement-history.use-case.ts";
import type { GetProduct } from "../application/use-cases/get-product/get-product.use-case.ts";
import type { ListInventory } from "../application/use-cases/list-inventory/list-inventory.use-case.ts";
import {
  listInventoryQuerySchema,
  movementHistoryQuerySchema,
  productIdParamsSchema,
} from "./inventory.schemas.ts";

export type InventoryUseCases = {
  listInventory: ListInventory;
  getProduct: GetProduct;
  getMovementHistory: GetMovementHistory;
  getLowStockAlerts: GetLowStockAlerts;
};

export const inventoryRouter = ({
  listInventory,
  getProduct,
  getMovementHistory,
  getLowStockAlerts,
}: InventoryUseCases): Router => {
  const router = Router();

  router.get("/", async (req, res) => {
    const { search } = validate(listInventoryQuerySchema, req.query);
    const { businessId } = res.locals.auth;
    res.status(200).json(await listInventory.execute({ businessId, search }));
  });

  router.get("/low-stock", async (_req, res) => {
    const { businessId } = res.locals.auth;
    res.status(200).json(await getLowStockAlerts.execute({ businessId }));
  });

  router.get("/:id", async (req, res) => {
    const { id } = validate(productIdParamsSchema, req.params);
    const { businessId } = res.locals.auth;
    res.status(200).json(await getProduct.execute({ businessId, productId: id }));
  });

  router.get("/:id/movements", async (req, res) => {
    const { id } = validate(productIdParamsSchema, req.params);
    const { cursor, limit } = validate(movementHistoryQuerySchema, req.query);
    const { businessId } = res.locals.auth;
    res
      .status(200)
      .json(
        await getMovementHistory.execute({
          businessId,
          productId: id,
          cursor,
          limit,
        }),
      );
  });

  return router;
};
