import z from "zod";

import { isAllowedProductImageUrl } from "../../../shared/domain/product-image.ts";
import { MAX_DECIMAL_12_2 } from "../../../shared/validation/schemas.ts";

const amount = z.number().min(0).max(MAX_DECIMAL_12_2);

const name = z.string().trim().min(2).max(80);

const unit = z.enum(["UNIT", "KILOGRAM", "GRAM", "POUND", "LITER"]);

/** Solo fotos de Open Food Facts u Open Beauty Facts (ver shared/domain/product-image). */
const imageUrl = z.string().trim().refine(isAllowedProductImageUrl);

export const createProductSchema = z.strictObject({
  name,
  unit,
  stock: amount,
  salePrice: amount.optional(),
  costPrice: amount.optional(),
  minStock: amount.optional(),
  code: z.string().trim().min(1).max(32).optional(),
  imageUrl: imageUrl.optional(),
  imageLargeUrl: imageUrl.optional(),
});

export const codeParamsSchema = z.strictObject({
  code: z.string().trim().min(1).max(32),
});

export const updateProductSchema = z
  .strictObject({
    name: name.optional(),
    unit: unit.optional(),
    salePrice: amount.nullable().optional(),
    costPrice: amount.nullable().optional(),
    minStock: amount.nullable().optional(),
  })
  .refine((changes) => Object.keys(changes).length > 0);
