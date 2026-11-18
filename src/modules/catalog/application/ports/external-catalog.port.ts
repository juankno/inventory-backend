import type { CatalogEntry } from "../../domain/product-suggestion.model.ts";

/** Base pública de productos por código de barras. */
export interface ExternalCatalog {
  /** Devuelve null si no conoce el código. Puede fallar si el servicio no responde. */
  findByGtin(code: string): Promise<CatalogEntry | null>;
}
