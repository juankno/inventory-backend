import { INTERNAL_CODE_PATTERN } from "../domain/rules/gtin.ts";
import { Base32IdGenerator } from "./base32-id-generator.ts";

describe("Base32IdGenerator", () => {
  describe("generate", () => {
    it("should return INV- followed by 10 Crockford base32 characters", () => {
      const generator = new Base32IdGenerator();

      const ids = Array.from({ length: 100 }, () => generator.generate());

      for (const id of ids) {
        expect(id).toMatch(INTERNAL_CODE_PATTERN);
      }
    });
  });
});
