import { registerMovementSchema } from "./movements.schemas.ts";

const validBody = {
  productId: "3f1c2b9e-8a4d-4c1e-9b7a-2d5e6f708192",
  type: "OUTBOUND",
  quantity: 4,
  reason: "SALE",
  idempotencyKey: "a1b2c3d4-0000-4000-8000-000000000001",
};

describe("registerMovementSchema", () => {
  it("should accept a valid sale", () => {
    const result = registerMovementSchema.safeParse(validBody);

    expect(result.success).toBe(true);
  });

  it("should accept an INBOUND without a reason", () => {
    const { reason: _reason, ...body } = { ...validBody, type: "INBOUND" };

    const result = registerMovementSchema.safeParse(body);

    expect(result.success).toBe(true);
  });

  it("should leave the reason rules and the decimals to the domain", () => {
    const body = { ...validBody, type: "INBOUND", quantity: 0.5 };

    const result = registerMovementSchema.safeParse(body);

    expect(result.success).toBe(true);
  });

  it.each([
    ["a productId that is not a UUID", { productId: "product-1" }],
    ["an idempotencyKey that is not a UUID", { idempotencyKey: "123" }],
    ["a missing idempotencyKey", { idempotencyKey: undefined }],
    ["an unknown type", { type: "TRANSFER" }],
    ["an unknown reason", { reason: "GIFT" }],
    ["a negative quantity", { quantity: -1 }],
    ["a quantity sent as text", { quantity: "4" }],
    ["a quantity that does not fit in the database", { quantity: 10_000_000_000 }],
    ["a businessId", { businessId: "business-2" }],
    ["a userId", { userId: "user-2" }],
    ["a resultingStock chosen by the client", { resultingStock: 100 }],
  ])("should reject %s", (_case, override) => {
    const result = registerMovementSchema.safeParse({ ...validBody, ...override });

    expect(result.success).toBe(false);
  });
});
