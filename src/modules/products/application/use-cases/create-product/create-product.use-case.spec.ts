import { IdGeneratorMock } from "../../mocks/id-generator.mock.ts";
import { ProductRepositoryMock } from "../../mocks/product.repository.mock.ts";
import {
  CreateProduct,
  MAX_INTERNAL_CODE_ATTEMPTS,
  type CreateProductInput,
} from "./create-product.use-case.ts";

const validInput: CreateProductInput = {
  businessId: "business-1",
  userId: "user-1",
  name: "Arroz Diana 500 g",
  unit: "UNIT",
  stock: 24,
  salePrice: 3500,
  minStock: 6,
  code: "7702004003508",
};

const { code: _code, ...inputWithoutCode } = validInput;

function setup(plannedIds: string[] = []) {
  const productRepository = new ProductRepositoryMock();
  const createProduct = new CreateProduct(
    productRepository,
    new IdGeneratorMock(plannedIds),
  );
  return { productRepository, createProduct };
}

describe("CreateProduct", () => {
  describe("execute", () => {
    it("should create the product with codeType GTIN and the code as sent", async () => {
      const { createProduct } = setup();

      const product = await createProduct.execute(validInput);

      expect(product).toMatchObject({
        businessId: "business-1",
        name: "Arroz Diana 500 g",
        unit: "UNIT",
        stock: 24,
        salePrice: 3500,
        minStock: 6,
        codeType: "GTIN",
        code: "7702004003508",
        isActive: true,
      });
    });

    it("should store null when salePrice and minStock are not sent", async () => {
      const { createProduct } = setup();
      const input = { ...validInput, salePrice: undefined, minStock: undefined };

      const product = await createProduct.execute(input);

      expect(product.salePrice).toBeNull();
      expect(product.minStock).toBeNull();
    });

    it("should reject with INVALID_GTIN and create nothing when the check digit is wrong", async () => {
      const { createProduct, productRepository } = setup();
      const input = { ...validInput, code: "7702004003509" };

      const creation = createProduct.execute(input);

      await expect(creation).rejects.toMatchObject({ code: "INVALID_GTIN" });
      expect(productRepository.products).toHaveLength(0);
    });

    it("should reject with INVALID_GTIN when the code is a UPC-A not normalized to 13 digits", async () => {
      const { createProduct } = setup();
      const input = { ...validInput, code: "036000291452" };

      const creation = createProduct.execute(input);

      await expect(creation).rejects.toMatchObject({ code: "INVALID_GTIN" });
    });

    it("should reject with INVALID_GTIN when the client sends an internal identifier", async () => {
      const { createProduct } = setup();
      const input = { ...validInput, code: "INV-7KQ2M9XA4T" };

      const creation = createProduct.execute(input);

      await expect(creation).rejects.toMatchObject({ code: "INVALID_GTIN" });
    });

    it("should use the code from the IdGenerator with codeType INTERNAL when no code is sent", async () => {
      const { createProduct } = setup(["INV-7KQ2M9XA4T"]);

      const product = await createProduct.execute(inputWithoutCode);

      expect(product.codeType).toBe("INTERNAL");
      expect(product.code).toBe("INV-7KQ2M9XA4T");
    });

    it("should retry with another internal code when the generated one is taken", async () => {
      const { createProduct, productRepository } = setup([
        "INV-0000000001",
        "INV-0000000001",
        "INV-0000000002",
      ]);
      await createProduct.execute(inputWithoutCode);

      const product = await createProduct.execute(inputWithoutCode);

      expect(product.code).toBe("INV-0000000002");
      expect(productRepository.products).toHaveLength(2);
    });

    it("should give up without a CODE_ALREADY_REGISTERED error after too many internal code collisions", async () => {
      const takenCode = "INV-0000000001";
      const { createProduct, productRepository } = setup(
        Array.from({ length: MAX_INTERNAL_CODE_ATTEMPTS + 1 }, () => takenCode),
      );
      await createProduct.execute(inputWithoutCode);

      const creation = createProduct.execute(inputWithoutCode);

      await expect(creation).rejects.toThrow(Error);
      await expect(creation).rejects.not.toMatchObject({
        code: "CODE_ALREADY_REGISTERED",
      });
      expect(productRepository.products).toHaveLength(1);
    });

    it("should reject with CODE_ALREADY_REGISTERED when the GTIN exists in the same business", async () => {
      const { createProduct, productRepository } = setup();
      await createProduct.execute(validInput);

      const creation = createProduct.execute({ ...validInput, name: "Otro arroz" });

      await expect(creation).rejects.toMatchObject({
        code: "CODE_ALREADY_REGISTERED",
      });
      expect(productRepository.products).toHaveLength(1);
    });

    it("should allow the same GTIN in another business", async () => {
      const { createProduct } = setup();
      await createProduct.execute(validInput);

      const product = await createProduct.execute({
        ...validInput,
        businessId: "business-2",
        userId: "user-2",
      });

      expect(product.businessId).toBe("business-2");
      expect(product.code).toBe("7702004003508");
    });

    it("should register an INBOUND movement with the initial stock and the user from the token", async () => {
      const { createProduct, productRepository } = setup();

      const product = await createProduct.execute(validInput);

      expect(productRepository.initialMovements).toEqual([
        {
          productId: product.id,
          userId: "user-1",
          type: "INBOUND",
          quantity: 24,
          resultingStock: 24,
        },
      ]);
    });

    it("should not register a movement when the initial stock is zero", async () => {
      const { createProduct, productRepository } = setup();

      await createProduct.execute({ ...validInput, stock: 0 });

      expect(productRepository.initialMovements).toHaveLength(0);
    });

    it.each([
      ["a decimal stock for UNIT", { unit: "UNIT", stock: 2.5 }],
      ["a stock with more than 2 decimals", { unit: "KILOGRAM", stock: 1.255 }],
      ["a sale price with more than 2 decimals", { salePrice: 3500.999 }],
      ["a minimum stock with more than 2 decimals", { minStock: 0.125 }],
    ] as const)(
      "should reject with INVALID_QUANTITY and create nothing for %s",
      async (_case, override) => {
        const { createProduct, productRepository } = setup();

        const creation = createProduct.execute({ ...validInput, ...override });

        await expect(creation).rejects.toMatchObject({ code: "INVALID_QUANTITY" });
        expect(productRepository.products).toHaveLength(0);
      },
    );

    it("should accept decimal stock for units other than UNIT", async () => {
      const { createProduct } = setup();

      const product = await createProduct.execute({
        ...validInput,
        unit: "KILOGRAM",
        stock: 12.5,
      });

      expect(product.stock).toBe(12.5);
    });
  });
});
