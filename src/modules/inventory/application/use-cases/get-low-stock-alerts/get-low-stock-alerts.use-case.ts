import type { InventoryProductWithStatus } from "../../../domain/models/inventory-product.model.ts";
import { withStockStatus } from "../../../domain/rules/stock-status.ts";
import type { InventoryQueries } from "../../ports/inventory-queries.repository.ts";

export interface GetLowStockAlertsInput {
  businessId: string;
}

const outOfStockFirst = (
  a: InventoryProductWithStatus,
  b: InventoryProductWithStatus,
): number =>
  Number(b.status === "OUT_OF_STOCK") - Number(a.status === "OUT_OF_STOCK");

export class GetLowStockAlerts {
  constructor(private readonly inventoryQueries: InventoryQueries) {}

  async execute(
    data: GetLowStockAlertsInput,
  ): Promise<InventoryProductWithStatus[]> {
    const products = await this.inventoryQueries.listProducts(data.businessId);
    return products
      .map(withStockStatus)
      .filter((product) => product.status !== "OK")
      .sort(outOfStockFirst);
  }
}
