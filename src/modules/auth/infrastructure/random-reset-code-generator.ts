import { randomInt } from "node:crypto";

import type { ResetCodeGenerator } from "../application/ports/reset-code-generator.port.ts";

export class RandomResetCodeGenerator implements ResetCodeGenerator {
  generate(): string {
    return randomInt(0, 1_000_000).toString().padStart(6, "0");
  }
}
