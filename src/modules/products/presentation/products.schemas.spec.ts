import { codeParamsSchema, createProductSchema } from "./products.schemas.ts";

const validBody = {
  name: "Arroz Diana 500 g",
  unit: "UNIT",
  stock: 24,
  salePrice: 3500,
  minStock: 6,
  code: "7702004003508",
};

describe("createProductSchema", () => {
  it("should accept a valid body", () => {
    const result = createProductSchema.safeParse(validBody);

    expect(result.success).toBe(true);
  });

  it("should accept a body with only the required fields", () => {
    const body = { name: "Panela", unit: "UNIT", stock: 0 };

    const result = createProductSchema.safeParse(body);

    expect(result.success).toBe(true);
  });

  it("should trim the name and the code", () => {
    const body = { ...validBody, name: "  Arroz Diana 500 g ", code: " 7702004003508 " };

    const result = createProductSchema.parse(body);

    expect(result.name).toBe("Arroz Diana 500 g");
    expect(result.code).toBe("7702004003508");
  });

  it("should leave the check digit and the decimals to the domain", () => {
    const body = { ...validBody, code: "7702004003509", stock: 2.5 };

    const result = createProductSchema.safeParse(body);

    expect(result.success).toBe(true);
  });

  it.each([
    ["a name shorter than 2 characters", { name: " A " }],
    ["a name longer than 80 characters", { name: "a".repeat(81) }],
    ["an unknown unit", { unit: "BOX" }],
    ["a negative stock", { stock: -1 }],
    ["a stock sent as text", { stock: "24" }],
    ["a missing stock", { stock: undefined }],
    ["a negative sale price", { salePrice: -100 }],
    ["a negative minimum stock", { minStock: -1 }],
    ["an amount that does not fit in the database", { salePrice: 10_000_000_000 }],
    ["an empty code", { code: "  " }],
    ["a code longer than 32 characters", { code: "1".repeat(33) }],
    ["a businessId", { businessId: "business-2" }],
    ["a codeType", { codeType: "INTERNAL" }],
    ["an id chosen by the client", { id: "product-1" }],
  ])("should reject %s", (_case, override) => {
    const result = createProductSchema.safeParse({ ...validBody, ...override });

    expect(result.success).toBe(false);
  });
});

describe("codeParamsSchema", () => {
  it.each(["7702004003508", "INV-7KQ2M9XA4T"])("should accept the code %s", (code) => {
    const result = codeParamsSchema.safeParse({ code });

    expect(result.success).toBe(true);
  });

  it("should trim the code", () => {
    const params = { code: "  INV-7KQ2M9XA4T " };

    const result = codeParamsSchema.parse(params);

    expect(result.code).toBe("INV-7KQ2M9XA4T");
  });

  it.each(["", "   "])("should reject an empty code %j", (code) => {
    const result = codeParamsSchema.safeParse({ code });

    expect(result.success).toBe(false);
  });

  it("should reject a code longer than 32 characters", () => {
    const params = { code: "1".repeat(33) };

    const result = codeParamsSchema.safeParse(params);

    expect(result.success).toBe(false);
  });

  it("should reject the code sent as a plain string instead of the params object", () => {
    const result = codeParamsSchema.safeParse("7702004003508");

    expect(result.success).toBe(false);
  });
});
