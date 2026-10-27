import { INTERNAL_CODE_PATTERN } from "../domain/gtin.ts";
import { Base32IdGenerator } from "./Base32IdGenerator.ts";

describe("Base32IdGenerator", () => {
  it("genera identificadores con el formato INV- y 10 caracteres de Crockford", () => {
    const generator = new Base32IdGenerator();
    for (let i = 0; i < 100; i++) {
      expect(generator.generate()).toMatch(INTERNAL_CODE_PATTERN);
    }
  });
});
