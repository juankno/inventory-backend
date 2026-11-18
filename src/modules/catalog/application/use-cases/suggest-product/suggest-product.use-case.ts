import { AppError } from "../../../../../shared/errors/app-error.ts";
import { classifyCode } from "../../../../products/domain/rules/gtin.ts";
import {
  isFresh,
  MIN_BUSINESSES_FOR_SUGGESTION,
  type CachedEntry,
  type CatalogEntry,
  type ProductSuggestion,
  type PublicSource,
} from "../../../domain/product-suggestion.model.ts";
import type { CatalogCache } from "../../ports/catalog-cache.port.ts";
import type { CommunityCatalog } from "../../ports/community-catalog.port.ts";
import type { ExternalCatalog } from "../../ports/external-catalog.port.ts";

export interface SuggestProductInput {
  businessId: string;
  code: string;
}

/** De dónde salió la respuesta, para medir la cobertura en los logs. */
type Outcome = "COMMUNITY" | "CACHE" | PublicSource | "NOT_FOUND" | "EXTERNAL_ERROR";

/**
 * Sugiere el nombre y la unidad de un producto nuevo a partir de su código de barras,
 * para no escribirlos a mano. Es solo una ayuda: la app la ofrece y el usuario decide.
 *
 * Solo aplica a códigos de barras (GTIN). Los QR internos `INV-` son de cada negocio.
 * El orden es:
 * 1. Lo que usan otros negocios.
 * 2. La respuesta guardada de las bases públicas, si sigue vigente.
 * 3. Las bases públicas. Lo que responden se guarda, también si ninguna conoce el código.
 *    Si falla, no se guarda nada y se usa la respuesta guardada aunque esté vencida:
 *    registrar el producto no puede depender de un servicio externo.
 *
 * La tabla de respuestas guardadas es una ayuda: si no se puede leer o escribir, se
 * sigue como si no existiera.
 */
export class SuggestProduct {
  constructor(
    private readonly community: CommunityCatalog,
    private readonly cache: CatalogCache,
    private readonly external: ExternalCatalog,
  ) {}

  async execute(
    { businessId, code }: SuggestProductInput,
    now = new Date(),
  ): Promise<ProductSuggestion> {
    if (classifyCode(code) !== "GTIN") throw new AppError("SUGGESTION_NOT_FOUND");

    const shared = await this.community.findCommonEntry(
      code,
      businessId,
      MIN_BUSINESSES_FOR_SUGGESTION,
    );
    if (shared) return respond("COMMUNITY", shared);

    const cached = await this.cache.find(code).catch((error: unknown) => {
      console.warn("No se pudo leer el catálogo guardado", error);
      return null;
    });
    if (cached && isFresh(cached, now)) {
      return respond(cached.entry ? "CACHE" : "NOT_FOUND", cached.entry);
    }

    let entry: CatalogEntry | null;
    try {
      entry = await this.external.findByGtin(code);
    } catch (error) {
      console.warn("No se pudieron consultar las bases públicas de productos", error);
      return respond("EXTERNAL_ERROR", staleEntry(cached));
    }

    await this.cache.save(code, entry, now).catch((error: unknown) => {
      console.warn("No se pudo guardar la respuesta de las bases públicas", error);
    });
    return respond(entry ? (entry.source ?? "OPEN_FOOD_FACTS") : "NOT_FOUND", entry);
  }
}

/** Un nombre de hace meses es mejor que ninguno cuando las bases públicas no responden. */
const staleEntry = (cached: CachedEntry | null): CatalogEntry | null => cached?.entry ?? null;

/**
 * Deja en el log de dónde salió la respuesta (sin el código) y responde con la base
 * pública que conocía el producto.
 */
function respond(outcome: Outcome, entry: CatalogEntry | null): ProductSuggestion {
  console.info(`Sugerencia de producto: ${outcome}`);
  if (!entry) throw new AppError("SUGGESTION_NOT_FOUND");
  return {
    name: entry.name,
    unit: entry.unit,
    // Las sugerencias de otros negocios no traen foto.
    imageUrl: entry.imageUrl ?? null,
    imageLargeUrl: entry.imageLargeUrl ?? null,
    // Lo de otros negocios no trae base pública; lo guardado conserva la suya.
    source: outcome === "COMMUNITY" ? "COMMUNITY" : (entry.source ?? "OPEN_FOOD_FACTS"),
  };
}
