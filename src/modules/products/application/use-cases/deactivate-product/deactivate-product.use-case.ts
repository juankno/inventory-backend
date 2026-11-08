import { AppError } from "../../../../../shared/errors/app-error.ts";
import type { ProductRepository } from "../../ports/product.repository.ts";

export interface DeactivateProductInput {
  businessId: string;
  productId: string;
}

export class DeactivateProduct {
  constructor(private readonly productRepository: ProductRepository) {}

  async execute(data: DeactivateProductInput): Promise<void> {
    const isDeactivated = await this.productRepository.deactivate(
      data.businessId,
      data.productId,
    );
    if (!isDeactivated) throw new AppError("PRODUCT_NOT_FOUND");
  }
}
