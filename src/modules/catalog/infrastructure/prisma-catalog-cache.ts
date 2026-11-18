import type { PrismaClient } from "../../../generated/prisma/client.ts";
import type { CatalogCache } from "../application/ports/catalog-cache.port.ts";
import {
  PUBLIC_SOURCES,
  type CachedEntry,
  type CatalogEntry,
  type PublicSource,
} from "../domain/product-suggestion.model.ts";

const isPublicSource = (value: string): value is PublicSource =>
  (PUBLIC_SOURCES as readonly string[]).includes(value);

export class PrismaCatalogCache implements CatalogCache {
  constructor(private readonly prisma: PrismaClient) {}

  async find(code: string): Promise<CachedEntry | null> {
    const row = await this.prisma.catalogEntry.findUnique({ where: { code } });
    if (!row) return null;
    // Sin nombre o sin unidad, ninguna base pública conocía el código.
    const entry =
      row.name && row.unit
        ? {
            name: row.name,
            unit: row.unit,
            imageUrl: row.imageUrl,
            imageLargeUrl: row.imageLargeUrl,
            // Las filas anteriores a Open Beauty Facts son todas de Open Food Facts.
            source: isPublicSource(row.source) ? row.source : "OPEN_FOOD_FACTS",
          }
        : null;
    return { entry, fetchedAt: row.fetchedAt };
  }

  async save(code: string, entry: CatalogEntry | null, fetchedAt: Date): Promise<void> {
    const data = {
      name: entry?.name ?? null,
      unit: entry?.unit ?? null,
      imageUrl: entry?.imageUrl ?? null,
      imageLargeUrl: entry?.imageLargeUrl ?? null,
      // Un "no encontrado" se consultó en todas las bases públicas.
      source: entry?.source ?? "OPEN_FOOD_FACTS",
      fetchedAt,
    };
    await this.prisma.catalogEntry.upsert({
      where: { code },
      create: { code, ...data },
      update: data,
    });
  }
}
