import { AppError } from "../../../../../shared/errors/app-error.ts";
import { classifyCode } from "../../../../products/domain/rules/gtin.ts";
import {
  MIN_BUSINESSES_FOR_SUGGESTION,
  type ProductSuggestion,
} from "../../../domain/product-suggestion.model.ts";
import type { CommunityCatalog } from "../../ports/community-catalog.port.ts";
import type { ExternalCatalog } from "../../ports/external-catalog.port.ts";

export interface SuggestProductInput {
  businessId: string;
  code: string;
}

/**
 * Sugiere el nombre y la unidad de un producto nuevo a partir de su código de barras,
 * para no escribirlos a mano. Es solo una ayuda: la app la ofrece y el usuario decide.
 *
 * Solo aplica a códigos de barras (GTIN). Los QR internos `INV-` son de cada negocio.
 * Primero busca lo que usan otros negocios y luego la base pública. Si la base pública
 * no responde, se sigue como si no conociera el código: registrar el producto no
 * puede depender de un servicio externo.
 */
export class SuggestProduct {
  constructor(
    private readonly community: CommunityCatalog,
    private readonly external: ExternalCatalog,
  ) {}

  async execute({ businessId, code }: SuggestProductInput): Promise<ProductSuggestion> {
    if (classifyCode(code) !== "GTIN") throw new AppError("SUGGESTION_NOT_FOUND");

    const shared = await this.community.findCommonEntry(
      code,
      businessId,
      MIN_BUSINESSES_FOR_SUGGESTION,
    );
    if (shared) return { ...shared, source: "COMMUNITY" };

    const external = await this.external.findByGtin(code).catch((error: unknown) => {
      console.warn("No se pudo consultar la base pública de productos", error);
      return null;
    });
    if (external) return { ...external, source: "OPEN_FOOD_FACTS" };

    throw new AppError("SUGGESTION_NOT_FOUND");
  }
}
