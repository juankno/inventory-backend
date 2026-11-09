import type { Unit } from "../../../../shared/domain/quantity.ts";
import { AppError } from "../../../../shared/errors/app-error.ts";
import type { Movement } from "../../domain/models/movement.model.ts";
import type {
  MovementRepository,
  NewMovement,
  StockedProduct,
  StoredMovement,
} from "../ports/movement.repository.ts";

export type ProductStock = {
  id: string;
  businessId: string;
  unit: Unit;
  stock: number;
  salePrice?: number | null;
  isActive: boolean;
};

export class MovementRepositoryMock implements MovementRepository {
  readonly products: ProductStock[] = [];
  readonly stored: StoredMovement[] = [];
  beforeRecord?: () => void;

  async findActiveProduct(
    businessId: string,
    productId: string,
  ): Promise<StockedProduct | null> {
    const product = this.findProduct(businessId, productId);
    return product
      ? {
          unit: product.unit,
          stock: product.stock,
          salePrice: product.salePrice ?? null,
        }
      : null;
  }

  async belongsToProduct(
    businessId: string,
    productId: string,
    movementId: string,
  ): Promise<boolean> {
    return this.stored.some(
      (item) =>
        item.businessId === businessId &&
        item.movement.productId === productId &&
        item.movement.id === movementId,
    );
  }

  async findByIdempotencyKey(
    idempotencyKey: string,
  ): Promise<StoredMovement | null> {
    return (
      this.stored.find(
        ({ movement }) => movement.idempotencyKey === idempotencyKey,
      ) ?? null
    );
  }

  async record({
    businessId,
    expectedStock,
    ...data
  }: NewMovement): Promise<Movement | null> {
    this.beforeRecord?.();

    const product = this.findProduct(businessId, data.productId);
    if (!product || product.stock !== expectedStock) return null;
    if (await this.findByIdempotencyKey(data.idempotencyKey)) {
      throw new AppError("IDEMPOTENCY_KEY_CONFLICT");
    }

    product.stock = data.resultingStock;
    const movement: Movement = {
      id: `movement-${this.stored.length + 1}`,
      ...data,
      createdAt: new Date(),
    };
    this.stored.push({ businessId, movement });
    return movement;
  }

  private findProduct(businessId: string, productId: string) {
    return this.products.find(
      (product) =>
        product.id === productId &&
        product.businessId === businessId &&
        product.isActive,
    );
  }
}
