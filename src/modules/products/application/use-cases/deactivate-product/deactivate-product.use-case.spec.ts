import type { ProductData } from "../../ports/product.repository.ts";
import { ProductRepositoryMock } from "../../mocks/product.repository.mock.ts";
import { DeactivateProduct } from "./deactivate-product.use-case.ts";

const productData: ProductData = {
  businessId: "business-1",
  createdBy: "user-1",
  name: "Panela",
  unit: "UNIT",
  stock: 4,
  salePrice: 2500,
  minStock: 2,
  codeType: "INTERNAL",
  code: "INV-7KQ2M9XA4T",
};

async function setup(data: Partial<ProductData> = {}) {
  const productRepository = new ProductRepositoryMock();
  const product = await productRepository.create({ ...productData, ...data });
  return {
    product,
    productRepository,
    deactivateProduct: new DeactivateProduct(productRepository),
  };
}

describe("DeactivateProduct", () => {
  describe("execute", () => {
    it("should deactivate the product and keep its initial movement", async () => {
      const { product, productRepository, deactivateProduct } = await setup();

      await deactivateProduct.execute({ businessId: "business-1", productId: product.id });

      expect(product.isActive).toBe(false);
      expect(productRepository.products).toHaveLength(1);
      expect(productRepository.initialMovements).toHaveLength(1);
    });

    it("should make the product invisible to the identification by code", async () => {
      const { product, productRepository, deactivateProduct } = await setup();

      await deactivateProduct.execute({ businessId: "business-1", productId: product.id });

      await expect(
        productRepository.findActiveByCode("business-1", product.code),
      ).resolves.toBeNull();
    });

    it("should reject with PRODUCT_NOT_FOUND when the product was already deactivated", async () => {
      const { product, deactivateProduct } = await setup();
      await deactivateProduct.execute({ businessId: "business-1", productId: product.id });

      const deactivation = deactivateProduct.execute({
        businessId: "business-1",
        productId: product.id,
      });

      await expect(deactivation).rejects.toMatchObject({ code: "PRODUCT_NOT_FOUND" });
    });

    it("should reject with PRODUCT_NOT_FOUND and keep it active when the product belongs to another business", async () => {
      const { product, deactivateProduct } = await setup({ businessId: "business-2" });

      const deactivation = deactivateProduct.execute({
        businessId: "business-1",
        productId: product.id,
      });

      await expect(deactivation).rejects.toMatchObject({ code: "PRODUCT_NOT_FOUND" });
      expect(product.isActive).toBe(true);
    });
  });
});
