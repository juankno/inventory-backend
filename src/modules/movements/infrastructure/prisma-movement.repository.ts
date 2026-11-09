import { Prisma, type PrismaClient } from "../../../generated/prisma/client.ts";
import { AppError } from "../../../shared/errors/app-error.ts";
import type {
  MovementRepository,
  NewMovement,
  StockedProduct,
  StoredMovement,
} from "../application/ports/movement.repository.ts";
import type { Movement } from "../domain/models/movement.model.ts";

const movementSelect = {
  id: true,
  productId: true,
  userId: true,
  type: true,
  reason: true,
  quantity: true,
  resultingStock: true,
  idempotencyKey: true,
  unitPrice: true,
  revertsMovementId: true,
  createdAt: true,
} satisfies Prisma.MovementSelect;

type MovementRow = Prisma.MovementGetPayload<{ select: typeof movementSelect }>;

const toMovement = (row: MovementRow): Movement => {
  return {
    id: row.id,
    productId: row.productId,
    userId: row.userId,
    type: row.type,
    reason: row.reason,
    quantity: row.quantity.toNumber(),
    resultingStock: row.resultingStock.toNumber(),
    idempotencyKey: row.idempotencyKey,
    unitPrice: row.unitPrice?.toNumber() ?? null,
    revertsMovementId: row.revertsMovementId,
    createdAt: row.createdAt,
  };
};

export class PrismaMovementRepository implements MovementRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findActiveProduct(
    businessId: string,
    productId: string,
  ): Promise<StockedProduct | null> {
    const row = await this.prisma.product.findFirst({
      where: { id: productId, businessId, isActive: true },
      select: { unit: true, stock: true, salePrice: true },
    });
    return row
      ? {
          unit: row.unit,
          stock: row.stock.toNumber(),
          salePrice: row.salePrice?.toNumber() ?? null,
        }
      : null;
  }

  async belongsToProduct(
    businessId: string,
    productId: string,
    movementId: string,
  ): Promise<boolean> {
    const row = await this.prisma.movement.findFirst({
      where: { id: movementId, productId, product: { businessId } },
      select: { id: true },
    });
    return row !== null;
  }

  async findByIdempotencyKey(
    idempotencyKey: string,
  ): Promise<StoredMovement | null> {
    const row = await this.prisma.movement.findUnique({
      where: { idempotencyKey },
      select: { ...movementSelect, product: { select: { businessId: true } } },
    });
    if (!row) return null;

    const { product, ...movement } = row;
    return { businessId: product.businessId, movement: toMovement(movement) };
  }

  async record({
    businessId,
    expectedStock,
    ...data
  }: NewMovement): Promise<Movement | null> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const { count } = await tx.product.updateMany({
          where: {
            id: data.productId,
            businessId,
            isActive: true,
            stock: expectedStock,
          },
          data: { stock: data.resultingStock },
        });
        if (count === 0) return null;

        const row = await tx.movement.create({ data, select: movementSelect });
        return toMovement(row);
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new AppError("IDEMPOTENCY_KEY_CONFLICT");
      }
      throw error;
    }
  }
}
