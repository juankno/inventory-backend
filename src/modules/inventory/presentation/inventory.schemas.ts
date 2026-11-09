import z from "zod";

export const productIdParamsSchema = z.strictObject({
  id: z.uuid(),
});

export const listInventoryQuerySchema = z.strictObject({
  search: z.string().trim().max(80).optional(),
});

export const movementHistoryQuerySchema = z.strictObject({
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});
