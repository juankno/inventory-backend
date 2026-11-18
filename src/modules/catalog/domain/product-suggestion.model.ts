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
}

export interface ProductSuggestion extends CatalogEntry {
  source: SuggestionSource;
}

/**
 * Cuántos negocios distintos deben usar el mismo nombre para un código antes de
 * sugerirlo. Así no se muestra el texto que escribió un solo negocio (que puede
 * llevar datos propios) ni se revela qué vende un negocio en particular.
 */
export const MIN_BUSINESSES_FOR_SUGGESTION = 3;
