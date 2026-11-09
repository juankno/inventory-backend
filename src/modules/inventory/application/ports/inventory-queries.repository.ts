import type { HistoryMovement } from "../../domain/models/history-movement.model.ts";
import type {
  DeletedProduct,
  InventoryProduct,
} from "../../domain/models/inventory-product.model.ts";

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
  /** Del eliminado más reciente al más antiguo; con code, solo el de ese código. */
  listDeletedProducts(
    businessId: string,
    code?: string,
  ): Promise<DeletedProduct[]>;
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
