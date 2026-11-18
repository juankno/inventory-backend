import type { ExternalCatalog } from "../application/ports/external-catalog.port.ts";
import type { CatalogEntry, PublicSource } from "../domain/product-suggestion.model.ts";

/**
 * Bases públicas del proyecto Open Food Facts. Comparten la misma API; cambia el
 * dominio y el servidor de imágenes.
 * - Open Food Facts: alimentos y bebidas.
 * - Open Beauty Facts: cuidado personal y cosméticos (champú, cremas, protector
 *   solar), que en una farmacia es buena parte de lo que se vende.
 */
export interface OpenFactsSite {
  source: PublicSource;
  /** Nombre para los mensajes de error y los logs. */
  label: string;
  apiUrl: string;
  /** Solo se aceptan fotos de este servidor. */
  imageHost: string;
}

export const OPEN_FOOD_FACTS: OpenFactsSite = {
  source: "OPEN_FOOD_FACTS",
  label: "Open Food Facts",
  apiUrl: "https://world.openfoodfacts.org/api/v2/product",
  imageHost: "images.openfoodfacts.org",
};

export const OPEN_BEAUTY_FACTS: OpenFactsSite = {
  source: "OPEN_BEAUTY_FACTS",
  label: "Open Beauty Facts",
  apiUrl: "https://world.openbeautyfacts.org/api/v2/product",
  imageHost: "images.openbeautyfacts.org",
};

const FIELDS =
  "product_name_es,product_name,brands,quantity,image_front_small_url,image_front_url";
const MAX_IMAGE_URL_LENGTH = 500;
// Suele responder en 0,5 s, pero a veces tarda más. La sugerencia no detiene la
// pantalla de producto nuevo (se puede escribir mientras llega), así que se le da
// margen; si pasa de 4 s, se sigue sin sugerencia.
const TIMEOUT_MS = 4000;
// Estas bases piden identificar la aplicación. No se envía nada del negocio.
const USER_AGENT = "Surtido/0.1 (https://surtido-api.vercel.app)";
const MAX_NAME_LENGTH = 80;

export type OpenFactsProduct = {
  product_name_es?: string;
  product_name?: string;
  brands?: string;
  quantity?: string;
  /** Miniatura de 200 px del frente del producto. */
  image_front_small_url?: string;
  /** La misma foto en 400 px. */
  image_front_url?: string;
};

/**
 * La foto en su tamaño original, para verla en pantalla completa. La "400" mide 400 px
 * por el lado más largo y se ve borrosa en un celular. La original tiene la misma
 * dirección que la miniatura, terminada en `.full.jpg`.
 */
export function fullSizeUrl(thumbnailUrl: string): string | null {
  return /\.200\.jpg$/.test(thumbnailUrl) ? thumbnailUrl.replace(/\.200\.jpg$/, ".full.jpg") : null;
}

/**
 * La dirección si es del servidor de imágenes indicado; si no, null. La app nunca carga
 * una dirección cualquiera que venga en los datos.
 */
export function safeImageUrl(
  value: string | undefined,
  imageHost = OPEN_FOOD_FACTS.imageHost,
): string | null {
  const url = value?.trim();
  if (!url || url.length > MAX_IMAGE_URL_LENGTH || /[\s"'<>]/.test(url)) return null;
  return url.startsWith(`https://${imageHost}/`) ? url : null;
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
export function buildProductName(product: OpenFactsProduct): string | null {
  let name = clean(product.product_name_es) || clean(product.product_name);
  if (!name) return null;

  const brand = clean(product.brands?.split(",")[0]);
  if (brand && !includes(name, brand)) name = `${name} ${brand}`;
  const quantity = clean(product.quantity);
  if (quantity && !includes(name, quantity)) name = `${name} ${quantity}`;

  name = truncate(name);
  return name.length >= 2 ? name : null;
}

/** Consulta un producto por código de barras en una de las bases de Open Food Facts. */
export class OpenFactsCatalog implements ExternalCatalog {
  constructor(
    private readonly site: OpenFactsSite,
    private readonly fetchFn: typeof fetch = fetch,
  ) {}

  async findByGtin(code: string): Promise<CatalogEntry | null> {
    const response = await this.fetchFn(
      `${this.site.apiUrl}/${encodeURIComponent(code)}.json?fields=${FIELDS}`,
      {
        headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      },
    );
    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error(`${this.site.label} respondió ${response.status}`);
    }

    const body = (await response.json()) as {
      status?: number;
      product?: OpenFactsProduct;
    };
    if (body.status !== 1 || !body.product) return null;

    const name = buildProductName(body.product);
    if (!name) return null;
    const imageUrl = safeImageUrl(body.product.image_front_small_url, this.site.imageHost);
    return {
      name,
      // Los productos con código de barras vienen empacados: se venden por unidad.
      unit: "UNIT",
      source: this.site.source,
      imageUrl,
      // Sin miniatura no hay qué ampliar. Si la miniatura no tiene la forma esperada, se
      // usa la de 400 px; sin ninguna, la app amplía la miniatura.
      imageLargeUrl: imageUrl
        ? (fullSizeUrl(imageUrl) ?? safeImageUrl(body.product.image_front_url, this.site.imageHost))
        : null,
    };
  }
}

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
