import type { CachedEntry, CatalogEntry } from "../../domain/product-suggestion.model.ts";

/**
 * Respuestas de la base pública guardadas para no consultarla cada vez. Solo datos
 * públicos: nada de ningún negocio.
 */
export interface CatalogCache {
  find(code: string): Promise<CachedEntry | null>;
  /** Guarda o reemplaza la respuesta; `entry` null si la base pública no conocía el código. */
  save(code: string, entry: CatalogEntry | null, fetchedAt: Date): Promise<void>;
}
