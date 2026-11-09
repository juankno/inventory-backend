import z from "zod";

import { MAX_DECIMAL_12_2 } from "../../../shared/validation/schemas.ts";

const amount = z.number().min(0).max(MAX_DECIMAL_12_2);

const name = z.string().trim().min(2).max(80);

const unit = z.enum(["UNIT", "KILOGRAM", "GRAM", "POUND", "LITER"]);

export const createProductSchema = z.strictObject({
  name,
  unit,
  stock: amount,
  salePrice: amount.optional(),
  minStock: amount.optional(),
  code: z.string().trim().min(1).max(32).optional(),
});

export const codeParamsSchema = z.strictObject({
  code: z.string().trim().min(1).max(32),
});

export const updateProductSchema = z
  .strictObject({
    name: name.optional(),
    unit: unit.optional(),
    salePrice: amount.nullable().optional(),
    minStock: amount.nullable().optional(),
  })
  .refine((changes) => Object.keys(changes).length > 0);
