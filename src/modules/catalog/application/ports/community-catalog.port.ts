import type { CatalogEntry } from "../../domain/product-suggestion.model.ts";

/** Nombres que usan los negocios para un código de barras, sin datos de ningún negocio. */
export interface CommunityCatalog {
  /**
   * El nombre y la unidad más usados para el código entre los productos activos de
   * los demás negocios, si al menos `minBusinesses` negocios distintos los usan.
   */
  findCommonEntry(
    code: string,
    excludeBusinessId: string,
    minBusinesses: number,
  ): Promise<CatalogEntry | null>;
}
