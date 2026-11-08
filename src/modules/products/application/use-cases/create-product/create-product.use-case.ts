import { AppError } from "../../../../../shared/errors/app-error.ts";
import type { Product, Unit } from "../../../domain/models/product.model.ts";
import { isRegistrableGtin } from "../../../domain/rules/gtin.ts";
import {
  hasAtMostTwoDecimals,
  isValidStockForUnit,
} from "../../../domain/rules/quantity.ts";
import type { IdGenerator } from "../../ports/id-generator.port.ts";
import type {
  ProductData,
  ProductRepository,
} from "../../ports/product.repository.ts";

export const MAX_INTERNAL_CODE_ATTEMPTS = 3;

export interface CreateProductInput {
  businessId: string;
  userId: string;
  name: string;
  unit: Unit;
  stock: number;
  salePrice?: number;
  minStock?: number;
  code?: string;
}

type ProductDataWithoutCode = Omit<ProductData, "code" | "codeType">;

export class CreateProduct {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly idGenerator: IdGenerator,
  ) {}

  async execute(data: CreateProductInput): Promise<Product> {
    const optionalAmounts = [data.salePrice, data.minStock].filter(
      (amount) => amount !== undefined,
    );
    if (
      !isValidStockForUnit(data.stock, data.unit) ||
      !optionalAmounts.every(hasAtMostTwoDecimals)
    ) {
      throw new AppError("INVALID_QUANTITY");
    }

    const productData: ProductDataWithoutCode = {
      businessId: data.businessId,
      createdBy: data.userId,
      name: data.name,
      unit: data.unit,
      stock: data.stock,
      salePrice: data.salePrice ?? null,
      minStock: data.minStock ?? null,
    };

    if (data.code === undefined) {
      return this.createWithInternalCode(productData);
    }
    if (!isRegistrableGtin(data.code)) {
      throw new AppError("INVALID_GTIN");
    }
    return this.productRepository.create({
      ...productData,
      code: data.code,
      codeType: "GTIN",
    });
  }

  private async createWithInternalCode(
    productData: ProductDataWithoutCode,
  ): Promise<Product> {
    for (let attempt = 1; attempt <= MAX_INTERNAL_CODE_ATTEMPTS; attempt++) {
      try {
        return await this.productRepository.create({
          ...productData,
          code: this.idGenerator.generate(),
          codeType: "INTERNAL",
        });
      } catch (error) {
        if (!isCodeAlreadyRegistered(error)) throw error;
      }
    }
    throw new Error(
      `No se generó un código interno libre en ${MAX_INTERNAL_CODE_ATTEMPTS} intentos`,
    );
  }
}

const isCodeAlreadyRegistered = (error: unknown): boolean =>
  error instanceof AppError && error.code === "CODE_ALREADY_REGISTERED";
