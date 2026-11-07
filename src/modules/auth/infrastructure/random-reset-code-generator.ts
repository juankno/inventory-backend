import { randomInt } from "node:crypto";

import type { ResetCodeGenerator } from "../application/ports/reset-code-generator.port.ts";

/** Código de 6 dígitos con un generador criptográfico (RS-04). */
export class RandomResetCodeGenerator implements ResetCodeGenerator {
  generate(): string {
    return randomInt(0, 1_000_000).toString().padStart(6, "0");
  }
}
