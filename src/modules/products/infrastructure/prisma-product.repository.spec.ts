import { jest } from "@jest/globals";

import { Prisma, type PrismaClient } from "../../../generated/prisma/client.ts";
import { AppError } from "../../../shared/errors/app-error.ts";
import type { ProductData } from "../application/ports/product.repository.ts";
import { PrismaProductRepository } from "./prisma-product.repository.ts";

const productData: ProductData = {
  businessId: "business-1",
  createdBy: "user-1",
  name: "Arroz Diana 500 g",
  unit: "UNIT",
  stock: 24,
  salePrice: 3500,
  minStock: 6,
  codeType: "GTIN",
  code: "7702004003508",
};

const createdAt = new Date("2026-11-08T12:00:00Z");

const createdRow = {
  id: "product-1",
  businessId: "business-1",
  name: "Arroz Diana 500 g",
  unit: "UNIT",
  salePrice: new Prisma.Decimal("3500.00"),
  stock: new Prisma.Decimal("24.00"),
  minStock: new Prisma.Decimal("6.00"),
  codeType: "GTIN",
  code: "7702004003508",
  isActive: true,
  createdAt,
  updatedAt: createdAt,
};

type CreateArgs = { data: Record<string, unknown> };

function setup() {
  const create = jest.fn<(args: CreateArgs) => Promise<unknown>>();
  const prisma = { product: { create } } as unknown as PrismaClient;
  return { create, repository: new PrismaProductRepository(prisma) };
}

function uniqueViolation() {
  return new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
    code: "P2002",
    clientVersion: Prisma.prismaVersion.client,
  });
}

describe("PrismaProductRepository", () => {
  describe("create", () => {
    it("should create the product with an INBOUND movement for the initial stock", async () => {
      const { create, repository } = setup();
      create.mockResolvedValue(createdRow);

      await repository.create(productData);

      expect(create).toHaveBeenCalledWith({
        data: {
          businessId: "business-1",
          name: "Arroz Diana 500 g",
          unit: "UNIT",
          salePrice: 3500,
          stock: 24,
          minStock: 6,
          codeType: "GTIN",
          code: "7702004003508",
          movements: {
            create: {
              userId: "user-1",
              type: "INBOUND",
              quantity: 24,
              resultingStock: 24,
              idempotencyKey: expect.stringMatching(
                /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
              ),
            },
          },
        },
        select: expect.objectContaining({ id: true, stock: true }),
      });
    });

    it("should not create a movement when the initial stock is zero", async () => {
      const { create, repository } = setup();
      create.mockResolvedValue({ ...createdRow, stock: new Prisma.Decimal(0) });

      await repository.create({ ...productData, stock: 0 });

      const args = create.mock.calls[0]?.[0];
      expect(args?.data).not.toHaveProperty("movements");
    });

    it("should not send the createdBy field as a product column", async () => {
      const { create, repository } = setup();
      create.mockResolvedValue(createdRow);

      await repository.create(productData);

      const args = create.mock.calls[0]?.[0];
      expect(args?.data).not.toHaveProperty("createdBy");
    });

    it("should map the decimals of the created row to numbers", async () => {
      const { create, repository } = setup();
      create.mockResolvedValue({
        ...createdRow,
        unit: "KILOGRAM",
        stock: new Prisma.Decimal("12.50"),
        salePrice: new Prisma.Decimal("4200.75"),
      });

      const product = await repository.create(productData);

      expect(product.stock).toBe(12.5);
      expect(product.salePrice).toBe(4200.75);
      expect(product.minStock).toBe(6);
    });

    it("should map missing salePrice and minStock to null", async () => {
      const { create, repository } = setup();
      create.mockResolvedValue({ ...createdRow, salePrice: null, minStock: null });

      const product = await repository.create({
        ...productData,
        salePrice: null,
        minStock: null,
      });

      expect(product.salePrice).toBeNull();
      expect(product.minStock).toBeNull();
    });

    it("should reject with CODE_ALREADY_REGISTERED when the code exists in the business", async () => {
      const { create, repository } = setup();
      create.mockRejectedValue(uniqueViolation());

      const creation = repository.create(productData);

      await expect(creation).rejects.toBeInstanceOf(AppError);
      await expect(creation).rejects.toMatchObject({ code: "CODE_ALREADY_REGISTERED" });
    });

    it("should rethrow any other error unchanged", async () => {
      const { create, repository } = setup();
      const connectionError = new Error("connection refused");
      create.mockRejectedValue(connectionError);

      const creation = repository.create(productData);

      await expect(creation).rejects.toBe(connectionError);
    });
  });
});
