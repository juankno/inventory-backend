import { ProductRepositoryMock } from "../../mocks/product.repository.mock.ts";
import { RestoreProduct } from "./restore-product.use-case.ts";

async function setup() {
  const productRepository = new ProductRepositoryMock();
  const product = await productRepository.create({
    businessId: "business-1",
    createdBy: "user-1",
    name: "Panela",
    unit: "UNIT",
    stock: 7,
    salePrice: null,
    minStock: null,
    codeType: "INTERNAL",
    code: "INV-7KQ2M9XA4T",
  });
  return {
    product,
    productRepository,
    restoreProduct: new RestoreProduct(productRepository),
  };
}

describe("RestoreProduct", () => {
  describe("execute", () => {
    it("should bring back a deleted product with its stock", async () => {
      const { product, productRepository, restoreProduct } = await setup();
      await productRepository.deactivate("business-1", product.id);

      const restored = await restoreProduct.execute({
        businessId: "business-1",
        productId: product.id,
      });

      expect(restored).toMatchObject({ id: product.id, isActive: true, stock: 7 });
    });

    it("should return a product that is already active", async () => {
      const { product, restoreProduct } = await setup();

      const restored = await restoreProduct.execute({
        businessId: "business-1",
        productId: product.id,
      });

      expect(restored.id).toBe(product.id);
    });

    it("should not restore a product of another business", async () => {
      const { product, restoreProduct } = await setup();

      await expect(
        restoreProduct.execute({ businessId: "business-2", productId: product.id }),
      ).rejects.toMatchObject({ code: "PRODUCT_NOT_FOUND" });
    });
  });
});
