export interface HistoryMovement {
  id: string;
  type: "INBOUND" | "OUTBOUND" | "ADJUSTMENT";
  reason: "SALE" | "CONSUMPTION" | "LOSS" | null;
  quantity: number;
  resultingStock: number;
  // Solo en las salidas: el precio y el costo unitarios con que se registró.
  // null en entradas y ajustes, o si el producto no tenía precio o costo.
  unitPrice: number | null;
  unitCost: number | null;
  /** Solo en los ajustes de "Deshacer": el movimiento que este ajuste revierte. */
  revertsMovementId: string | null;
  /** Si se deshizo con "Deshacer": una venta deshecha no cuenta en los reportes. */
  reverted: boolean;
  createdAt: Date;
}

export type MovementType = HistoryMovement["type"];
export type OutboundReason = NonNullable<HistoryMovement["reason"]>;

/** Para ver solo un tipo de movimiento, por ejemplo las ventas (salidas con motivo SALE). */
export interface MovementFilter {
  type?: MovementType;
  reason?: OutboundReason;
}
