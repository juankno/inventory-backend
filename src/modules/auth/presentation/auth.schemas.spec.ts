import { loginSchema, registerSchema } from "./auth.schemas.ts";

const validBody = {
  businessName: "Tienda Doña Rosa",
  ownerName: "Rosa Martínez",
  email: "rosa@correo.com",
  password: "secreta123",
  passwordConfirmation: "secreta123",
  acceptDataPolicy: true,
};

const validLoginBody = {
  email: "rosa@correo.com",
  password: "secreta123",
};

describe("registerSchema", () => {
  it("should accept a valid body", () => {
    const result = registerSchema.safeParse(validBody);

    expect(result.success).toBe(true);
  });

  it("should trim the names and the email", () => {
    const body = {
      ...validBody,
      businessName: "  Tienda Doña Rosa ",
      ownerName: " Rosa Martínez ",
      email: "  rosa@correo.com ",
    };

    const result = registerSchema.parse(body);

    expect(result).toMatchObject({
      businessName: "Tienda Doña Rosa",
      ownerName: "Rosa Martínez",
      email: "rosa@correo.com",
    });
  });

  it("should accept acceptDataPolicy false so the use case can reject it", () => {
    const result = registerSchema.safeParse({ ...validBody, acceptDataPolicy: false });

    expect(result.success).toBe(true);
  });

  it.each([
    ["an empty business name", { businessName: "   " }],
    ["a business name longer than 80 characters", { businessName: "a".repeat(81) }],
    ["an empty owner name", { ownerName: "" }],
    ["an owner name longer than 80 characters", { ownerName: "a".repeat(81) }],
    ["an invalid email", { email: "rosa-correo.com" }],
    ["an email longer than 254 characters", { email: `${"a".repeat(245)}@correo.com` }],
    ["a password shorter than 8 characters", { password: "1234567", passwordConfirmation: "1234567" }],
    ["a password confirmation that does not match", { passwordConfirmation: "otraClave" }],
    ["a missing field", { acceptDataPolicy: undefined }],
    ["an unknown field like businessId", { businessId: "business-1" }],
  ])("should reject %s", (_case, override) => {
    const result = registerSchema.safeParse({ ...validBody, ...override });

    expect(result.success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("should accept a valid body", () => {
    const result = loginSchema.safeParse(validLoginBody);

    expect(result.success).toBe(true);
  });

  it("should trim the email", () => {
    const body = { ...validLoginBody, email: "  rosa@correo.com " };

    const result = loginSchema.parse(body);

    expect(result.email).toBe("rosa@correo.com");
  });

  it("should accept a password shorter than 8 characters so the use case answers INVALID_CREDENTIALS", () => {
    const result = loginSchema.safeParse({ ...validLoginBody, password: "1234" });

    expect(result.success).toBe(true);
  });

  it.each([
    ["an invalid email", { email: "rosa-correo.com" }],
    ["an email longer than 254 characters", { email: `${"a".repeat(245)}@correo.com` }],
    ["an empty password", { password: "" }],
    ["a missing field", { password: undefined }],
    ["an unknown field like businessId", { businessId: "business-1" }],
  ])("should reject %s", (_case, override) => {
    const result = loginSchema.safeParse({ ...validLoginBody, ...override });

    expect(result.success).toBe(false);
  });
});
