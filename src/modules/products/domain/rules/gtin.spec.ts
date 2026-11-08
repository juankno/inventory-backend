import {
  classifyCode,
  hasValidGtinCheckDigit,
  isRegistrableGtin,
} from "./gtin.ts";

describe("hasValidGtinCheckDigit", () => {
  it.each([
    ["an EAN-13", "7702004003508"],
    ["an EAN-8", "96385074"],
  ])("should accept %s with a valid check digit", (_case, code) => {
    const result = hasValidGtinCheckDigit(code);

    expect(result).toBe(true);
  });

  it("should reject a wrong check digit", () => {
    const code = "7702004003509";

    const result = hasValidGtinCheckDigit(code);

    expect(result).toBe(false);
  });

  it.each([
    ["letters", "77020040035AB"],
    ["an unsupported length", "770200400"],
    ["an empty string", ""],
  ])("should reject a code with %s", (_case, code) => {
    const result = hasValidGtinCheckDigit(code);

    expect(result).toBe(false);
  });
});

describe("isRegistrableGtin", () => {
  it.each([
    ["an EAN-13", "7702004003508"],
    ["an EAN-8", "96385074"],
  ])("should accept %s with a valid check digit", (_case, code) => {
    const result = isRegistrableGtin(code);

    expect(result).toBe(true);
  });

  it.each([
    ["a wrong check digit", "7702004003509"],
    ["a UPC-A the app did not normalize to 13 digits", "036000291452"],
    ["a GTIN-14", "17702004003505"],
    ["an internal identifier", "INV-7KQ2M9XA4T"],
  ])("should reject %s", (_case, code) => {
    const result = isRegistrableGtin(code);

    expect(result).toBe(false);
  });
});

describe("classifyCode", () => {
  it("should classify an internal identifier as INTERNAL", () => {
    const code = "INV-7KQ2M9XA4T";

    const result = classifyCode(code);

    expect(result).toBe("INTERNAL");
  });

  it("should classify an internal identifier with excluded letters as UNKNOWN", () => {
    const code = "INV-7KQ2M9XA4I";

    const result = classifyCode(code);

    expect(result).toBe("UNKNOWN");
  });

  it("should classify a valid GTIN as GTIN", () => {
    const code = "7702004003508";

    const result = classifyCode(code);

    expect(result).toBe("GTIN");
  });

  it("should classify any other text as UNKNOWN", () => {
    const code = "hola";

    const result = classifyCode(code);

    expect(result).toBe("UNKNOWN");
  });
});
