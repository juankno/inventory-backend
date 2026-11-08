import { Router } from "express";

import { validate } from "../../../shared/validation/validate.ts";
import type { CreateProduct } from "../application/use-cases/create-product/create-product.use-case.ts";
import { toProductResponse } from "./product.response.ts";
import { createProductSchema } from "./products.schemas.ts";

export type ProductsUseCases = {
  createProduct: CreateProduct;
};

export const productsRouter = ({ createProduct }: ProductsUseCases): Router => {
  const router = Router();

  router.post("/", async (req, res) => {
    const body = validate(createProductSchema, req.body);
    const { userId, businessId } = res.locals.auth;
    const product = await createProduct.execute({ ...body, businessId, userId });
    res.status(201).json(toProductResponse(product));
  });

  return router;
};
