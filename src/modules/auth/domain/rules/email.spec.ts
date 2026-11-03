import { normalizeEmail } from "./email.ts";

describe("normalizeEmail", () => {
  it("should trim surrounding spaces and convert the email to lowercase", () => {
    const email = "  Tienda.Rosa@Correo.COM ";

    const result = normalizeEmail(email);

    expect(result).toBe("tienda.rosa@correo.com");
  });

  it("should keep an already normalized email unchanged", () => {
    const email = "tienda@correo.com";

    const result = normalizeEmail(email);

    expect(result).toBe("tienda@correo.com");
  });

  it("should remove tabs and line breaks around the email", () => {
    const email = "\ttienda@correo.com\n";

    const result = normalizeEmail(email);

    expect(result).toBe("tienda@correo.com");
  });
});
