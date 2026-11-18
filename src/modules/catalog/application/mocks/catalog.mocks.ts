import type { CatalogEntry } from "../../domain/product-suggestion.model.ts";
import type { CommunityCatalog } from "../ports/community-catalog.port.ts";
import type { ExternalCatalog } from "../ports/external-catalog.port.ts";

export class CommunityCatalogMock implements CommunityCatalog {
  entry: CatalogEntry | null = null;
  readonly calls: { code: string; excludeBusinessId: string; minBusinesses: number }[] = [];

  async findCommonEntry(
    code: string,
    excludeBusinessId: string,
    minBusinesses: number,
  ): Promise<CatalogEntry | null> {
    this.calls.push({ code, excludeBusinessId, minBusinesses });
    return this.entry;
  }
}

export class ExternalCatalogMock implements ExternalCatalog {
  entry: CatalogEntry | null = null;
  error: Error | null = null;
  readonly calls: string[] = [];

  async findByGtin(code: string): Promise<CatalogEntry | null> {
    this.calls.push(code);
    if (this.error) throw this.error;
    return this.entry;
  }
}
