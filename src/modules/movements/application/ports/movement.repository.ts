import type { Unit } from "../../../../shared/domain/quantity.ts";
import type { Movement } from "../../domain/models/movement.model.ts";

export interface StockedProduct {
  unit: Unit;
  stock: number;
}

export interface StoredMovement {
  businessId: string;
  movement: Movement;
}

export interface NewMovement extends Omit<Movement, "id" | "createdAt"> {
  businessId: string;
  expectedStock: number;
}

export interface MovementRepository {
  findActiveProduct(
    businessId: string,
    productId: string,
  ): Promise<StockedProduct | null>;
  findByIdempotencyKey(idempotencyKey: string): Promise<StoredMovement | null>;
  record(data: NewMovement): Promise<Movement | null>;
}
