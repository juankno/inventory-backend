import { getStockStatus } from "../../../inventory/domain/rules/stock-status.ts";
import { AppError } from "../../../../shared/errors/app-error.ts";
import {
  bucketStart,
  bucketStarts,
  previousPeriod,
  seriesGranularity,
  toDateRange,
  type SeriesGranularity,
} from "../../domain/report-period.ts";
import { MAX_REPORT_ROWS, type ReportMovement } from "../../domain/report.model.ts";
import type { ReportQueries } from "../ports/report-queries.repository.ts";
import {
  periodSales,
  topProducts,
  type PeriodSales,
  type TopProduct,
} from "./get-sales-summary.use-case.ts";

export interface SalesOverviewInput {
  businessId: string;
  from: string;
  to: string;
  /** Con qué comparar. Sin él, el período del mismo largo justo antes de `from`. */
  compare?: { from: string; to: string };
}

export interface SeriesPoint extends PeriodSales {
  /** "AAAA-MM-DDTHH" por horas; "AAAA-MM-DD" por días, semanas o meses. */
  start: string;
}

export interface SalesOverview {
  from: string;
  to: string;
  current: PeriodSales;
  previous: PeriodSales & { from: string; to: string };
  granularity: SeriesGranularity;
  /** Todos los grupos del período en orden, también los que no tienen ventas. */
  series: SeriesPoint[];
  topProducts: TopProduct[];
  /** Ventas del período que no suman porque el producto no tenía precio. */
  salesWithoutPrice: number;
  /** Ventas del período que no suman a la ganancia porque no tenían costo. */
  salesWithoutCost: number;
  /** Estado de hoy del inventario, sin importar el período. */
  inventory: { products: number; lowStock: number; outOfStock: number };
}

/**
 * Resumen de un período para la pantalla de reportes: cuánto se vendió, cómo va
 * contra otro período, cómo se repartieron las ventas en el tiempo y qué se vende más.
 */
export class GetSalesOverview {
  constructor(private readonly queries: ReportQueries) {}

  async execute({ businessId, from, to, compare }: SalesOverviewInput): Promise<SalesOverview> {
    const previousRange = compare ?? previousPeriod(from, to);
    const [sales, previousSales, products] = await Promise.all([
      this.listSales(businessId, from, to),
      this.listSales(businessId, previousRange.from, previousRange.to),
      this.queries.listProducts(businessId),
    ]);

    const granularity = seriesGranularity(from, to);
    const groups = new Map<string, ReportMovement[]>(
      bucketStarts(from, to, granularity).map((start) => [start, []]),
    );
    for (const sale of sales) {
      groups.get(bucketStart(sale.createdAt, granularity, from))?.push(sale);
    }

    const statuses = products.map(({ stock, minStock }) => getStockStatus(stock, minStock));

    return {
      from,
      to,
      current: periodSales(sales),
      previous: { ...previousRange, ...periodSales(previousSales) },
      granularity,
      series: [...groups].map(([start, items]) => ({ start, ...periodSales(items) })),
      topProducts: topProducts(sales),
      salesWithoutPrice: sales.filter((sale) => sale.unitPrice === null).length,
      salesWithoutCost: sales.filter((sale) => sale.unitCost === null).length,
      inventory: {
        products: products.length,
        lowStock: statuses.filter((status) => status === "LOW_STOCK").length,
        outOfStock: statuses.filter((status) => status === "OUT_OF_STOCK").length,
      },
    };
  }

  private async listSales(businessId: string, from: string, to: string) {
    const sales = await this.queries.listSales(
      businessId,
      toDateRange(from, to),
      MAX_REPORT_ROWS + 1,
    );
    if (sales.length > MAX_REPORT_ROWS) throw new AppError("REPORT_TOO_LARGE");
    return sales;
  }
}
