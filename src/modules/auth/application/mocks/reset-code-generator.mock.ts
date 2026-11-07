import type { ResetCodeGenerator } from "../ports/reset-code-generator.port.ts";

export class ResetCodeGeneratorMock implements ResetCodeGenerator {
  constructor(private readonly code = "123456") {}

  generate(): string {
    return this.code;
  }
}
