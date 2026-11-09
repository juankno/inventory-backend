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
          unitPrice: data.type === "OUTBOUND" ? product.salePrice : null,
          revertsMovementId: data.revertsMovementId ?? null,
          expectedStock: product.stock,
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
