import { Router } from "express";

import { validate } from "../../../shared/validation/validate.ts";
import { codeParamsSchema } from "../../products/presentation/products.schemas.ts";
import type { SuggestProduct } from "../application/use-cases/suggest-product/suggest-product.use-case.ts";

export type CatalogUseCases = {
  suggestProduct: SuggestProduct;
};

export const catalogRouter = ({ suggestProduct }: CatalogUseCases): Router => {
  const router = Router();

  router.get("/:code", async (req, res) => {
    const { code } = validate(codeParamsSchema, req.params);
    const { businessId } = res.locals.auth;
    const suggestion = await suggestProduct.execute({ businessId, code });
    res.status(200).json(suggestion);
  });

  return router;
};
