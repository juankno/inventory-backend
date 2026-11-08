import type { Product } from "../../domain/models/product.model.ts";

export interface ProductData extends Omit<
  Product,
  "id" | "isActive" | "createdAt" | "updatedAt"
> {
  createdBy: string;
}

export interface ProductRepository {
  create(productData: ProductData): Promise<Product>;
  findActiveByCode(businessId: string, code: string): Promise<Product | null>;
}
