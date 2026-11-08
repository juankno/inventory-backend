import type { ProductData } from "../../ports/product.repository.ts";
import { ProductRepositoryMock } from "../../mocks/product.repository.mock.ts";
import { UpdateProduct } from "./update-product.use-case.ts";

const productData: ProductData = {
  businessId: "business-1",
  createdBy: "user-1",
  name: "Queso campesino",
  unit: "KILOGRAM",
  stock: 2.5,
  salePrice: 22000,
  minStock: 1,
  codeType: "INTERNAL",
  code: "INV-7KQ2M9XA4T",
};

async function setup(data: Partial<ProductData> = {}) {
  const productRepository = new ProductRepositoryMock();
  const product = await productRepository.create({ ...productData, ...data });
  return { product, productRepository, updateProduct: new UpdateProduct(productRepository) };
}

describe("UpdateProduct", () => {
  describe("execute", () => {
    it("should change only the fields that are sent", async () => {
      const { product, updateProduct } = await setup();

      const updated = await updateProduct.execute({
        businessId: "business-1",
        productId: product.id,
        changes: { name: "Queso costeño", salePrice: 24000 },
      });

      expect(updated).toMatchObject({
        name: "Queso costeño",
        salePrice: 24000,
        unit: "KILOGRAM",
        stock: 2.5,
        minStock: 1,
        code: "INV-7KQ2M9XA4T",
      });
    });

    it("should clear the sale price and the minimum stock when null is sent", async () => {
      const { product, updateProduct } = await setup();

      const updated = await updateProduct.execute({
        businessId: "business-1",
        productId: product.id,
        changes: { salePrice: null, minStock: null },
      });

      expect(updated.salePrice).toBeNull();
      expect(updated.minStock).toBeNull();
    });

    it("should allow changing to UNIT when the stock is a whole number", async () => {
      const { product, updateProduct } = await setup({ stock: 3 });

      const updated = await updateProduct.execute({
        businessId: "business-1",
        productId: product.id,
        changes: { unit: "UNIT" },
      });

      expect(updated.unit).toBe("UNIT");
    });

    it("should reject with INVALID_UNIT_CHANGE and change nothing when the stock has decimals", async () => {
      const { product, updateProduct } = await setup({ stock: 2.5 });

      const update = updateProduct.execute({
        businessId: "business-1",
        productId: product.id,
        changes: { unit: "UNIT", name: "Otro nombre" },
      });

      await expect(update).rejects.toMatchObject({ code: "INVALID_UNIT_CHANGE" });
      expect(product).toMatchObject({ unit: "KILOGRAM", name: "Queso campesino" });
    });

    it.each([
      ["a sale price with more than 2 decimals", { salePrice: 100.999 }],
      ["a minimum stock with more than 2 decimals", { minStock: 0.125 }],
    ])("should reject with INVALID_QUANTITY for %s", async (_case, changes) => {
      const { product, updateProduct } = await setup();

      const update = updateProduct.execute({
        businessId: "business-1",
        productId: product.id,
        changes,
      });

      await expect(update).rejects.toMatchObject({ code: "INVALID_QUANTITY" });
    });

    it("should reject with PRODUCT_NOT_FOUND when the product belongs to another business", async () => {
      const { product, updateProduct } = await setup({ businessId: "business-2" });

      const update = updateProduct.execute({
        businessId: "business-1",
        productId: product.id,
        changes: { name: "Robado" },
      });

      await expect(update).rejects.toMatchObject({ code: "PRODUCT_NOT_FOUND" });
      expect(product.name).toBe("Queso campesino");
    });

    it("should reject with PRODUCT_NOT_FOUND when the product is deactivated", async () => {
      const { product, updateProduct } = await setup();
      product.isActive = false;

      const update = updateProduct.execute({
        businessId: "business-1",
        productId: product.id,
        changes: { name: "Otro" },
      });

      await expect(update).rejects.toMatchObject({ code: "PRODUCT_NOT_FOUND" });
    });
  });
});
