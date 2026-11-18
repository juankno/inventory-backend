import type { ExternalCatalog } from "../application/ports/external-catalog.port.ts";
import type { CatalogEntry } from "../domain/product-suggestion.model.ts";

const BASE_URL = "https://world.openfoodfacts.org/api/v2/product";
const FIELDS = "product_name_es,product_name,brands,quantity,image_front_small_url";
// Solo se aceptan fotos del servidor de imágenes de Open Food Facts: la app nunca
// carga una dirección cualquiera que venga en los datos.
const IMAGE_URL_PATTERN = /^https:\/\/images\.openfoodfacts\.org\/[^\s"'<>]+$/;
const MAX_IMAGE_URL_LENGTH = 500;
// La pantalla de producto nuevo no debe quedarse esperando: si tarda, no hay sugerencia.
const TIMEOUT_MS = 2500;
// Open Food Facts pide identificar la aplicación. No se envía nada del negocio.
const USER_AGENT = "Surtido/0.1 (https://surtido-api.vercel.app)";
const MAX_NAME_LENGTH = 80;

export type OpenFoodFactsProduct = {
  product_name_es?: string;
  product_name?: string;
  brands?: string;
  quantity?: string;
  /** Miniatura de 200 px del frente del producto. */
  image_front_small_url?: string;
};

/** La foto del producto si es del servidor de imágenes de Open Food Facts; si no, null. */
export function imageUrlOf(product: OpenFoodFactsProduct): string | null {
  const url = product.image_front_small_url?.trim();
  return url && url.length <= MAX_IMAGE_URL_LENGTH && IMAGE_URL_PATTERN.test(url) ? url : null;
}

const clean = (text: string | undefined) => (text ?? "").replace(/\s+/g, " ").trim();

const includes = (text: string, part: string) =>
  text.toLocaleLowerCase("es").includes(part.toLocaleLowerCase("es"));

/** Recorta en el último espacio para no partir una palabra. */
function truncate(text: string): string {
  if (text.length <= MAX_NAME_LENGTH) return text;
  const cut = text.slice(0, MAX_NAME_LENGTH + 1);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : text.slice(0, MAX_NAME_LENGTH)).trim();
}

/**
 * Arma un nombre como lo escribiría el tendero: "Arroz Diana 500 g". Agrega la marca y
 * el contenido si el nombre no los trae. Devuelve null si no hay nombre útil.
 */
export function buildProductName(product: OpenFoodFactsProduct): string | null {
  let name = clean(product.product_name_es) || clean(product.product_name);
  if (!name) return null;

  const brand = clean(product.brands?.split(",")[0]);
  if (brand && !includes(name, brand)) name = `${name} ${brand}`;
  const quantity = clean(product.quantity);
  if (quantity && !includes(name, quantity)) name = `${name} ${quantity}`;

  name = truncate(name);
  return name.length >= 2 ? name : null;
}

export class OpenFoodFactsCatalog implements ExternalCatalog {
  constructor(private readonly fetchFn: typeof fetch = fetch) {}

  async findByGtin(code: string): Promise<CatalogEntry | null> {
    const response = await this.fetchFn(
      `${BASE_URL}/${encodeURIComponent(code)}.json?fields=${FIELDS}`,
      {
        headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      },
    );
    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error(`Open Food Facts respondió ${response.status}`);
    }

    const body = (await response.json()) as {
      status?: number;
      product?: OpenFoodFactsProduct;
    };
    if (body.status !== 1 || !body.product) return null;

    const name = buildProductName(body.product);
    // Los productos con código de barras vienen empacados: se venden por unidad.
    return name ? { name, unit: "UNIT", imageUrl: imageUrlOf(body.product) } : null;
  }
}
