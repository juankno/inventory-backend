import type { Product } from "../../domain/models/product.model.ts";

export interface ProductData extends Omit<
  Product,
  "id" | "isActive" | "createdAt" | "updatedAt"
> {
  createdBy: string;
}

export type ProductChanges = Partial<
  Pick<Product, "name" | "unit" | "salePrice" | "minStock">
>;

export interface ProductRepository {
  create(productData: ProductData): Promise<Product>;
  findActiveByCode(businessId: string, code: string): Promise<Product | null>;
  findActiveById(businessId: string, productId: string): Promise<Product | null>;
  update(
    businessId: string,
    productId: string,
    changes: ProductChanges,
  ): Promise<Product | null>;
  deactivate(businessId: string, productId: string): Promise<boolean>;
  /** Devuelve el producto activo después de restaurarlo, o null si no existe. */
  restore(businessId: string, productId: string): Promise<Product | null>;
}
