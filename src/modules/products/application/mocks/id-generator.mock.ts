import type { IdGenerator } from "../ports/id-generator.port.ts";

export class IdGeneratorMock implements IdGenerator {
  private generated = 0;

  constructor(private readonly plannedIds: string[] = []) {}

  generate(): string {
    const id =
      this.plannedIds[this.generated] ??
      `INV-${String(this.generated + 1).padStart(10, "0")}`;
    this.generated += 1;
    return id;
  }
}
