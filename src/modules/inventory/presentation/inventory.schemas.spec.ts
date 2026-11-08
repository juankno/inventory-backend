import {
  listInventoryQuerySchema,
  movementHistoryQuerySchema,
  productIdParamsSchema,
} from "./inventory.schemas.ts";

const PRODUCT_ID = "3f1c2b9e-8a4d-4c1e-9b7a-2d5e6f708192";

describe("productIdParamsSchema", () => {
  it("should accept a UUID", () => {
    const result = productIdParamsSchema.safeParse({ id: PRODUCT_ID });

    expect(result.success).toBe(true);
  });

  it.each(["product-1", "low-stock", ""])("should reject the id %j", (id) => {
    const result = productIdParamsSchema.safeParse({ id });

    expect(result.success).toBe(false);
  });
});

describe("listInventoryQuerySchema", () => {
  it("should accept a query without search", () => {
    const result = listInventoryQuerySchema.safeParse({});

    expect(result.success).toBe(true);
  });

  it("should trim the search", () => {
    const result = listInventoryQuerySchema.parse({ search: "  arroz " });

    expect(result.search).toBe("arroz");
  });

  it.each([
    ["a search longer than 80 characters", { search: "a".repeat(81) }],
    ["a repeated search parameter", { search: ["arroz", "panela"] }],
    ["an unknown parameter", { businessId: "business-2" }],
  ])("should reject %s", (_case, query) => {
    const result = listInventoryQuerySchema.safeParse(query);

    expect(result.success).toBe(false);
  });
});

describe("movementHistoryQuerySchema", () => {
  it("should accept a query without cursor", () => {
    const result = movementHistoryQuerySchema.safeParse({});

    expect(result.success).toBe(true);
  });

  it("should accept a UUID cursor", () => {
    const result = movementHistoryQuerySchema.safeParse({ cursor: PRODUCT_ID });

    expect(result.success).toBe(true);
  });

  it("should reject a cursor that is not a UUID", () => {
    const result = movementHistoryQuerySchema.safeParse({ cursor: "50" });

    expect(result.success).toBe(false);
  });
});
