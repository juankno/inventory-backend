import type { ProductData } from "../../ports/product.repository.ts";
import { ProductRepositoryMock } from "../../mocks/product.repository.mock.ts";
import { IdentifyProduct } from "./identify-product.use-case.ts";

const gtinProduct: ProductData = {
  businessId: "business-1",
  createdBy: "user-1",
  name: "Arroz Diana 500 g",
  unit: "UNIT",
  stock: 24,
  salePrice: 3500,
  minStock: 6,
  codeType: "GTIN",
  code: "7702004003508",
};

function setup() {
  const productRepository = new ProductRepositoryMock();
  const identifyProduct = new IdentifyProduct(productRepository);
  return { productRepository, identifyProduct };
}

describe("IdentifyProduct", () => {
  describe("execute", () => {
    it("should return the active product when the GTIN is registered in the business", async () => {
      const { productRepository, identifyProduct } = setup();
      const created = await productRepository.create(gtinProduct);

      const product = await identifyProduct.execute({
        businessId: "business-1",
        code: "7702004003508",
      });

      expect(product).toEqual(created);
    });

    it("should return the active product when the internal INV- code is registered in the business", async () => {
      const { productRepository, identifyProduct } = setup();
      const created = await productRepository.create({
        ...gtinProduct,
        codeType: "INTERNAL",
        code: "INV-7KQ2M9XA4T",
      });

      const product = await identifyProduct.execute({
        businessId: "business-1",
        code: "INV-7KQ2M9XA4T",
      });

      expect(product).toEqual(created);
    });

    it("should reject with CODE_NOT_RECOGNIZED when a valid GTIN is not registered", async () => {
      const { identifyProduct } = setup();

      const identification = identifyProduct.execute({
        businessId: "business-1",
        code: "7702004003508",
      });

      await expect(identification).rejects.toMatchObject({ code: "CODE_NOT_RECOGNIZED" });
    });

    it("should reject with CODE_NOT_RECOGNIZED without querying the repository when the code is unknown", async () => {
      const { productRepository, identifyProduct } = setup();

      const identification = identifyProduct.execute({
        businessId: "business-1",
        code: "hola",
      });

      await expect(identification).rejects.toMatchObject({ code: "CODE_NOT_RECOGNIZED" });
      expect(productRepository.findCalls).toBe(0);
    });

    it("should reject with CODE_NOT_RECOGNIZED when the product belongs to another business", async () => {
      const { productRepository, identifyProduct } = setup();
      await productRepository.create({ ...gtinProduct, businessId: "business-2" });

      const identification = identifyProduct.execute({
        businessId: "business-1",
        code: "7702004003508",
      });

      await expect(identification).rejects.toMatchObject({ code: "CODE_NOT_RECOGNIZED" });
    });

    it("should reject with CODE_NOT_RECOGNIZED when the product is deactivated", async () => {
      const { productRepository, identifyProduct } = setup();
      await productRepository.create(gtinProduct);
      productRepository.products[0]!.isActive = false;

      const identification = identifyProduct.execute({
        businessId: "business-1",
        code: "7702004003508",
      });

      await expect(identification).rejects.toMatchObject({ code: "CODE_NOT_RECOGNIZED" });
    });
  });
});
