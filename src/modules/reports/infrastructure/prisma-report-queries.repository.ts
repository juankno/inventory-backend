import type { Prisma, PrismaClient } from "../../../generated/prisma/client.ts";
import type { ReportQueries } from "../application/ports/report-queries.repository.ts";
import type { DateRange } from "../domain/report-period.ts";
import type { ReportMovement, ReportProduct } from "../domain/report.model.ts";

const movementSelect = {
  id: true,
  createdAt: true,
  type: true,
  reason: true,
  quantity: true,
  resultingStock: true,
  unitPrice: true,
  product: { select: { name: true, code: true, unit: true } },
  revertedBy: { select: { id: true } },
} satisfies Prisma.MovementSelect;

type MovementRow = Prisma.MovementGetPayload<{ select: typeof movementSelect }>;

const toReportMovement = (row: MovementRow): ReportMovement => ({
  id: row.id,
  createdAt: row.createdAt,
  productName: row.product.name,
  productCode: row.product.code,
  unit: row.product.unit,
  type: row.type,
  reason: row.reason,
  quantity: row.quantity.toNumber(),
  resultingStock: row.resultingStock.toNumber(),
  unitPrice: row.unitPrice?.toNumber() ?? null,
  reverted: row.revertedBy !== null,
});

export class PrismaReportQueries implements ReportQueries {
  constructor(private readonly prisma: PrismaClient) {}

  async listProducts(businessId: string): Promise<ReportProduct[]> {
    const rows = await this.prisma.product.findMany({
      where: { businessId, isActive: true },
      orderBy: { name: "asc" },
      select: {
        name: true,
        code: true,
        unit: true,
        stock: true,
        minStock: true,
        salePrice: true,
      },
    });
    return rows.map((row) => ({
      name: row.name,
      code: row.code,
      unit: row.unit,
      stock: row.stock.toNumber(),
      minStock: row.minStock?.toNumber() ?? null,
      salePrice: row.salePrice?.toNumber() ?? null,
    }));
  }

  async listMovements(
    businessId: string,
    range: DateRange,
    limit: number,
  ): Promise<ReportMovement[]> {
    return this.find({ product: { businessId } }, range, limit);
  }

  async listSales(
    businessId: string,
    range: DateRange,
    limit: number,
  ): Promise<ReportMovement[]> {
    return this.find(
      {
        product: { businessId },
        type: "OUTBOUND",
        reason: "SALE",
        revertedBy: { is: null },
      },
      range,
      limit,
    );
  }

  private async find(
    where: Prisma.MovementWhereInput,
    { start, end }: DateRange,
    limit: number,
  ): Promise<ReportMovement[]> {
    const rows = await this.prisma.movement.findMany({
      where: { ...where, createdAt: { gte: start, lt: end } },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit,
      select: movementSelect,
    });
    return rows.map(toReportMovement);
  }
}
