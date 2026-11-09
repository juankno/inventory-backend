import z from "zod";

const MAX_DECIMAL_12_2 = 9_999_999_999.99;

export const registerMovementSchema = z.strictObject({
  productId: z.uuid(),
  type: z.enum(["INBOUND", "OUTBOUND", "ADJUSTMENT"]),
  quantity: z.number().min(0).max(MAX_DECIMAL_12_2),
  reason: z.enum(["SALE", "CONSUMPTION", "LOSS"]).optional(),
  idempotencyKey: z.uuid(),
  revertsMovementId: z.uuid().optional(),
});
