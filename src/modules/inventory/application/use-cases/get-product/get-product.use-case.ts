import { AppError } from "../../../../../shared/errors/app-error.ts";
import type { InventoryProductWithStatus } from "../../../domain/models/inventory-product.model.ts";
import { withStockStatus } from "../../../domain/rules/stock-status.ts";
import type { InventoryQueries } from "../../ports/inventory-queries.repository.ts";

export interface GetProductInput {
  businessId: string;
  productId: string;
}

export class GetProduct {
  constructor(private readonly inventoryQueries: InventoryQueries) {}

  async execute(data: GetProductInput): Promise<InventoryProductWithStatus> {
    const product = await this.inventoryQueries.findActiveProduct(
      data.businessId,
      data.productId,
    );
    if (!product) throw new AppError("PRODUCT_NOT_FOUND");
    return withStockStatus(product);
  }
}
