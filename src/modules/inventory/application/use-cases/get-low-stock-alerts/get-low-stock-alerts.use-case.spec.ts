import {
  InventoryQueriesMock,
  type StoredProduct,
} from "../../mocks/inventory-queries.repository.mock.ts";
import { GetLowStockAlerts } from "./get-low-stock-alerts.use-case.ts";

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
      ...product,
    }),
  );
  return { getLowStockAlerts: new GetLowStockAlerts(inventoryQueries) };
}

describe("GetLowStockAlerts", () => {
  describe("execute", () => {
    it("should list out-of-stock products first and then low-stock ones, each group by name", async () => {
      const { getLowStockAlerts } = setup([
        { name: "Azúcar a granel", stock: 2, minStock: 5 },
        { name: "Panela", stock: 0 },
        { name: "Atún en lata", stock: 3, minStock: 3 },
        { name: "Jabón de baño", stock: 0 },
      ]);

      const alerts = await getLowStockAlerts.execute({ businessId: "business-1" });

      expect(alerts.map(({ name, status }) => [name, status])).toEqual([
        ["Jabón de baño", "OUT_OF_STOCK"],
        ["Panela", "OUT_OF_STOCK"],
        ["Atún en lata", "LOW_STOCK"],
        ["Azúcar a granel", "LOW_STOCK"],
      ]);
    });

    it("should leave out products with enough stock or without a minimum", async () => {
      const { getLowStockAlerts } = setup([
        { name: "Arroz", stock: 10, minStock: 4 },
        { name: "Sal", stock: 1, minStock: null },
        { name: "Panela", stock: 0 },
      ]);

      const alerts = await getLowStockAlerts.execute({ businessId: "business-1" });

      expect(alerts.map((product) => product.name)).toEqual(["Panela"]);
    });

    it("should return an empty list when nothing needs attention", async () => {
      const { getLowStockAlerts } = setup([{ name: "Arroz", stock: 10, minStock: 4 }]);

      const alerts = await getLowStockAlerts.execute({ businessId: "business-1" });

      expect(alerts).toEqual([]);
    });

    it("should leave out deactivated products", async () => {
      const { getLowStockAlerts } = setup([{ name: "Panela", stock: 0, isActive: false }]);

      const alerts = await getLowStockAlerts.execute({ businessId: "business-1" });

      expect(alerts).toEqual([]);
    });

    it("should never include products of another business", async () => {
      const { getLowStockAlerts } = setup([
        { name: "Panela", stock: 0 },
        { name: "Agotado ajeno", stock: 0, businessId: "business-2" },
      ]);

      const alerts = await getLowStockAlerts.execute({ businessId: "business-1" });

      expect(alerts.map((product) => product.name)).toEqual(["Panela"]);
    });
  });
});
