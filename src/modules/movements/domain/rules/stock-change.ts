import {
  isValidStockForUnit,
  type Unit,
} from "../../../../shared/domain/quantity.ts";
import type {
  MovementType,
  OutboundReason,
} from "../models/movement.model.ts";

export type StockChange = {
  quantity: number;
  resultingStock: number;
};

const roundToCents = (value: number): number => Math.round(value * 100) / 100;

export const hasValidReason = (
  type: MovementType,
  reason: OutboundReason | undefined,
): boolean => {
  return type === "OUTBOUND" ? reason !== undefined : reason === undefined;
};

export const isValidMovementQuantity = (
  type: MovementType,
  quantity: number,
  unit: Unit,
): boolean => {
  const isInRange = type === "ADJUSTMENT" ? quantity >= 0 : quantity > 0;
  return isInRange && isValidStockForUnit(quantity, unit);
};

export const calculateStockChange = (
  type: MovementType,
  quantity: number,
  currentStock: number,
): StockChange => {
  switch (type) {
    case "INBOUND":
      return { quantity, resultingStock: roundToCents(currentStock + quantity) };
    case "OUTBOUND":
      return { quantity, resultingStock: roundToCents(currentStock - quantity) };
    case "ADJUSTMENT":
      return {
        quantity: roundToCents(quantity - currentStock),
        resultingStock: quantity,
      };
  }
};
