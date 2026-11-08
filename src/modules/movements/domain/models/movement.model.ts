export type MovementType = "INBOUND" | "OUTBOUND" | "ADJUSTMENT";

export type OutboundReason = "SALE" | "CONSUMPTION" | "LOSS";

export interface Movement {
  id: string;
  productId: string;
  userId: string;
  type: MovementType;
  reason: OutboundReason | null;
  quantity: number;
  resultingStock: number;
  idempotencyKey: string;
  createdAt: Date;
}
