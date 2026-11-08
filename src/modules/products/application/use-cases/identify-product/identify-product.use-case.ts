import { AppError } from "../../../../../shared/errors/app-error.ts";
import type { Product } from "../../../domain/models/product.model.ts";
import { classifyCode } from "../../../domain/rules/gtin.ts";
import type { ProductRepository } from "../../ports/product.repository.ts";

export interface IdentifyProductInput {
  businessId: string;
  code: string;
}

export class IdentifyProduct {
  constructor(private readonly productRepository: ProductRepository) {}

  async execute(data: IdentifyProductInput): Promise<Product> {
    const codeType = classifyCode(data.code);
    if (codeType === "UNKNOWN") throw new AppError("CODE_NOT_RECOGNIZED");

    const product = await this.productRepository.findActiveByCode(
      data.businessId,
      data.code,
    );

    if (!product) throw new AppError("CODE_NOT_RECOGNIZED");

    return product;
  }
}
