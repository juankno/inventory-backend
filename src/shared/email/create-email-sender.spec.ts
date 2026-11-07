import { loadConfig } from "../infrastructure/config.ts";
import { ConsoleEmailSender } from "./console-email-sender.ts";
import { createEmailSender } from "./create-email-sender.ts";
import { ResendEmailSender } from "./resend-email-sender.ts";

const baseEnv = {
  DATABASE_URL: "postgresql://localhost/test",
  JWT_SECRET: "una-clave-de-prueba-larga",
};

describe("createEmailSender", () => {
  it("should use Resend when EMAIL_PROVIDER is resend", () => {
    const config = loadConfig({
      ...baseEnv,
      EMAIL_PROVIDER: "resend",
      RESEND_API_KEY: "re_clave",
    });

    expect(createEmailSender(config)).toBeInstanceOf(ResendEmailSender);
  });

  it("should use the console when EMAIL_PROVIDER is console", () => {
    const config = loadConfig({
      ...baseEnv,
      EMAIL_PROVIDER: "console",
      RESEND_API_KEY: "re_clave",
    });

    expect(createEmailSender(config)).toBeInstanceOf(ConsoleEmailSender);
  });

  it("should default to Resend when only RESEND_API_KEY is set", () => {
    const config = loadConfig({ ...baseEnv, RESEND_API_KEY: "re_clave" });

    expect(config.EMAIL_PROVIDER).toBe("resend");
    expect(createEmailSender(config)).toBeInstanceOf(ResendEmailSender);
  });

  it("should default to the console when no provider is configured", () => {
    const config = loadConfig({ ...baseEnv, EMAIL_PROVIDER: "" });

    expect(config.EMAIL_PROVIDER).toBe("console");
    expect(createEmailSender(config)).toBeInstanceOf(ConsoleEmailSender);
  });

  it("should reject resend without RESEND_API_KEY", () => {
    expect(() =>
      loadConfig({ ...baseEnv, EMAIL_PROVIDER: "resend" }),
    ).toThrow("RESEND_API_KEY");
  });

  it("should reject an unknown provider", () => {
    expect(() =>
      loadConfig({ ...baseEnv, EMAIL_PROVIDER: "carrier-pigeon" }),
    ).toThrow("EMAIL_PROVIDER");
  });
});
