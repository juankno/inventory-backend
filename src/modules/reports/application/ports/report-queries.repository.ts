import type { DateRange } from "../../domain/report-period.ts";
import type { ReportMovement, ReportProduct } from "../../domain/report.model.ts";

export interface ReportQueries {
  /** Productos activos, por nombre. */
  listProducts(businessId: string): Promise<ReportProduct[]>;
  /** Todos los movimientos del período, también de productos eliminados, del más reciente al más antiguo. */
  listMovements(
    businessId: string,
    range: DateRange,
    limit: number,
  ): Promise<ReportMovement[]>;
  /** Solo las salidas por venta que no se deshicieron. */
  listSales(
    businessId: string,
    range: DateRange,
    limit: number,
  ): Promise<ReportMovement[]>;
}
