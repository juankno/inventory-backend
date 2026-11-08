import { AppError } from "../../../../../shared/errors/app-error.ts";
import type {
  InventoryQueries,
  MovementPage,
} from "../../ports/inventory-queries.repository.ts";

export const HISTORY_PAGE_SIZE = 50;

export interface GetMovementHistoryInput {
  businessId: string;
  productId: string;
  cursor?: string;
}

export class GetMovementHistory {
  constructor(private readonly inventoryQueries: InventoryQueries) {}

  async execute(data: GetMovementHistoryInput): Promise<MovementPage> {
    const product = await this.inventoryQueries.findActiveProduct(
      data.businessId,
      data.productId,
    );
    if (!product) throw new AppError("PRODUCT_NOT_FOUND");

    return this.inventoryQueries.listMovements(data.businessId, data.productId, {
      limit: HISTORY_PAGE_SIZE,
      cursor: data.cursor,
    });
  }
}
