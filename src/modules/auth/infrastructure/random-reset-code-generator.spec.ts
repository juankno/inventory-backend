import { RandomResetCodeGenerator } from "./random-reset-code-generator.ts";

describe("RandomResetCodeGenerator", () => {
  it("should always return 6 digits, keeping leading zeros", () => {
    const generator = new RandomResetCodeGenerator();

    for (let i = 0; i < 500; i++) {
      expect(generator.generate()).toMatch(/^\d{6}$/);
    }
  });
});
