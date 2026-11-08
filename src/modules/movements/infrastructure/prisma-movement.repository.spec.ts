import { jest } from "@jest/globals";

import { Prisma, type PrismaClient } from "../../../generated/prisma/client.ts";
import { AppError } from "../../../shared/errors/app-error.ts";
import type { NewMovement } from "../application/ports/movement.repository.ts";
import { PrismaMovementRepository } from "./prisma-movement.repository.ts";

type AsyncMock = ReturnType<typeof jest.fn<(args: unknown) => Promise<unknown>>>;

const PRODUCT_ID = "3f1c2b9e-8a4d-4c1e-9b7a-2d5e6f708192";
const KEY = "a1b2c3d4-0000-4000-8000-000000000001";
const createdAt = new Date("2026-11-08T12:00:00Z");

const newMovement: NewMovement = {
  businessId: "business-1",
  productId: PRODUCT_ID,
  userId: "user-1",
  type: "OUTBOUND",
  reason: "SALE",
  quantity: 4,
  resultingStock: 6,
  idempotencyKey: KEY,
  expectedStock: 10,
};

const movementRow = {
  id: "movement-1",
  productId: PRODUCT_ID,
  userId: "user-1",
  type: "OUTBOUND",
  reason: "SALE",
  quantity: new Prisma.Decimal("4.00"),
  resultingStock: new Prisma.Decimal("6.00"),
  idempotencyKey: KEY,
  createdAt,
};

function setup() {
  const findFirst: AsyncMock = jest.fn();
  const updateMany: AsyncMock = jest.fn();
  const findUnique: AsyncMock = jest.fn();
  const create: AsyncMock = jest.fn();
  const client = {
    product: { findFirst, updateMany },
    movement: { findUnique, create },
    $transaction: (operations: (tx: unknown) => Promise<unknown>) =>
      operations(client),
  };
  const repository = new PrismaMovementRepository(
    client as unknown as PrismaClient,
  );
  return { findFirst, updateMany, findUnique, create, repository };
}

function uniqueViolation() {
  return new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
    code: "P2002",
    clientVersion: Prisma.prismaVersion.client,
  });
}

describe("PrismaMovementRepository", () => {
  describe("findActiveProduct", () => {
    it("should look for an active product of the business only", async () => {
      const { findFirst, repository } = setup();
      findFirst.mockResolvedValue(null);

      await repository.findActiveProduct("business-1", PRODUCT_ID);

      expect(findFirst).toHaveBeenCalledWith({
        where: { id: PRODUCT_ID, businessId: "business-1", isActive: true },
        select: { unit: true, stock: true },
      });
    });

    it("should map the stock to a number", async () => {
      const { findFirst, repository } = setup();
      findFirst.mockResolvedValue({ unit: "KILOGRAM", stock: new Prisma.Decimal("2.50") });

      const product = await repository.findActiveProduct("business-1", PRODUCT_ID);

      expect(product).toEqual({ unit: "KILOGRAM", stock: 2.5 });
    });

    it("should return null when the product is missing, inactive or from another business", async () => {
      const { findFirst, repository } = setup();
      findFirst.mockResolvedValue(null);

      const product = await repository.findActiveProduct("business-2", PRODUCT_ID);

      expect(product).toBeNull();
    });
  });

  describe("findByIdempotencyKey", () => {
    it("should return the movement with the business of its product", async () => {
      const { findUnique, repository } = setup();
      findUnique.mockResolvedValue({ ...movementRow, product: { businessId: "business-1" } });

      const stored = await repository.findByIdempotencyKey(KEY);

      expect(stored).toEqual({
        businessId: "business-1",
        movement: {
          id: "movement-1",
          productId: PRODUCT_ID,
          userId: "user-1",
          type: "OUTBOUND",
          reason: "SALE",
          quantity: 4,
          resultingStock: 6,
          idempotencyKey: KEY,
          createdAt,
        },
      });
    });

    it("should return null when the key was never used", async () => {
      const { findUnique, repository } = setup();
      findUnique.mockResolvedValue(null);

      const stored = await repository.findByIdempotencyKey(KEY);

      expect(stored).toBeNull();
    });
  });

  describe("record", () => {
    it("should update the stock only if it still has the expected value", async () => {
      const { updateMany, create, repository } = setup();
      updateMany.mockResolvedValue({ count: 1 });
      create.mockResolvedValue(movementRow);

      await repository.record(newMovement);

      expect(updateMany).toHaveBeenCalledWith({
        where: { id: PRODUCT_ID, businessId: "business-1", isActive: true, stock: 10 },
        data: { stock: 6 },
      });
    });

    it("should create the movement without the businessId and expectedStock fields", async () => {
      const { updateMany, create, repository } = setup();
      updateMany.mockResolvedValue({ count: 1 });
      create.mockResolvedValue(movementRow);

      const movement = await repository.record(newMovement);

      expect(create).toHaveBeenCalledWith({
        data: {
          productId: PRODUCT_ID,
          userId: "user-1",
          type: "OUTBOUND",
          reason: "SALE",
          quantity: 4,
          resultingStock: 6,
          idempotencyKey: KEY,
        },
        select: expect.objectContaining({ id: true, resultingStock: true }),
      });
      expect(movement).toMatchObject({ id: "movement-1", quantity: 4, resultingStock: 6 });
    });

    it("should return null without creating the movement when the stock changed", async () => {
      const { updateMany, create, repository } = setup();
      updateMany.mockResolvedValue({ count: 0 });

      const movement = await repository.record(newMovement);

      expect(movement).toBeNull();
      expect(create).not.toHaveBeenCalled();
    });

    it("should reject with IDEMPOTENCY_KEY_CONFLICT when the key already exists", async () => {
      const { updateMany, create, repository } = setup();
      updateMany.mockResolvedValue({ count: 1 });
      create.mockRejectedValue(uniqueViolation());

      const recording = repository.record(newMovement);

      await expect(recording).rejects.toBeInstanceOf(AppError);
      await expect(recording).rejects.toMatchObject({ code: "IDEMPOTENCY_KEY_CONFLICT" });
    });

    it("should rethrow any other error unchanged", async () => {
      const { updateMany, repository } = setup();
      const connectionError = new Error("connection refused");
      updateMany.mockRejectedValue(connectionError);

      const recording = repository.record(newMovement);

      await expect(recording).rejects.toBe(connectionError);
    });
  });
});
