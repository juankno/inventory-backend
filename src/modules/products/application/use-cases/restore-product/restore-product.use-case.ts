import { AppError } from "../../../../../shared/errors/app-error.ts";
import type { Product } from "../../../domain/models/product.model.ts";
import type { ProductRepository } from "../../ports/product.repository.ts";

export interface RestoreProductInput {
  businessId: string;
  productId: string;
}

/**
 * Devuelve al inventario un producto eliminado, con su existencia y su
 * historial. Restaurar uno que ya está activo no es un error: lo devuelve igual.
 */
export class RestoreProduct {
  constructor(private readonly productRepository: ProductRepository) {}

  async execute(data: RestoreProductInput): Promise<Product> {
    const product = await this.productRepository.restore(
      data.businessId,
      data.productId,
    );
    if (!product) throw new AppError("PRODUCT_NOT_FOUND");
    return product;
  }
}
