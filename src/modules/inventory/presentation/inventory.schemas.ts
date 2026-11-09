import z from "zod";

export const listInventoryQuerySchema = z.strictObject({
  search: z.string().trim().max(80).optional(),
});

export const deletedProductsQuerySchema = z.strictObject({
  code: z.string().trim().min(1).max(32).optional(),
});

export const movementHistoryQuerySchema = z.strictObject({
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});
