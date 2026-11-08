import z from "zod";

const MAX_DECIMAL_12_2 = 9_999_999_999.99;

const amount = z.number().min(0).max(MAX_DECIMAL_12_2);

export const createProductSchema = z.strictObject({
  name: z.string().trim().min(2).max(80),
  unit: z.enum(["UNIT", "KILOGRAM", "GRAM", "POUND", "LITER"]),
  stock: amount,
  salePrice: amount.optional(),
  minStock: amount.optional(),
  code: z.string().trim().min(1).max(32).optional(),
});

export const codeParamsSchema = z.strictObject({
  code: z.string().trim().min(1).max(32),
});
