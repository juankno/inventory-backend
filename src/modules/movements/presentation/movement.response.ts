import type { Movement } from "../domain/models/movement.model.ts";

export type MovementResponse = Omit<
  Movement,
  "userId" | "idempotencyKey" | "unitPrice" | "revertsMovementId"
>;

export const toMovementResponse = (movement: Movement): MovementResponse => {
  return {
    id: movement.id,
    productId: movement.productId,
    type: movement.type,
    reason: movement.reason,
    quantity: movement.quantity,
    resultingStock: movement.resultingStock,
    createdAt: movement.createdAt,
  };
};
