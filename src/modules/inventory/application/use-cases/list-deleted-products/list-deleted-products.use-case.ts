import type { DeletedProduct } from "../../../domain/models/inventory-product.model.ts";
import type { InventoryQueries } from "../../ports/inventory-queries.repository.ts";

export interface ListDeletedProductsInput {
  businessId: string;
  code?: string;
}

export class ListDeletedProducts {
  constructor(private readonly inventoryQueries: InventoryQueries) {}

  async execute(data: ListDeletedProductsInput): Promise<DeletedProduct[]> {
    return this.inventoryQueries.listDeletedProducts(data.businessId, data.code);
  }
}
