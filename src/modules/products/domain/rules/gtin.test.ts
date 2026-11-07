import { classifyCode, hasValidGtinCheckDigit } from "./gtin.ts";

describe("hasValidGtinCheckDigit", () => {
  it("acepta EAN-13 y EAN-8 válidos", () => {
    expect(hasValidGtinCheckDigit("7702004003508")).toBe(true);
    expect(hasValidGtinCheckDigit("96385074")).toBe(true);
  });

  it("rechaza un dígito de control incorrecto", () => {
    expect(hasValidGtinCheckDigit("7702004003509")).toBe(false);
  });
});

describe("classifyCode", () => {
  it("reconoce identificadores internos", () => {
    expect(classifyCode("INV-7KQ2M9XA4T")).toBe("INTERNAL");
  });

  it("rechaza identificadores internos con letras excluidas", () => {
    expect(classifyCode("INV-7KQ2M9XA4I")).toBe("UNKNOWN");
  });

  it("reconoce GTIN válidos", () => {
    expect(classifyCode("7702004003508")).toBe("GTIN");
  });

  it("rechaza cualquier otro código", () => {
    expect(classifyCode("hola")).toBe("UNKNOWN");
  });
});
