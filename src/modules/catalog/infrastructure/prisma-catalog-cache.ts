import type { PrismaClient } from "../../../generated/prisma/client.ts";
import type { CatalogCache } from "../application/ports/catalog-cache.port.ts";
import type { CachedEntry, CatalogEntry } from "../domain/product-suggestion.model.ts";

const SOURCE = "OPEN_FOOD_FACTS";

export class PrismaCatalogCache implements CatalogCache {
  constructor(private readonly prisma: PrismaClient) {}

  async find(code: string): Promise<CachedEntry | null> {
    const row = await this.prisma.catalogEntry.findUnique({ where: { code } });
    if (!row) return null;
    // Sin nombre o sin unidad, la base pública no conocía el código.
    const entry =
      row.name && row.unit ? { name: row.name, unit: row.unit, imageUrl: row.imageUrl } : null;
    return { entry, fetchedAt: row.fetchedAt };
  }

  async save(code: string, entry: CatalogEntry | null, fetchedAt: Date): Promise<void> {
    const data = {
      name: entry?.name ?? null,
      unit: entry?.unit ?? null,
      imageUrl: entry?.imageUrl ?? null,
      source: SOURCE,
      fetchedAt,
    };
    await this.prisma.catalogEntry.upsert({
      where: { code },
      create: { code, ...data },
      update: data,
    });
  }
}
