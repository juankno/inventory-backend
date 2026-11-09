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
  const findUnique = jest.fn<(args: unknown) => Promise<unknown>>();
  const findFirst = jest.fn<(args: unknown) => Promise<unknown>>();
  const update = jest.fn<(args: unknown) => Promise<unknown>>();
  const updateMany = jest.fn<(args: unknown) => Promise<unknown>>();
  const prisma = {
    product: { create, findUnique, findFirst, update, updateMany },
  } as unknown as PrismaClient;
  return {
    create,
    findUnique,
    findFirst,
    update,
    updateMany,
    repository: new PrismaProductRepository(prisma),
  };
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
      create.mockResolvedValue({
        ...createdRow,
        salePrice: null,
        minStock: null,
      });

      const product = await repository.create({
        ...productData,
        salePrice: null,
        minStock: null,
      });

      expect(product.salePrice).toBeNull();
      expect(product.minStock).toBeNull();
    });

    it("should reject with CODE_OF_DELETED_PRODUCT when the code belongs to a deleted product", async () => {
      const { create, findUnique, repository } = setup();
      create.mockRejectedValue(uniqueViolation());
      findUnique.mockResolvedValue({ isActive: false });

      await expect(repository.create(productData)).rejects.toMatchObject({
        code: "CODE_OF_DELETED_PRODUCT",
      });
    });

    it("should reject with CODE_ALREADY_REGISTERED when the code exists in the business", async () => {
      const { create, findUnique, repository } = setup();
      create.mockRejectedValue(uniqueViolation());
      findUnique.mockResolvedValue({ isActive: true });

      const creation = repository.create(productData);

      await expect(creation).rejects.toBeInstanceOf(AppError);
      await expect(creation).rejects.toMatchObject({
        code: "CODE_ALREADY_REGISTERED",
      });
    });

    it("should rethrow any other error unchanged", async () => {
      const { create, repository } = setup();
      const connectionError = new Error("connection refused");
      create.mockRejectedValue(connectionError);

      const creation = repository.create(productData);

      await expect(creation).rejects.toBe(connectionError);
    });
  });

  describe("findActiveByCode", () => {
    it("should search only active products by the business and code unique key", async () => {
      const { findUnique, repository } = setup();
      findUnique.mockResolvedValue(createdRow);

      await repository.findActiveByCode("business-1", "7702004003508");

      expect(findUnique).toHaveBeenCalledWith({
        where: {
          businessId_code: { businessId: "business-1", code: "7702004003508" },
          isActive: true,
        },
        select: expect.objectContaining({ id: true, stock: true }),
      });
    });

    it("should return the product with its decimals mapped to numbers when an active product matches", async () => {
      const { findUnique, repository } = setup();
      findUnique.mockResolvedValue({
        ...createdRow,
        stock: new Prisma.Decimal("12.50"),
        salePrice: null,
      });

      const product = await repository.findActiveByCode(
        "business-1",
        "7702004003508",
      );

      expect(product).toEqual({
        id: "product-1",
        businessId: "business-1",
        name: "Arroz Diana 500 g",
        unit: "UNIT",
        salePrice: null,
        stock: 12.5,
        minStock: 6,
        codeType: "GTIN",
        code: "7702004003508",
        isActive: true,
        createdAt,
        updatedAt: createdAt,
      });
    });

    it("should return null when no active product matches the code in the business", async () => {
      const { findUnique, repository } = setup();
      findUnique.mockResolvedValue(null);

      const product = await repository.findActiveByCode(
        "business-2",
        "7702004003508",
      );

      expect(product).toBeNull();
    });
  });

  describe("findActiveById", () => {
    it("should look for an active product of the business only", async () => {
      const { findFirst, repository } = setup();
      findFirst.mockResolvedValue(null);

      const product = await repository.findActiveById("business-1", "product-1");

      expect(product).toBeNull();
      expect(findFirst).toHaveBeenCalledWith({
        where: { id: "product-1", businessId: "business-1", isActive: true },
        select: expect.objectContaining({ id: true, stock: true }),
      });
    });
  });

  describe("update", () => {
    it("should update only an active product of the business with the sent changes", async () => {
      const { update, repository } = setup();
      update.mockResolvedValue({ ...createdRow, name: "Arroz Roa 1 kg" });

      const product = await repository.update("business-1", "product-1", {
        name: "Arroz Roa 1 kg",
        salePrice: null,
      });

      expect(product?.name).toBe("Arroz Roa 1 kg");
      expect(update).toHaveBeenCalledWith({
        where: { id: "product-1", businessId: "business-1", isActive: true },
        data: { name: "Arroz Roa 1 kg", salePrice: null },
        select: expect.objectContaining({ id: true, stock: true }),
      });
    });

    it("should return null when no active product of the business matches", async () => {
      const { update, repository } = setup();
      update.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError("Record not found", {
          code: "P2025",
          clientVersion: Prisma.prismaVersion.client,
        }),
      );

      const product = await repository.update("business-2", "product-1", { name: "Otro" });

      expect(product).toBeNull();
    });

    it("should rethrow any other error unchanged", async () => {
      const { update, repository } = setup();
      const connectionError = new Error("connection refused");
      update.mockRejectedValue(connectionError);

      const updating = repository.update("business-1", "product-1", { name: "Otro" });

      await expect(updating).rejects.toBe(connectionError);
    });
  });

  describe("deactivate", () => {
    it("should mark as inactive only an active product of the business", async () => {
      const { updateMany, repository } = setup();
      updateMany.mockResolvedValue({ count: 1 });

      const isDeactivated = await repository.deactivate("business-1", "product-1");

      expect(isDeactivated).toBe(true);
      expect(updateMany).toHaveBeenCalledWith({
        where: { id: "product-1", businessId: "business-1", isActive: true },
        data: { isActive: false, deletedAt: expect.any(Date) },
      });
    });

    it("should return false when the product is missing, inactive or from another business", async () => {
      const { updateMany, repository } = setup();
      updateMany.mockResolvedValue({ count: 0 });

      const isDeactivated = await repository.deactivate("business-2", "product-1");

      expect(isDeactivated).toBe(false);
    });
  });

  describe("restore", () => {
    it("should reactivate only an inactive product of the business and return it", async () => {
      const { updateMany, findFirst, repository } = setup();
      updateMany.mockResolvedValue({ count: 1 });
      findFirst.mockResolvedValue(createdRow);

      const product = await repository.restore("business-1", "product-1");

      expect(updateMany).toHaveBeenCalledWith({
        where: { id: "product-1", businessId: "business-1", isActive: false },
        data: { isActive: true, deletedAt: null },
      });
      expect(product?.id).toBe("product-1");
    });

    it("should return null when the product does not exist in the business", async () => {
      const { updateMany, findFirst, repository } = setup();
      updateMany.mockResolvedValue({ count: 0 });
      findFirst.mockResolvedValue(null);

      expect(await repository.restore("business-2", "product-1")).toBeNull();
    });
  });
});
