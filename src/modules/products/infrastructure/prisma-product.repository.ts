import { randomUUID } from "node:crypto";

import { Prisma, type PrismaClient } from "../../../generated/prisma/client.ts";
import { AppError } from "../../../shared/errors/app-error.ts";
import type {
  ProductData,
  ProductRepository,
} from "../application/ports/product.repository.ts";
import type { Product } from "../domain/models/product.model.ts";

const productSelect = {
  id: true,
  businessId: true,
  name: true,
  unit: true,
  salePrice: true,
  stock: true,
  minStock: true,
  codeType: true,
  code: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ProductSelect;

type ProductRow = Prisma.ProductGetPayload<{ select: typeof productSelect }>;

const toProduct = (row: ProductRow): Product => {
  return {
    id: row.id,
    businessId: row.businessId,
    name: row.name,
    unit: row.unit,
    salePrice: row.salePrice?.toNumber() ?? null,
    stock: row.stock.toNumber(),
    minStock: row.minStock?.toNumber() ?? null,
    codeType: row.codeType,
    code: row.code,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
};

export class PrismaProductRepository implements ProductRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: ProductData): Promise<Product> {
    try {
      const row = await this.prisma.product.create({
        data: {
          businessId: data.businessId,
          name: data.name,
          unit: data.unit,
          salePrice: data.salePrice,
          stock: data.stock,
          minStock: data.minStock,
          codeType: data.codeType,
          code: data.code,
          ...(data.stock > 0 && {
            movements: {
              create: {
                userId: data.createdBy,
                type: "INBOUND",
                quantity: data.stock,
                resultingStock: data.stock,
                idempotencyKey: randomUUID(),
              },
            },
          }),
        },
        select: productSelect,
      });
      return toProduct(row);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new AppError("CODE_ALREADY_REGISTERED");
      }
      throw error;
    }
  }
}
