import type { Unit } from "../../../shared/domain/quantity.ts";

export interface ReportProduct {
  name: string;
  code: string;
  unit: Unit;
  stock: number;
  minStock: number | null;
  salePrice: number | null;
}

export interface ReportMovement {
  id: string;
  createdAt: Date;
  productName: string;
  productCode: string;
  unit: Unit;
  type: "INBOUND" | "OUTBOUND" | "ADJUSTMENT";
  reason: "SALE" | "CONSUMPTION" | "LOSS" | null;
  /** Como se guarda: positivo en entradas y salidas, con signo en los ajustes. */
  quantity: number;
  resultingStock: number;
  unitPrice: number | null;
  /** Si se deshizo con "Deshacer". */
  reverted: boolean;
}

export type ReportCell = string | number | Date | null;

export interface ReportColumn {
  header: string;
  format: "text" | "quantity" | "money" | "date";
  width: number;
}

export interface ReportSheet {
  name: string;
  columns: ReportColumn[];
  rows: ReportCell[][];
  /** Fila final en negrilla. */
  totals?: ReportCell[];
}

export interface ReportFile {
  filename: string;
  sheets: ReportSheet[];
}

export interface RenderedReport {
  filename: string;
  content: Buffer;
}

/** Más filas harían el archivo demasiado grande para la respuesta de Vercel. */
export const MAX_REPORT_ROWS = 20_000;

const UNIT_LABELS: Record<Unit, string> = {
  UNIT: "Unidad",
  KILOGRAM: "Kilo",
  GRAM: "Gramo",
  POUND: "Libra",
  LITER: "Litro",
};

export const unitLabel = (unit: Unit): string => UNIT_LABELS[unit];

export const roundMoney = (value: number): number =>
  Math.round(value * 100) / 100;
