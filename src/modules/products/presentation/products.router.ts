import { Router } from "express";

import { validate } from "../../../shared/validation/validate.ts";
import type { CreateProduct } from "../application/use-cases/create-product/create-product.use-case.ts";
import type { DeactivateProduct } from "../application/use-cases/deactivate-product/deactivate-product.use-case.ts";
import type { IdentifyProduct } from "../application/use-cases/identify-product/identify-product.use-case.ts";
import type { UpdateProduct } from "../application/use-cases/update-product/update-product.use-case.ts";
import { toProductResponse } from "./product.response.ts";
import {
  codeParamsSchema,
  createProductSchema,
  productIdParamsSchema,
  updateProductSchema,
} from "./products.schemas.ts";

export type ProductsUseCases = {
  createProduct: CreateProduct;
  identifyProduct: IdentifyProduct;
  updateProduct: UpdateProduct;
  deactivateProduct: DeactivateProduct;
};

export const productsRouter = ({
  createProduct,
  identifyProduct,
  updateProduct,
  deactivateProduct,
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

  router.patch("/:id", async (req, res) => {
    const { id } = validate(productIdParamsSchema, req.params);
    const changes = validate(updateProductSchema, req.body);
    const { businessId } = res.locals.auth;
    const product = await updateProduct.execute({
      businessId,
      productId: id,
      changes,
    });
    res.status(200).json(toProductResponse(product));
  });

  router.delete("/:id", async (req, res) => {
    const { id } = validate(productIdParamsSchema, req.params);
    const { businessId } = res.locals.auth;
    await deactivateProduct.execute({ businessId, productId: id });
    res.status(204).end();
  });

  return router;
};
