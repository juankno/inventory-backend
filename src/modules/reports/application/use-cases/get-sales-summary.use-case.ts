import { currentPeriods } from "../../domain/report-period.ts";
import {
  MAX_REPORT_ROWS,
  type ReportMovement,
  type ReportProduct,
} from "../../domain/report.model.ts";
import { roundToCents } from "../../../../shared/domain/quantity.ts";
import type { ReportQueries } from "../ports/report-queries.repository.ts";

const TOP_PRODUCTS = 5;

export interface PeriodSales {
  total: number;
  sales: number;
}

export interface TopProduct {
  name: string;
  unit: ReportProduct["unit"];
  quantity: number;
  total: number;
}

export interface SalesSummary {
  today: PeriodSales;
  week: PeriodSales;
  /** Los más vendidos de la semana, por valor y luego por cantidad. */
  topProducts: TopProduct[];
  /** Ventas de la semana que no suman porque el producto no tenía precio. */
  salesWithoutPrice: number;
}

const periodSales = (sales: ReportMovement[]): PeriodSales => ({
  sales: sales.length,
  total: roundToCents(
    sales.reduce((sum, sale) => sum + sale.quantity * (sale.unitPrice ?? 0), 0),
  ),
});

export class GetSalesSummary {
  constructor(private readonly queries: ReportQueries) {}

  async execute(businessId: string, now = new Date()): Promise<SalesSummary> {
    const { today, week } = currentPeriods(now);
    const sales = await this.queries.listSales(businessId, week, MAX_REPORT_ROWS);

    const products = new Map<string, TopProduct>();
    for (const sale of sales) {
      const item = products.get(sale.productCode) ?? {
        name: sale.productName,
        unit: sale.unit,
        quantity: 0,
        total: 0,
      };
      item.quantity = roundToCents(item.quantity + sale.quantity);
      item.total = roundToCents(item.total + sale.quantity * (sale.unitPrice ?? 0));
      products.set(sale.productCode, item);
    }

    return {
      today: periodSales(
        sales.filter(
          ({ createdAt }) => createdAt >= today.start && createdAt < today.end,
        ),
      ),
      week: periodSales(sales),
      topProducts: [...products.values()]
        .sort((a, b) => b.total - a.total || b.quantity - a.quantity)
        .slice(0, TOP_PRODUCTS),
      salesWithoutPrice: sales.filter((sale) => sale.unitPrice === null).length,
    };
  }
}
