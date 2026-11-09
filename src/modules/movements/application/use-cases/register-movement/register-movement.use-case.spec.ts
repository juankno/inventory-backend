import { MovementRepositoryMock } from "../../mocks/movement.repository.mock.ts";
import {
  MAX_STOCK_ATTEMPTS,
  RegisterMovement,
  type RegisterMovementInput,
} from "./register-movement.use-case.ts";

const PRODUCT_ID = "3f1c2b9e-8a4d-4c1e-9b7a-2d5e6f708192";

const saleInput: RegisterMovementInput = {
  businessId: "business-1",
  userId: "user-1",
  productId: PRODUCT_ID,
  type: "OUTBOUND",
  quantity: 4,
  reason: "SALE",
  idempotencyKey: "a1b2c3d4-0000-4000-8000-000000000001",
};

function setup(stock = 10) {
  const movementRepository = new MovementRepositoryMock();
  movementRepository.products.push({
    id: PRODUCT_ID,
    businessId: "business-1",
    unit: "UNIT",
    stock,
    isActive: true,
  });
  const registerMovement = new RegisterMovement(movementRepository);
  const product = movementRepository.products[0];
  if (!product) throw new Error("El producto de prueba no se creó");
  return { movementRepository, registerMovement, product };
}

describe("RegisterMovement", () => {
  describe("sale price", () => {
    it("should keep the current sale price on an OUTBOUND", async () => {
      const { registerMovement, product } = setup(10);
      product.salePrice = 2500;

      const result = await registerMovement.execute(saleInput);

      expect(result.movement?.unitPrice).toBe(2500);
    });

    it("should not change a past sale when the price changes later", async () => {
      const { registerMovement, movementRepository, product } = setup(10);
      product.salePrice = 2500;
      await registerMovement.execute(saleInput);

      product.salePrice = 9000;

      expect(movementRepository.stored[0]?.movement.unitPrice).toBe(2500);
    });

    it("should leave the price empty if the product has none", async () => {
      const { registerMovement } = setup(10);

      const result = await registerMovement.execute(saleInput);

      expect(result.movement?.unitPrice).toBeNull();
    });

    it("should not store a price on an INBOUND", async () => {
      const { registerMovement, product } = setup(10);
      product.salePrice = 2500;

      const result = await registerMovement.execute({
        ...saleInput,
        type: "INBOUND",
        reason: undefined,
      });

      expect(result.movement?.unitPrice).toBeNull();
    });
  });

  describe("undo", () => {
    const adjustment = {
      ...saleInput,
      type: "ADJUSTMENT" as const,
      reason: undefined,
      quantity: 10,
      idempotencyKey: "a1b2c3d4-0000-4000-8000-000000000002",
    };

    it("should link the adjustment to the movement it reverts", async () => {
      const { registerMovement } = setup(10);
      const sale = await registerMovement.execute(saleInput);

      const result = await registerMovement.execute({
        ...adjustment,
        revertsMovementId: sale.movement?.id,
      });

      expect(result.movement?.revertsMovementId).toBe(sale.movement?.id);
      expect(result.stock).toBe(10);
    });

    it("should only accept it on an ADJUSTMENT", async () => {
      const { registerMovement } = setup(10);

      await expect(
        registerMovement.execute({ ...saleInput, revertsMovementId: "movement-1" }),
      ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    });

    it("should reject a movement of another product or business", async () => {
      const { registerMovement } = setup(10);

      await expect(
        registerMovement.execute({ ...adjustment, revertsMovementId: "movement-99" }),
      ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    });
  });

  describe("execute", () => {
    it("should add the quantity and create the movement on INBOUND", async () => {
      const { registerMovement, product } = setup(10);

      const result = await registerMovement.execute({
        ...saleInput,
        type: "INBOUND",
        quantity: 6,
        reason: undefined,
      });

      expect(result).toMatchObject({ created: true, stock: 16 });
      expect(result.movement).toMatchObject({
        productId: PRODUCT_ID,
        userId: "user-1",
        type: "INBOUND",
        reason: null,
        quantity: 6,
        resultingStock: 16,
      });
      expect(product.stock).toBe(16);
    });

    it("should subtract the quantity and keep the reason on OUTBOUND", async () => {
      const { registerMovement, product } = setup(10);

      const result = await registerMovement.execute(saleInput);

      expect(result).toMatchObject({ created: true, stock: 6 });
      expect(result.movement).toMatchObject({ type: "OUTBOUND", reason: "SALE", quantity: 4 });
      expect(product.stock).toBe(6);
    });

    it("should store the difference and set the counted stock on ADJUSTMENT", async () => {
      const { registerMovement, product } = setup(10);

      const result = await registerMovement.execute({
        ...saleInput,
        type: "ADJUSTMENT",
        quantity: 7,
        reason: undefined,
      });

      expect(result.movement).toMatchObject({ quantity: -3, resultingStock: 7 });
      expect(product.stock).toBe(7);
    });

    it("should reject with INSUFFICIENT_STOCK and change nothing when the OUTBOUND exceeds the stock", async () => {
      const { registerMovement, movementRepository, product } = setup(3);

      const registration = registerMovement.execute(saleInput);

      await expect(registration).rejects.toMatchObject({ code: "INSUFFICIENT_STOCK" });
      expect(product.stock).toBe(3);
      expect(movementRepository.stored).toHaveLength(0);
    });

    it("should answer without a movement when the counted stock matches the current one", async () => {
      const { registerMovement, movementRepository } = setup(10);

      const result = await registerMovement.execute({
        ...saleInput,
        type: "ADJUSTMENT",
        quantity: 10,
        reason: undefined,
      });

      expect(result).toEqual({ created: false, movement: null, stock: 10 });
      expect(movementRepository.stored).toHaveLength(0);
    });

    it("should return the existing movement without changing the stock twice when the key is repeated", async () => {
      const { registerMovement, movementRepository, product } = setup(10);
      const first = await registerMovement.execute(saleInput);

      const repeated = await registerMovement.execute(saleInput);

      expect(repeated).toEqual({ created: false, movement: first.movement, stock: 6 });
      expect(product.stock).toBe(6);
      expect(movementRepository.stored).toHaveLength(1);
    });

    it("should reject with IDEMPOTENCY_KEY_CONFLICT without revealing the movement when the key belongs to another business", async () => {
      const { registerMovement, movementRepository, product } = setup(10);
      await registerMovement.execute(saleInput);
      movementRepository.products.push({
        id: "product-b",
        businessId: "business-2",
        unit: "UNIT",
        stock: 10,
        isActive: true,
      });

      const registration = registerMovement.execute({
        ...saleInput,
        businessId: "business-2",
        userId: "user-2",
        productId: "product-b",
      });

      await expect(registration).rejects.toMatchObject({ code: "IDEMPOTENCY_KEY_CONFLICT" });
      expect(movementRepository.products[1]?.stock).toBe(10);
      expect(product.stock).toBe(6);
    });

    it("should reject with PRODUCT_NOT_FOUND when the product belongs to another business", async () => {
      const { registerMovement, product } = setup(10);

      const registration = registerMovement.execute({
        ...saleInput,
        businessId: "business-2",
      });

      await expect(registration).rejects.toMatchObject({ code: "PRODUCT_NOT_FOUND" });
      expect(product.stock).toBe(10);
    });

    it("should reject with PRODUCT_NOT_FOUND when the product is deactivated", async () => {
      const { registerMovement, product } = setup(10);
      product.isActive = false;

      const registration = registerMovement.execute(saleInput);

      await expect(registration).rejects.toMatchObject({ code: "PRODUCT_NOT_FOUND" });
    });

    it.each([
      ["half a unit", { quantity: 0.5 }],
      ["a zero OUTBOUND", { quantity: 0 }],
      ["three decimals", { quantity: 1.255 }],
    ])("should reject with INVALID_QUANTITY for %s", async (_case, override) => {
      const { registerMovement, movementRepository } = setup(10);

      const registration = registerMovement.execute({ ...saleInput, ...override });

      await expect(registration).rejects.toMatchObject({ code: "INVALID_QUANTITY" });
      expect(movementRepository.stored).toHaveLength(0);
    });

    it.each([
      ["an OUTBOUND without a reason", { type: "OUTBOUND", reason: undefined }],
      ["an INBOUND with a reason", { type: "INBOUND", reason: "SALE" }],
    ] as const)("should reject with VALIDATION_ERROR for %s", async (_case, override) => {
      const { registerMovement } = setup(10);

      const registration = registerMovement.execute({ ...saleInput, ...override });

      await expect(registration).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    });

    it("should recalculate with the fresh stock when it changed before recording", async () => {
      const { registerMovement, movementRepository, product } = setup(10);
      movementRepository.beforeRecord = () => {
        product.stock = 8;
        movementRepository.beforeRecord = undefined;
      };

      const result = await registerMovement.execute(saleInput);

      expect(result).toMatchObject({ created: true, stock: 4 });
      expect(product.stock).toBe(4);
    });

    it("should reject with INSUFFICIENT_STOCK when a concurrent sale left too little stock", async () => {
      const { registerMovement, movementRepository, product } = setup(10);
      movementRepository.beforeRecord = () => {
        product.stock = 2;
        movementRepository.beforeRecord = undefined;
      };

      const registration = registerMovement.execute(saleInput);

      await expect(registration).rejects.toMatchObject({ code: "INSUFFICIENT_STOCK" });
      expect(product.stock).toBe(2);
    });

    it("should give up when the stock keeps changing on every attempt", async () => {
      const { registerMovement, movementRepository, product } = setup(10);
      movementRepository.beforeRecord = () => {
        product.stock += 1;
      };

      const registration = registerMovement.execute(saleInput);

      await expect(registration).rejects.toThrow(String(MAX_STOCK_ATTEMPTS));
      expect(movementRepository.stored).toHaveLength(0);
    });

    it("should return the movement recorded by a concurrent request with the same key", async () => {
      const { registerMovement, movementRepository } = setup(10);
      const concurrent = {
        businessId: "business-1",
        movement: {
          id: "movement-concurrent",
          productId: PRODUCT_ID,
          userId: "user-1",
          type: "OUTBOUND" as const,
          reason: "SALE" as const,
          quantity: 4,
          resultingStock: 6,
          idempotencyKey: saleInput.idempotencyKey,
          unitPrice: null,
          revertsMovementId: null,
          createdAt: new Date(),
        },
      };
      movementRepository.beforeRecord = () => {
        movementRepository.stored.push(concurrent);
        movementRepository.beforeRecord = undefined;
      };

      const result = await registerMovement.execute(saleInput);

      expect(result).toEqual({ created: false, movement: concurrent.movement, stock: 6 });
      expect(movementRepository.stored).toHaveLength(1);
    });
  });
});
