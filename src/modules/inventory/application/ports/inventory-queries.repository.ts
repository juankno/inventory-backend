import type { HistoryMovement } from "../../domain/models/history-movement.model.ts";
import type { InventoryProduct } from "../../domain/models/inventory-product.model.ts";

export interface PageRequest {
  limit: number;
  cursor?: string;
}

export interface MovementPage {
  items: HistoryMovement[];
  nextCursor: string | null;
}

export interface InventoryQueries {
  listProducts(businessId: string, search?: string): Promise<InventoryProduct[]>;
  findActiveProduct(
    businessId: string,
    productId: string,
  ): Promise<InventoryProduct | null>;
  listMovements(
    businessId: string,
    productId: string,
    page: PageRequest,
  ): Promise<MovementPage>;
}
