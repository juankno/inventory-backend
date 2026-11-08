import type { Product } from "../domain/models/product.model.ts";

export type ProductResponse = Pick<
  Product,
  "id" | "name" | "unit" | "stock" | "salePrice" | "minStock" | "codeType" | "code"
>;

export const toProductResponse = (product: Product): ProductResponse => {
  return {
    id: product.id,
    name: product.name,
    unit: product.unit,
    stock: product.stock,
    salePrice: product.salePrice,
    minStock: product.minStock,
    codeType: product.codeType,
    code: product.code,
  };
};
