import z from "zod";

import { MAX_DECIMAL_12_2 } from "../../../shared/validation/schemas.ts";

export const registerMovementSchema = z.strictObject({
  productId: z.uuid(),
  type: z.enum(["INBOUND", "OUTBOUND", "ADJUSTMENT"]),
  quantity: z.number().min(0).max(MAX_DECIMAL_12_2),
  reason: z.enum(["SALE", "CONSUMPTION", "LOSS"]).optional(),
  idempotencyKey: z.uuid(),
  revertsMovementId: z.uuid().optional(),
});
