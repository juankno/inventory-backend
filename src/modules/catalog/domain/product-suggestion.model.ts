import type { Unit } from "../../../shared/domain/quantity.ts";

/**
 * De dónde sale la sugerencia:
 * - COMMUNITY: el nombre que usan varios negocios para ese código de barras.
 * - OPEN_FOOD_FACTS: la base pública de productos https://world.openfoodfacts.org.
 */
export type SuggestionSource = "COMMUNITY" | "OPEN_FOOD_FACTS";

/** Solo datos que no son privados de ningún negocio: nunca precio, costo ni existencias. */
export interface CatalogEntry {
  name: string;
  unit: Unit;
  /**
   * Foto del frente del producto, solo de la base pública. Sirve para confirmar que
   * el código es de ese producto; no se guarda en el inventario.
   */
  imageUrl?: string | null;
}

export interface ProductSuggestion extends CatalogEntry {
  source: SuggestionSource;
  imageUrl: string | null;
}

/**
 * Cuántos negocios distintos deben usar el mismo nombre para un código antes de
 * sugerirlo. Así no se muestra el texto que escribió un solo negocio (que puede
 * llevar datos propios) ni se revela qué vende un negocio en particular.
 */
export const MIN_BUSINESSES_FOR_SUGGESTION = 3;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Cuánto sirve una respuesta guardada de la base pública antes de volver a consultarla. */
export const FOUND_TTL_DAYS = 90;
/**
 * Un código que la base pública no conoce se vuelve a consultar antes, por si
 * alguien lo agrega.
 */
export const NOT_FOUND_TTL_DAYS = 7;

/** Respuesta guardada de la base pública: `entry` es null si no conocía el código. */
export interface CachedEntry {
  entry: CatalogEntry | null;
  fetchedAt: Date;
}

export const isFresh = ({ entry, fetchedAt }: CachedEntry, now: Date): boolean =>
  now.getTime() - fetchedAt.getTime() <
  (entry ? FOUND_TTL_DAYS : NOT_FOUND_TTL_DAYS) * DAY_MS;
