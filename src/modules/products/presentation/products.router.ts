import { Router } from "express";

import { validate } from "../../../shared/validation/validate.ts";
import type { CreateProduct } from "../application/use-cases/create-product/create-product.use-case.ts";
import type { IdentifyProduct } from "../application/use-cases/identify-product/identify-product.use-case.ts";
import { toProductResponse } from "./product.response.ts";
import { codeParamsSchema, createProductSchema } from "./products.schemas.ts";

export type ProductsUseCases = {
  createProduct: CreateProduct;
  identifyProduct: IdentifyProduct;
};

export const productsRouter = ({
  createProduct,
  identifyProduct,
}: ProductsUseCases): Router => {
  const router = Router();

  router.post("/", async (req, res) => {
    const body = validate(createProductSchema, req.body);
    const { userId, businessId } = res.locals.auth;
    const product = await createProduct.execute({
      ...body,
      businessId,
      userId,
    });
    res.status(201).json(toProductResponse(product));
  });

  router.get("/code/:code", async (req, res) => {
    const { code } = validate(codeParamsSchema, req.params);
    const { businessId } = res.locals.auth;
    const product = await identifyProduct.execute({
      businessId,
      code,
    });
    res.status(200).json(toProductResponse(product));
  });

  return router;
};
