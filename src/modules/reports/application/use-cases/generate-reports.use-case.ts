import { getStockStatus } from "../../../inventory/domain/rules/stock-status.ts";
import { AppError } from "../../../../shared/errors/app-error.ts";
import { toBogotaClock, toDateRange } from "../../domain/report-period.ts";
import {
  MAX_REPORT_ROWS,
  roundMoney,
  unitLabel,
  type RenderedReport,
  type ReportMovement,
  type ReportProduct,
  type ReportSheet,
} from "../../domain/report.model.ts";
import type { ReportQueries } from "../ports/report-queries.repository.ts";
import type { ReportRenderer } from "../ports/report-renderer.port.ts";

export interface InventoryReportInput {
  businessId: string;
  /** Día actual en Colombia, para el nombre del archivo. */
  today: string;
}

export interface PeriodReportInput {
  businessId: string;
  from: string;
  to: string;
}

const STATUS_LABELS = {
  OK: "Disponible",
  LOW_STOCK: "Por agotarse",
  OUT_OF_STOCK: "Agotado",
};

const TYPE_LABELS = { INBOUND: "Entrada", OUTBOUND: "Salida", ADJUSTMENT: "Ajuste" };

const REASON_LABELS = { SALE: "Venta", CONSUMPTION: "Consumo", LOSS: "Pérdida" };

/** Cuánto cambió la existencia: en la salida se resta, y el ajuste ya trae su signo. */
const signedQuantity = ({ type, quantity }: ReportMovement): number =>
  type === "OUTBOUND" ? -quantity : quantity;

const stockValue = ({ stock, salePrice }: ReportProduct): number | null =>
  salePrice === null ? null : roundMoney(stock * salePrice);

const saleTotal = ({ quantity, unitPrice }: ReportMovement): number | null =>
  unitPrice === null ? null : roundMoney(quantity * unitPrice);

const rangeSuffix = (from: string, to: string): string =>
  from === to ? from : `${from}-a-${to}`;

const ensureNotTooLarge = (rows: unknown[]): void => {
  if (rows.length > MAX_REPORT_ROWS) throw new AppError("REPORT_TOO_LARGE");
};

const inventorySheet = (products: ReportProduct[]): ReportSheet => ({
  name: "Inventario",
  columns: [
    { header: "Producto", format: "text", width: 32 },
    { header: "Código", format: "text", width: 18 },
    { header: "Existencias", format: "quantity", width: 13 },
    { header: "Unidad", format: "text", width: 10 },
    { header: "Mínimo", format: "quantity", width: 10 },
    { header: "Precio de venta", format: "money", width: 16 },
    { header: "Valor a precio de venta", format: "money", width: 22 },
    { header: "Estado", format: "text", width: 14 },
  ],
  rows: products.map((product) => [
    product.name,
    product.code,
    product.stock,
    unitLabel(product.unit),
    product.minStock,
    product.salePrice,
    stockValue(product),
    STATUS_LABELS[getStockStatus(product.stock, product.minStock)],
  ]),
  totals: [
    "Total",
    null,
    null,
    null,
    null,
    null,
    roundMoney(products.reduce((sum, item) => sum + (stockValue(item) ?? 0), 0)),
    null,
  ],
});

const movementsSheet = (movements: ReportMovement[]): ReportSheet => ({
  name: "Movimientos",
  columns: [
    { header: "Fecha", format: "date", width: 20 },
    { header: "Producto", format: "text", width: 32 },
    { header: "Código", format: "text", width: 18 },
    { header: "Tipo", format: "text", width: 10 },
    { header: "Motivo", format: "text", width: 10 },
    { header: "Cantidad", format: "quantity", width: 11 },
    { header: "Unidad", format: "text", width: 10 },
    { header: "Existencia resultante", format: "quantity", width: 20 },
    { header: "Deshecho", format: "text", width: 10 },
  ],
  rows: movements.map((movement) => [
    toBogotaClock(movement.createdAt),
    movement.productName,
    movement.productCode,
    TYPE_LABELS[movement.type],
    movement.reason && REASON_LABELS[movement.reason],
    signedQuantity(movement),
    unitLabel(movement.unit),
    movement.resultingStock,
    movement.reverted ? "Sí" : null,
  ]),
});

interface ProductSales {
  name: string;
  code: string;
  unit: ReportProduct["unit"];
  quantity: number;
  total: number;
  withoutPrice: number;
}

const groupByProduct = (sales: ReportMovement[]): ProductSales[] => {
  const byCode = new Map<string, ProductSales>();
  for (const sale of sales) {
    const item = byCode.get(sale.productCode) ?? {
      name: sale.productName,
      code: sale.productCode,
      unit: sale.unit,
      quantity: 0,
      total: 0,
      withoutPrice: 0,
    };
    const total = saleTotal(sale);
    item.quantity = roundMoney(item.quantity + sale.quantity);
    item.total = roundMoney(item.total + (total ?? 0));
    if (total === null) item.withoutPrice += 1;
    byCode.set(sale.productCode, item);
  }
  return [...byCode.values()].sort(
    (a, b) => b.total - a.total || b.quantity - a.quantity,
  );
};

const salesByProductSheet = (sales: ReportMovement[]): ReportSheet => {
  const products = groupByProduct(sales);
  return {
    name: "Por producto",
    columns: [
      { header: "Producto", format: "text", width: 32 },
      { header: "Código", format: "text", width: 18 },
      { header: "Cantidad vendida", format: "quantity", width: 17 },
      { header: "Unidad", format: "text", width: 10 },
      { header: "Total vendido", format: "money", width: 15 },
      { header: "Ventas sin precio", format: "quantity", width: 17 },
    ],
    rows: products.map((item) => [
      item.name,
      item.code,
      item.quantity,
      unitLabel(item.unit),
      item.total,
      item.withoutPrice || null,
    ]),
    totals: [
      "Total",
      null,
      null,
      null,
      roundMoney(products.reduce((sum, item) => sum + item.total, 0)),
      products.reduce((sum, item) => sum + item.withoutPrice, 0) || null,
    ],
  };
};

const saleDetailSheet = (sales: ReportMovement[]): ReportSheet => ({
  name: "Detalle de ventas",
  columns: [
    { header: "Fecha", format: "date", width: 20 },
    { header: "Producto", format: "text", width: 32 },
    { header: "Código", format: "text", width: 18 },
    { header: "Cantidad", format: "quantity", width: 11 },
    { header: "Unidad", format: "text", width: 10 },
    { header: "Precio", format: "money", width: 13 },
    { header: "Total", format: "money", width: 13 },
  ],
  rows: sales.map((sale) => [
    toBogotaClock(sale.createdAt),
    sale.productName,
    sale.productCode,
    sale.quantity,
    unitLabel(sale.unit),
    sale.unitPrice,
    saleTotal(sale),
  ]),
});

export class GenerateInventoryReport {
  constructor(
    private readonly queries: ReportQueries,
    private readonly renderer: ReportRenderer,
  ) {}

  async execute({ businessId, today }: InventoryReportInput): Promise<RenderedReport> {
    const products = await this.queries.listProducts(businessId);
    return this.renderer.render({
      filename: `inventario-${today}.xlsx`,
      sheets: [inventorySheet(products)],
    });
  }
}

export class GenerateMovementsReport {
  constructor(
    private readonly queries: ReportQueries,
    private readonly renderer: ReportRenderer,
  ) {}

  async execute({ businessId, from, to }: PeriodReportInput): Promise<RenderedReport> {
    const movements = await this.queries.listMovements(
      businessId,
      toDateRange(from, to),
      MAX_REPORT_ROWS + 1,
    );
    ensureNotTooLarge(movements);
    return this.renderer.render({
      filename: `movimientos-${rangeSuffix(from, to)}.xlsx`,
      sheets: [movementsSheet(movements)],
    });
  }
}

export class GenerateSalesReport {
  constructor(
    private readonly queries: ReportQueries,
    private readonly renderer: ReportRenderer,
  ) {}

  async execute({ businessId, from, to }: PeriodReportInput): Promise<RenderedReport> {
    const sales = await this.queries.listSales(
      businessId,
      toDateRange(from, to),
      MAX_REPORT_ROWS + 1,
    );
    ensureNotTooLarge(sales);
    return this.renderer.render({
      filename: `ventas-${rangeSuffix(from, to)}.xlsx`,
      sheets: [salesByProductSheet(sales), saleDetailSheet(sales)],
    });
  }
}
