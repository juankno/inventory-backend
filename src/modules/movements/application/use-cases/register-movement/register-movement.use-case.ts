import { hasAtMostTwoDecimals } from "../../../../../shared/domain/quantity.ts";
import { AppError } from "../../../../../shared/errors/app-error.ts";
import type {
  Movement,
  MovementType,
  OutboundReason,
} from "../../../domain/models/movement.model.ts";
import {
  calculateStockChange,
  hasValidReason,
  isValidMovementQuantity,
} from "../../../domain/rules/stock-change.ts";
import type { MovementRepository } from "../../ports/movement.repository.ts";

export const MAX_STOCK_ATTEMPTS = 3;

export interface RegisterMovementInput {
  businessId: string;
  userId: string;
  productId: string;
  type: MovementType;
  quantity: number;
  reason?: OutboundReason;
  idempotencyKey: string;
  /** Solo en los ajustes de "Deshacer": el movimiento que este ajuste revierte. */
  revertsMovementId?: string;
  /**
   * Solo en las salidas: el costo unitario de esta salida. Sin él se usa el costo
   * del producto; si es distinto, queda como el nuevo costo del producto.
   */
  unitCost?: number;
  /**
   * Solo en las salidas: el precio de venta unitario de esta salida. Sin él se usa el
   * precio del producto; si es distinto, queda como el nuevo precio del producto.
   */
  unitPrice?: number;
}

export interface RegisterMovementResult {
  created: boolean;
  movement: Movement | null;
  stock: number;
}

export class RegisterMovement {
  constructor(private readonly movementRepository: MovementRepository) {}

  async execute(data: RegisterMovementInput): Promise<RegisterMovementResult> {
    if (!hasValidReason(data.type, data.reason)) {
      throw new AppError("VALIDATION_ERROR");
    }
    if (data.revertsMovementId !== undefined && data.type !== "ADJUSTMENT") {
      throw new AppError("VALIDATION_ERROR");
    }
    for (const amount of [data.unitCost, data.unitPrice]) {
      if (amount === undefined) continue;
      if (data.type !== "OUTBOUND") throw new AppError("VALIDATION_ERROR");
      if (!hasAtMostTwoDecimals(amount)) throw new AppError("INVALID_QUANTITY");
    }

    const replay = await this.findReplay(data);
    if (replay) return replay;

    if (
      data.revertsMovementId !== undefined &&
      !(await this.movementRepository.belongsToProduct(
        data.businessId,
        data.productId,
        data.revertsMovementId,
      ))
    ) {
      throw new AppError("VALIDATION_ERROR");
    }

    for (let attempt = 1; attempt <= MAX_STOCK_ATTEMPTS; attempt++) {
      const product = await this.movementRepository.findActiveProduct(
        data.businessId,
        data.productId,
      );
      if (!product) throw new AppError("PRODUCT_NOT_FOUND");
      if (!isValidMovementQuantity(data.type, data.quantity, product.unit)) {
        throw new AppError("INVALID_QUANTITY");
      }

      const change = calculateStockChange(data.type, data.quantity, product.stock);
      if (change.resultingStock < 0) throw new AppError("INSUFFICIENT_STOCK");
      if (change.quantity === 0) {
        return { created: false, movement: null, stock: product.stock };
      }

      const outbound = data.type === "OUTBOUND";
      const unitCost = outbound ? (data.unitCost ?? product.costPrice) : null;
      const costChanged =
        data.unitCost !== undefined && data.unitCost !== product.costPrice;
      const unitPrice = outbound ? (data.unitPrice ?? product.salePrice) : null;
      const priceChanged =
        data.unitPrice !== undefined && data.unitPrice !== product.salePrice;

      try {
        const movement = await this.movementRepository.record({
          businessId: data.businessId,
          productId: data.productId,
          userId: data.userId,
          type: data.type,
          reason: data.reason ?? null,
          quantity: change.quantity,
          resultingStock: change.resultingStock,
          idempotencyKey: data.idempotencyKey,
          unitPrice,
          unitCost,
          revertsMovementId: data.revertsMovementId ?? null,
          expectedStock: product.stock,
          ...(costChanged && { newCostPrice: data.unitCost }),
          ...(priceChanged && { newSalePrice: data.unitPrice }),
        });
        if (movement) {
          return { created: true, movement, stock: movement.resultingStock };
        }
      } catch (error) {
        if (!isIdempotencyConflict(error)) throw error;
        const concurrentReplay = await this.findReplay(data);
        if (concurrentReplay) return concurrentReplay;
        throw error;
      }
    }

    throw new Error(
      `La existencia cambió en cada uno de los ${MAX_STOCK_ATTEMPTS} intentos de registrar el movimiento`,
    );
  }

  private async findReplay(
    data: RegisterMovementInput,
  ): Promise<RegisterMovementResult | null> {
    const stored = await this.movementRepository.findByIdempotencyKey(
      data.idempotencyKey,
    );
    if (!stored) return null;
    if (stored.businessId !== data.businessId) {
      throw new AppError("IDEMPOTENCY_KEY_CONFLICT");
    }
    return {
      created: false,
      movement: stored.movement,
      stock: stored.movement.resultingStock,
    };
  }
}

const isIdempotencyConflict = (error: unknown): boolean =>
  error instanceof AppError && error.code === "IDEMPOTENCY_KEY_CONFLICT";
