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
  createdAt: Date;
}
