import type { Prisma, PrismaClient } from "../../../generated/prisma/client.ts";
import type {
  InventoryQueries,
  MovementPage,
  PageRequest,
} from "../application/ports/inventory-queries.repository.ts";
import type { HistoryMovement } from "../domain/models/history-movement.model.ts";
import type {
  DeletedProduct,
  InventoryProduct,
} from "../domain/models/inventory-product.model.ts";

const productSelect = {
  id: true,
  name: true,
  unit: true,
  stock: true,
  salePrice: true,
  minStock: true,
  codeType: true,
  code: true,
} satisfies Prisma.ProductSelect;

const movementSelect = {
  id: true,
  type: true,
  reason: true,
  quantity: true,
  resultingStock: true,
  createdAt: true,
} satisfies Prisma.MovementSelect;

type ProductRow = Prisma.ProductGetPayload<{ select: typeof productSelect }>;
type MovementRow = Prisma.MovementGetPayload<{ select: typeof movementSelect }>;

const toInventoryProduct = (row: ProductRow): InventoryProduct => ({
  id: row.id,
  name: row.name,
  unit: row.unit,
  stock: row.stock.toNumber(),
  salePrice: row.salePrice?.toNumber() ?? null,
  minStock: row.minStock?.toNumber() ?? null,
  codeType: row.codeType,
  code: row.code,
});

const toHistoryMovement = (row: MovementRow): HistoryMovement => ({
  id: row.id,
  type: row.type,
  reason: row.reason,
  quantity: row.quantity.toNumber(),
  resultingStock: row.resultingStock.toNumber(),
  createdAt: row.createdAt,
});

export class PrismaInventoryQueries implements InventoryQueries {
  constructor(private readonly prisma: PrismaClient) {}

  async listProducts(
    businessId: string,
    search?: string,
  ): Promise<InventoryProduct[]> {
    const rows = await this.prisma.product.findMany({
      where: {
        businessId,
        isActive: true,
        ...(search && { name: { contains: search, mode: "insensitive" } }),
      },
      orderBy: { name: "asc" },
      select: productSelect,
    });
    return rows.map(toInventoryProduct);
  }

  async listDeletedProducts(
    businessId: string,
    code?: string,
  ): Promise<DeletedProduct[]> {
    const rows = await this.prisma.product.findMany({
      where: { businessId, isActive: false, ...(code && { code }) },
      orderBy: { deletedAt: "desc" },
      select: { ...productSelect, deletedAt: true },
    });
    return rows.map((row) => ({
      ...toInventoryProduct(row),
      // Una restricción CHECK garantiza la fecha en los productos inactivos.
      deletedAt: row.deletedAt!,
    }));
  }

  async findActiveProduct(
    businessId: string,
    productId: string,
  ): Promise<InventoryProduct | null> {
    const row = await this.prisma.product.findFirst({
      where: { id: productId, businessId, isActive: true },
      select: productSelect,
    });
    return row ? toInventoryProduct(row) : null;
  }

  async listMovements(
    businessId: string,
    productId: string,
    { limit, cursor }: PageRequest,
  ): Promise<MovementPage> {
    const rows = await this.prisma.movement.findMany({
      where: { productId, product: { businessId } },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      select: movementSelect,
    });
    const items = rows.slice(0, limit).map(toHistoryMovement);
    const hasMore = rows.length > limit;
    return { items, nextCursor: hasMore ? (items.at(-1)?.id ?? null) : null };
  }
}
