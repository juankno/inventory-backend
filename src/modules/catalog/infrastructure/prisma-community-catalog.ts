import type { PrismaClient } from "../../../generated/prisma/client.ts";
import type { Unit } from "../../../shared/domain/quantity.ts";
import type { CommunityCatalog } from "../application/ports/community-catalog.port.ts";
import type { CatalogEntry } from "../domain/product-suggestion.model.ts";

type Row = { name: string; unit: Unit };

/**
 * Agrupa por nombre normalizado (sin importar mayúsculas ni espacios) y unidad, y solo
 * devuelve un grupo que usen al menos `minBusinesses` negocios distintos. De cada
 * grupo devuelve la forma de escribirlo más común. La consulta no lee precios, costos,
 * existencias ni el negocio: solo cuántos negocios coinciden.
 */
export class PrismaCommunityCatalog implements CommunityCatalog {
  constructor(private readonly prisma: PrismaClient) {}

  async findCommonEntry(
    code: string,
    excludeBusinessId: string,
    minBusinesses: number,
  ): Promise<CatalogEntry | null> {
    const rows = await this.prisma.$queryRaw<Row[]>`
      SELECT mode() WITHIN GROUP (ORDER BY btrim(p.name)) AS name, p.unit::text AS unit
      FROM products p
      WHERE p.code = ${code}
        AND p.code_type = 'GTIN'
        AND p.is_active
        AND p.business_id <> ${excludeBusinessId}::uuid
      GROUP BY lower(regexp_replace(btrim(p.name), '[[:space:]]+', ' ', 'g')), p.unit
      HAVING COUNT(DISTINCT p.business_id) >= ${minBusinesses}
      ORDER BY COUNT(DISTINCT p.business_id) DESC, name ASC
      LIMIT 1
    `;
    const row = rows[0];
    return row ? { name: row.name, unit: row.unit } : null;
  }
}
