import type { ExternalCatalog } from "../application/ports/external-catalog.port.ts";
import type { CatalogEntry } from "../domain/product-suggestion.model.ts";

/**
 * Consulta varias bases a la vez y responde con la primera de la lista que conozca el
 * código. Van en paralelo para que la espera sea la de la más lenta, no la suma.
 *
 * Si ninguna lo conoce pero alguna falló, falla: así no se guarda como "no existe" un
 * código que quizás la base caída sí conocía.
 */
export class FirstMatchCatalog implements ExternalCatalog {
  constructor(private readonly catalogs: ExternalCatalog[]) {}

  async findByGtin(code: string): Promise<CatalogEntry | null> {
    const results = await Promise.allSettled(this.catalogs.map((catalog) => catalog.findByGtin(code)));
    for (const result of results) {
      if (result.status === "fulfilled" && result.value) return result.value;
    }
    const failure = results.find((result) => result.status === "rejected");
    if (failure) throw failure.reason;
    return null;
  }
}
