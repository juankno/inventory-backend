import type { Unit } from "../../../shared/domain/quantity.ts";

/**
 * Bases públicas que se consultan:
 * - OPEN_FOOD_FACTS: alimentos y bebidas, https://world.openfoodfacts.org.
 * - OPEN_BEAUTY_FACTS: cuidado personal y cosméticos, https://world.openbeautyfacts.org.
 */
export type PublicSource = "OPEN_FOOD_FACTS" | "OPEN_BEAUTY_FACTS";

export const PUBLIC_SOURCES: readonly PublicSource[] = ["OPEN_FOOD_FACTS", "OPEN_BEAUTY_FACTS"];

/**
 * De dónde sale la sugerencia: COMMUNITY es el nombre que usan varios negocios para ese
 * código de barras; las demás, la base pública que lo conocía.
 */
export type SuggestionSource = "COMMUNITY" | PublicSource;

/** Solo datos que no son privados de ningún negocio: nunca precio, costo ni existencias. */
export interface CatalogEntry {
  name: string;
  unit: Unit;
  /**
   * Foto del frente del producto, solo de las bases públicas. Sirve para confirmar que
   * el código es de ese producto; no se guarda en el inventario.
   */
  imageUrl?: string | null;
  /** La misma foto en tamaño original, para verla en pantalla completa. */
  imageLargeUrl?: string | null;
  /** Qué base pública lo conocía. Sin ella, es lo que usan otros negocios. */
  source?: PublicSource;
}

export interface ProductSuggestion extends Omit<CatalogEntry, "source"> {
  source: SuggestionSource;
  imageUrl: string | null;
  imageLargeUrl: string | null;
}

/**
 * Cuántos negocios distintos deben usar el mismo nombre para un código antes de
 * sugerirlo. Así no se muestra el texto que escribió un solo negocio (que puede
 * llevar datos propios) ni se revela qué vende un negocio en particular.
 */
export const MIN_BUSINESSES_FOR_SUGGESTION = 3;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Cuánto sirve una respuesta guardada de las bases públicas antes de volver a consultarlas. */
export const FOUND_TTL_DAYS = 90;
/**
 * Un código que ninguna base pública conoce se vuelve a consultar antes, por si
 * alguien lo agrega.
 */
export const NOT_FOUND_TTL_DAYS = 7;

/** Respuesta guardada de las bases públicas: `entry` es null si ninguna conocía el código. */
export interface CachedEntry {
  entry: CatalogEntry | null;
  fetchedAt: Date;
}

export const isFresh = ({ entry, fetchedAt }: CachedEntry, now: Date): boolean =>
  now.getTime() - fetchedAt.getTime() <
  (entry ? FOUND_TTL_DAYS : NOT_FOUND_TTL_DAYS) * DAY_MS;
