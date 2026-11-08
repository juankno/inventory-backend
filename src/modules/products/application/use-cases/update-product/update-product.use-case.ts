import {
  hasAtMostTwoDecimals,
  isValidStockForUnit,
} from "../../../../../shared/domain/quantity.ts";
import { AppError } from "../../../../../shared/errors/app-error.ts";
import type { Product } from "../../../domain/models/product.model.ts";
import type {
  ProductChanges,
  ProductRepository,
} from "../../ports/product.repository.ts";

export interface UpdateProductInput {
  businessId: string;
  productId: string;
  changes: ProductChanges;
}

export class UpdateProduct {
  constructor(private readonly productRepository: ProductRepository) {}

  async execute(data: UpdateProductInput): Promise<Product> {
    const { salePrice, minStock, unit } = data.changes;
    const amounts = [salePrice, minStock].filter(
      (amount) => amount !== undefined && amount !== null,
    );
    if (!amounts.every(hasAtMostTwoDecimals)) {
      throw new AppError("INVALID_QUANTITY");
    }

    const product = await this.productRepository.findActiveById(
      data.businessId,
      data.productId,
    );
    if (!product) throw new AppError("PRODUCT_NOT_FOUND");
    if (unit !== undefined && !isValidStockForUnit(product.stock, unit)) {
      throw new AppError("INVALID_UNIT_CHANGE");
    }

    const updated = await this.productRepository.update(
      data.businessId,
      data.productId,
      data.changes,
    );
    if (!updated) throw new AppError("PRODUCT_NOT_FOUND");
    return updated;
  }
}
