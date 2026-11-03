import bcrypt from "bcrypt";

import { BcryptPasswordHasher } from "./bcrypt-password-hasher.ts";

describe("BcryptPasswordHasher", () => {
  describe("hash", () => {
    it("should return a hash different from the plain password", async () => {
      const hasher = new BcryptPasswordHasher();

      const hash = await hasher.hash("secreta123");

      expect(hash).not.toBe("secreta123");
    });

    it("should return a hash that bcrypt validates against the original password", async () => {
      const hasher = new BcryptPasswordHasher();

      const hash = await hasher.hash("secreta123");

      await expect(bcrypt.compare("secreta123", hash)).resolves.toBe(true);
    });

    it("should return a hash that bcrypt rejects for a different password", async () => {
      const hasher = new BcryptPasswordHasher();

      const hash = await hasher.hash("secreta123");

      await expect(bcrypt.compare("otraClave456", hash)).resolves.toBe(false);
    });

    it("should use at least 10 salt rounds", async () => {
      const hasher = new BcryptPasswordHasher();

      const hash = await hasher.hash("secreta123");

      expect(bcrypt.getRounds(hash)).toBeGreaterThanOrEqual(10);
    });

    it("should produce a different hash each time for the same password", async () => {
      const hasher = new BcryptPasswordHasher();

      const first = await hasher.hash("secreta123");
      const second = await hasher.hash("secreta123");

      expect(first).not.toBe(second);
    });
  });
});
