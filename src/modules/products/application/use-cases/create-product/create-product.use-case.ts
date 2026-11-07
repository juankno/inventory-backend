import { AppError } from "../../../../../shared/errors/app-error.ts";
import type { Product, Unit } from "../../../domain/models/product.model.ts";
import { classifyCode } from "../../../domain/rules/gtin.ts";
import { isValidQuantity } from "../../../domain/rules/quantity.ts";
import type { IdGenerator } from "../../ports/id-generator.port.ts";
import type { ProductRepository } from "../../ports/product.repository.ts";

export interface CreateProductInput {
  businessId: string;
  name: string;
  unit: Unit;
  stock: number;
  salePrice?: number;
  minStock?: number;
  code?: string;
}

export class CreateProduct {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly idGenerator: IdGenerator,
  ) {}

  async execute(data: CreateProductInput): Promise<Product> {
    if (data.unit === "UNIT" && !isValidQuantity(data.stock)) {
      throw new AppError("VALIDATION_ERROR");
    }

    return this.productRepository.create({
      businessId: data.businessId,
      name: data.name,
      unit: data.unit,
      stock: data.stock,
      salePrice: data.salePrice ?? null,
      minStock: data.minStock ?? null,
      ...this.resolveCode(data.code),
    });
  }

  private resolveCode(code?: string): Pick<Product, "code" | "codeType"> {
    if (!code)
      return { code: this.idGenerator.generate(), codeType: "INTERNAL" };
    if (classifyCode(code) !== "GTIN") throw new AppError("VALIDATION_ERROR");
    return { code, codeType: "GTIN" };
  }
}
