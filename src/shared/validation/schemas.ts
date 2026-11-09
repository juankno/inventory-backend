import z from "zod";

/** El mayor valor de las columnas Decimal(12, 2). */
export const MAX_DECIMAL_12_2 = 9_999_999_999.99;

export const productIdParamsSchema = z.strictObject({
  id: z.uuid(),
});
