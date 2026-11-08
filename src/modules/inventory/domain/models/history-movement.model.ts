export interface HistoryMovement {
  id: string;
  type: "INBOUND" | "OUTBOUND" | "ADJUSTMENT";
  reason: "SALE" | "CONSUMPTION" | "LOSS" | null;
  quantity: number;
  resultingStock: number;
  createdAt: Date;
}
