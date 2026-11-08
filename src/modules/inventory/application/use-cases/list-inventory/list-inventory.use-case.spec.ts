import {
  InventoryQueriesMock,
  type StoredProduct,
} from "../../mocks/inventory-queries.repository.mock.ts";
import { ListInventory } from "./list-inventory.use-case.ts";

const baseProduct: StoredProduct = {
  id: "product-1",
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

function setup(products: Partial<StoredProduct>[]) {
  const inventoryQueries = new InventoryQueriesMock();
  products.forEach((product, index) =>
    inventoryQueries.products.push({
      ...baseProduct,
      id: `product-${index + 1}`,
      code: `INV-00000000${String(index).padStart(2, "0")}`,
      ...product,
    }),
  );
  return { listInventory: new ListInventory(inventoryQueries) };
}

describe("ListInventory", () => {
  describe("execute", () => {
    it("should list the active products of the business in alphabetical order", async () => {
      const { listInventory } = setup([
        { name: "Panela" },
        { name: "Arroz Diana 500 g" },
        { name: "Jabón de baño" },
      ]);

      const products = await listInventory.execute({ businessId: "business-1" });

      expect(products.map((product) => product.name)).toEqual([
        "Arroz Diana 500 g",
        "Jabón de baño",
        "Panela",
      ]);
    });

    it("should add the stock status to each product", async () => {
      const { listInventory } = setup([
        { name: "Atún en lata", stock: 2, minStock: 5 },
        { name: "Jabón de baño", stock: 0 },
        { name: "Panela", stock: 10, minStock: 4 },
      ]);

      const products = await listInventory.execute({ businessId: "business-1" });

      expect(products.map((product) => product.status)).toEqual([
        "LOW_STOCK",
        "OUT_OF_STOCK",
        "OK",
      ]);
    });

    it("should filter by name without distinguishing upper and lower case", async () => {
      const { listInventory } = setup([
        { name: "Arroz Diana 500 g" },
        { name: "Arroz Roa 1 kg" },
        { name: "Panela" },
      ]);

      const products = await listInventory.execute({
        businessId: "business-1",
        search: "ARROZ",
      });

      expect(products.map((product) => product.name)).toEqual([
        "Arroz Diana 500 g",
        "Arroz Roa 1 kg",
      ]);
    });

    it("should leave out deactivated products", async () => {
      const { listInventory } = setup([
        { name: "Panela" },
        { name: "Arroz", isActive: false },
      ]);

      const products = await listInventory.execute({ businessId: "business-1" });

      expect(products.map((product) => product.name)).toEqual(["Panela"]);
    });

    it("should never include products of another business", async () => {
      const { listInventory } = setup([
        { name: "Panela" },
        { name: "Arroz de otro negocio", businessId: "business-2" },
      ]);

      const products = await listInventory.execute({ businessId: "business-1" });

      expect(products.map((product) => product.name)).toEqual(["Panela"]);
    });

    it("should not expose the businessId of the products", async () => {
      const { listInventory } = setup([{ name: "Panela" }]);

      const [product] = await listInventory.execute({ businessId: "business-1" });

      expect(product).not.toHaveProperty("businessId");
      expect(product).not.toHaveProperty("isActive");
    });
  });
});
