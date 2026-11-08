import { jest } from "@jest/globals";

import { Prisma, type PrismaClient } from "../../../generated/prisma/client.ts";
import { PrismaInventoryQueries } from "./prisma-inventory-queries.repository.ts";

type AsyncMock = ReturnType<typeof jest.fn<(args: unknown) => Promise<unknown>>>;

const PRODUCT_ID = "3f1c2b9e-8a4d-4c1e-9b7a-2d5e6f708192";

const productRow = {
  id: PRODUCT_ID,
  name: "Queso campesino",
  unit: "KILOGRAM",
  stock: new Prisma.Decimal("2.50"),
  salePrice: new Prisma.Decimal("22000.00"),
  minStock: null,
  codeType: "INTERNAL",
  code: "INV-7KQ2M9XA4T",
};

const movementRow = (id: string) => ({
  id,
  type: "OUTBOUND",
  reason: "SALE",
  quantity: new Prisma.Decimal("1.25"),
  resultingStock: new Prisma.Decimal("2.50"),
  createdAt: new Date("2026-11-08T12:00:00Z"),
});

function setup() {
  const findMany: AsyncMock = jest.fn();
  const findFirst: AsyncMock = jest.fn();
  const findManyMovements: AsyncMock = jest.fn();
  const prisma = {
    product: { findMany, findFirst },
    movement: { findMany: findManyMovements },
  } as unknown as PrismaClient;
  return {
    findMany,
    findFirst,
    findManyMovements,
    queries: new PrismaInventoryQueries(prisma),
  };
}

describe("PrismaInventoryQueries", () => {
  describe("listProducts", () => {
    it("should list the active products of the business ordered by name", async () => {
      const { findMany, queries } = setup();
      findMany.mockResolvedValue([]);

      await queries.listProducts("business-1");

      expect(findMany).toHaveBeenCalledWith({
        where: { businessId: "business-1", isActive: true },
        orderBy: { name: "asc" },
        select: expect.objectContaining({ id: true, stock: true }),
      });
    });

    it("should search by name without distinguishing case", async () => {
      const { findMany, queries } = setup();
      findMany.mockResolvedValue([]);

      await queries.listProducts("business-1", "arroz");

      expect(findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            businessId: "business-1",
            isActive: true,
            name: { contains: "arroz", mode: "insensitive" },
          },
        }),
      );
    });

    it("should map the decimals to numbers", async () => {
      const { findMany, queries } = setup();
      findMany.mockResolvedValue([productRow]);

      const [product] = await queries.listProducts("business-1");

      expect(product).toEqual({
        id: PRODUCT_ID,
        name: "Queso campesino",
        unit: "KILOGRAM",
        stock: 2.5,
        salePrice: 22000,
        minStock: null,
        codeType: "INTERNAL",
        code: "INV-7KQ2M9XA4T",
      });
    });
  });

  describe("findActiveProduct", () => {
    it("should look for an active product of the business only", async () => {
      const { findFirst, queries } = setup();
      findFirst.mockResolvedValue(null);

      const product = await queries.findActiveProduct("business-1", PRODUCT_ID);

      expect(product).toBeNull();
      expect(findFirst).toHaveBeenCalledWith({
        where: { id: PRODUCT_ID, businessId: "business-1", isActive: true },
        select: expect.objectContaining({ id: true, stock: true }),
      });
    });
  });

  describe("listMovements", () => {
    it("should ask for one movement more than the page, newest first, within the business", async () => {
      const { findManyMovements, queries } = setup();
      findManyMovements.mockResolvedValue([]);

      await queries.listMovements("business-1", PRODUCT_ID, { limit: 50 });

      expect(findManyMovements).toHaveBeenCalledWith({
        where: { productId: PRODUCT_ID, product: { businessId: "business-1" } },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 51,
        select: expect.objectContaining({ id: true, resultingStock: true }),
      });
    });

    it("should start after the cursor when one is sent", async () => {
      const { findManyMovements, queries } = setup();
      findManyMovements.mockResolvedValue([]);

      await queries.listMovements("business-1", PRODUCT_ID, { limit: 50, cursor: "movement-9" });

      expect(findManyMovements).toHaveBeenCalledWith(
        expect.objectContaining({ cursor: { id: "movement-9" }, skip: 1 }),
      );
    });

    it("should return the page with the next cursor when there are more movements", async () => {
      const { findManyMovements, queries } = setup();
      findManyMovements.mockResolvedValue([movementRow("m-3"), movementRow("m-2"), movementRow("m-1")]);

      const page = await queries.listMovements("business-1", PRODUCT_ID, { limit: 2 });

      expect(page.items.map((movement) => movement.id)).toEqual(["m-3", "m-2"]);
      expect(page.items[0]).toMatchObject({ quantity: 1.25, resultingStock: 2.5 });
      expect(page.nextCursor).toBe("m-2");
    });

    it("should return a null cursor on the last page", async () => {
      const { findManyMovements, queries } = setup();
      findManyMovements.mockResolvedValue([movementRow("m-2"), movementRow("m-1")]);

      const page = await queries.listMovements("business-1", PRODUCT_ID, { limit: 2 });

      expect(page.items).toHaveLength(2);
      expect(page.nextCursor).toBeNull();
    });
  });
});
