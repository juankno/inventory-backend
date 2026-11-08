import {
  InventoryQueriesMock,
  type StoredProduct,
} from "../../mocks/inventory-queries.repository.mock.ts";
import { GetProduct } from "./get-product.use-case.ts";

const PRODUCT_ID = "3f1c2b9e-8a4d-4c1e-9b7a-2d5e6f708192";

const storedProduct: StoredProduct = {
  id: PRODUCT_ID,
  businessId: "business-1",
  isActive: true,
  name: "Atún en lata",
  unit: "UNIT",
  stock: 2,
  salePrice: 6500,
  minStock: 5,
  codeType: "GTIN",
  code: "7702004003508",
};

function setup(product: Partial<StoredProduct> = {}) {
  const inventoryQueries = new InventoryQueriesMock();
  inventoryQueries.products.push({ ...storedProduct, ...product });
  return { getProduct: new GetProduct(inventoryQueries) };
}

describe("GetProduct", () => {
  describe("execute", () => {
    it("should return the product with its stock status", async () => {
      const { getProduct } = setup();

      const product = await getProduct.execute({
        businessId: "business-1",
        productId: PRODUCT_ID,
      });

      expect(product).toEqual({
        id: PRODUCT_ID,
        name: "Atún en lata",
        unit: "UNIT",
        stock: 2,
        salePrice: 6500,
        minStock: 5,
        codeType: "GTIN",
        code: "7702004003508",
        status: "LOW_STOCK",
      });
    });

    it("should reject with PRODUCT_NOT_FOUND when the product belongs to another business", async () => {
      const { getProduct } = setup({ businessId: "business-2" });

      const lookup = getProduct.execute({ businessId: "business-1", productId: PRODUCT_ID });

      await expect(lookup).rejects.toMatchObject({ code: "PRODUCT_NOT_FOUND" });
    });

    it("should reject with PRODUCT_NOT_FOUND when the product is deactivated", async () => {
      const { getProduct } = setup({ isActive: false });

      const lookup = getProduct.execute({ businessId: "business-1", productId: PRODUCT_ID });

      await expect(lookup).rejects.toMatchObject({ code: "PRODUCT_NOT_FOUND" });
    });

    it("should reject with PRODUCT_NOT_FOUND when the product does not exist", async () => {
      const { getProduct } = setup();

      const lookup = getProduct.execute({
        businessId: "business-1",
        productId: "9b7a2d5e-6f70-4192-8a4d-3f1c2b9e4c1e",
      });

      await expect(lookup).rejects.toMatchObject({ code: "PRODUCT_NOT_FOUND" });
    });
  });
});
