import type { InventoryProductWithStatus } from "../../../domain/models/inventory-product.model.ts";
import { withStockStatus } from "../../../domain/rules/stock-status.ts";
import type { InventoryQueries } from "../../ports/inventory-queries.repository.ts";

export interface ListInventoryInput {
  businessId: string;
  search?: string;
}

export class ListInventory {
  constructor(private readonly inventoryQueries: InventoryQueries) {}

  async execute(data: ListInventoryInput): Promise<InventoryProductWithStatus[]> {
    const products = await this.inventoryQueries.listProducts(
      data.businessId,
      data.search,
    );
    return products.map(withStockStatus);
  }
}
