import {
  InventoryQueriesMock,
  type StoredProduct,
} from "../../mocks/inventory-queries.repository.mock.ts";
import {
  GetMovementHistory,
  HISTORY_PAGE_SIZE,
} from "./get-movement-history.use-case.ts";

const PRODUCT_ID = "3f1c2b9e-8a4d-4c1e-9b7a-2d5e6f708192";

const storedProduct: StoredProduct = {
  id: PRODUCT_ID,
  businessId: "business-1",
  isActive: true,
  name: "Panela",
  unit: "UNIT",
  stock: 10,
  salePrice: 2500,
  minStock: 4,
  codeType: "INTERNAL",
  code: "INV-7KQ2M9XA4T",
};

function setup(movementCount: number, product: Partial<StoredProduct> = {}) {
  const inventoryQueries = new InventoryQueriesMock();
  inventoryQueries.products.push({ ...storedProduct, ...product });
  for (let index = 1; index <= movementCount; index++) {
    inventoryQueries.movements.push({
      id: `movement-${String(index).padStart(3, "0")}`,
      productId: PRODUCT_ID,
      type: "INBOUND",
      reason: null,
      quantity: 1,
      resultingStock: index,
      createdAt: new Date(Date.UTC(2026, 10, 1, 0, index)),
    });
  }
  return { getMovementHistory: new GetMovementHistory(inventoryQueries) };
}

describe("GetMovementHistory", () => {
  describe("execute", () => {
    it("should respect the requested limit", async () => {
      const { getMovementHistory } = setup(8);

      const page = await getMovementHistory.execute({
        businessId: "business-1",
        productId: PRODUCT_ID,
        limit: 5,
      });

      expect(page.items).toHaveLength(5);
      expect(page.nextCursor).toBe(page.items[4]?.id);
    });

    it("should list the movements from the most recent to the oldest", async () => {
      const { getMovementHistory } = setup(3);

      const page = await getMovementHistory.execute({
        businessId: "business-1",
        productId: PRODUCT_ID,
      });

      expect(page.items.map((movement) => movement.id)).toEqual([
        "movement-003",
        "movement-002",
        "movement-001",
      ]);
      expect(page.nextCursor).toBeNull();
    });

    it("should return pages of the page size with a cursor to the next one", async () => {
      const { getMovementHistory } = setup(HISTORY_PAGE_SIZE + 10);

      const firstPage = await getMovementHistory.execute({
        businessId: "business-1",
        productId: PRODUCT_ID,
      });
      const secondPage = await getMovementHistory.execute({
        businessId: "business-1",
        productId: PRODUCT_ID,
        cursor: firstPage.nextCursor ?? undefined,
      });

      expect(firstPage.items).toHaveLength(HISTORY_PAGE_SIZE);
      expect(firstPage.nextCursor).toBe(firstPage.items.at(-1)?.id);
      expect(secondPage.items).toHaveLength(10);
      expect(secondPage.items[0]?.id).toBe("movement-010");
      expect(secondPage.nextCursor).toBeNull();
    });

    it("should not expose the productId of each movement", async () => {
      const { getMovementHistory } = setup(1);

      const page = await getMovementHistory.execute({
        businessId: "business-1",
        productId: PRODUCT_ID,
      });

      expect(page.items[0]).not.toHaveProperty("productId");
    });

    it("should reject with PRODUCT_NOT_FOUND when the product belongs to another business", async () => {
      const { getMovementHistory } = setup(3, { businessId: "business-2" });

      const lookup = getMovementHistory.execute({
        businessId: "business-1",
        productId: PRODUCT_ID,
      });

      await expect(lookup).rejects.toMatchObject({ code: "PRODUCT_NOT_FOUND" });
    });

    it("should reject with PRODUCT_NOT_FOUND when the product is deactivated", async () => {
      const { getMovementHistory } = setup(3, { isActive: false });

      const lookup = getMovementHistory.execute({
        businessId: "business-1",
        productId: PRODUCT_ID,
      });

      await expect(lookup).rejects.toMatchObject({ code: "PRODUCT_NOT_FOUND" });
    });
  });
});
