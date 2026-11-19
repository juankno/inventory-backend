// Fotos de producto que se aceptan: solo las de los servidores de imágenes de Open Food
// Facts y Open Beauty Facts, que llegan con la sugerencia al registrar un código de
// barras. El sistema no guarda archivos de fotos: guarda la dirección pública.
// Así nunca se muestra en la app una dirección cualquiera que alguien envíe.

const ALLOWED_HOSTS = ["images.openfoodfacts.org", "images.openbeautyfacts.org"];

export const MAX_IMAGE_URL_LENGTH = 500;

export const isAllowedProductImageUrl = (url: string): boolean =>
  url.length <= MAX_IMAGE_URL_LENGTH &&
  !/[\s"'<>]/.test(url) &&
  ALLOWED_HOSTS.some((host) => url.startsWith(`https://${host}/`));
