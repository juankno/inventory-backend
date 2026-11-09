import type { DateRange } from "../../domain/report-period.ts";
import type {
  RenderedReport,
  ReportFile,
  ReportMovement,
  ReportProduct,
} from "../../domain/report.model.ts";
import type { ReportQueries } from "../ports/report-queries.repository.ts";
import type { ReportRenderer } from "../ports/report-renderer.port.ts";

export class ReportQueriesMock implements ReportQueries {
  readonly products: ReportProduct[] = [];
  readonly movements: ReportMovement[] = [];

  async listProducts(): Promise<ReportProduct[]> {
    return this.products;
  }

  async listMovements(
    _businessId: string,
    { start, end }: DateRange,
    limit: number,
  ): Promise<ReportMovement[]> {
    return this.movements
      .filter(({ createdAt }) => createdAt >= start && createdAt < end)
      .slice(0, limit);
  }

  async listSales(
    businessId: string,
    range: DateRange,
    limit: number,
  ): Promise<ReportMovement[]> {
    const movements = await this.listMovements(businessId, range, Infinity);
    return movements
      .filter(
        (movement) =>
          movement.type === "OUTBOUND" &&
          movement.reason === "SALE" &&
          !movement.reverted,
      )
      .slice(0, limit);
  }
}

export class ReportRendererMock implements ReportRenderer {
  rendered: ReportFile | null = null;

  async render(report: ReportFile): Promise<RenderedReport> {
    this.rendered = report;
    return { filename: report.filename, content: Buffer.from("") };
  }
}
