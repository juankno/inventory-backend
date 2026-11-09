import {
  InventoryQueriesMock,
  type StoredProduct,
} from "../../mocks/inventory-queries.repository.mock.ts";
import { ListDeletedProducts } from "./list-deleted-products.use-case.ts";

const baseProduct: StoredProduct = {
  id: "product-1",
  businessId: "business-1",
  isActive: false,
  deletedAt: new Date("2026-11-01T12:00:00Z"),
  name: "Panela",
  unit: "UNIT",
  stock: 4,
  salePrice: null,
  minStock: null,
  codeType: "INTERNAL",
  code: "INV-7KQ2M9XA4T",
};

function setup() {
  const inventoryQueries = new InventoryQueriesMock();
  inventoryQueries.products.push(
    baseProduct,
    {
      ...baseProduct,
      id: "product-2",
      name: "Arroz",
      code: "7702354948016",
      deletedAt: new Date("2026-11-05T12:00:00Z"),
    },
    { ...baseProduct, id: "product-3", name: "Activo", code: "A", isActive: true },
    { ...baseProduct, id: "product-4", name: "Ajeno", code: "B", businessId: "business-2" },
  );
  return new ListDeletedProducts(inventoryQueries);
}

describe("ListDeletedProducts", () => {
  describe("execute", () => {
    it("should list only the deleted products of the business, the latest first", async () => {
      const products = await setup().execute({ businessId: "business-1" });

      expect(products.map((product) => product.name)).toEqual(["Arroz", "Panela"]);
    });

    it("should filter by code", async () => {
      const products = await setup().execute({
        businessId: "business-1",
        code: "7702354948016",
      });

      expect(products.map((product) => product.name)).toEqual(["Arroz"]);
    });

    it("should not return an active product when filtering by its code", async () => {
      const products = await setup().execute({
        businessId: "business-1",
        code: "A",
      });

      expect(products).toEqual([]);
    });
  });
});
