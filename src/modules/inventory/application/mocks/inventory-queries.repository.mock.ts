import type { HistoryMovement } from "../../domain/models/history-movement.model.ts";
import type {
  DeletedProduct,
  InventoryProduct,
} from "../../domain/models/inventory-product.model.ts";
import type {
  InventoryQueries,
  MovementPage,
  PageRequest,
} from "../ports/inventory-queries.repository.ts";

export type StoredProduct = InventoryProduct & {
  businessId: string;
  isActive: boolean;
  deletedAt?: Date;
};

// reverted se calcula con los demás movimientos, como hace la base de datos.
export type StoredHistoryMovement = Omit<HistoryMovement, "reverted" | "revertsMovementId"> & {
  productId: string;
  revertsMovementId?: string | null;
};

export class InventoryQueriesMock implements InventoryQueries {
  readonly products: StoredProduct[] = [];
  readonly movements: StoredHistoryMovement[] = [];

  async listProducts(
    businessId: string,
    search?: string,
  ): Promise<InventoryProduct[]> {
    const term = search?.toLowerCase();
    return this.products
      .filter(
        (product) =>
          product.businessId === businessId &&
          product.isActive &&
          (!term || product.name.toLowerCase().includes(term)),
      )
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(toInventoryProduct);
  }

  async listDeletedProducts(
    businessId: string,
    code?: string,
  ): Promise<DeletedProduct[]> {
    return this.products
      .filter(
        (product) =>
          product.businessId === businessId &&
          !product.isActive &&
          (!code || product.code === code),
      )
      .map((product) => ({
        ...toInventoryProduct(product),
        deletedAt: product.deletedAt ?? new Date(0),
      }))
      .sort((a, b) => b.deletedAt.getTime() - a.deletedAt.getTime());
  }

  async findActiveProduct(
    businessId: string,
    productId: string,
  ): Promise<InventoryProduct | null> {
    const product = this.products.find(
      (item) =>
        item.id === productId && item.businessId === businessId && item.isActive,
    );
    return product ? toInventoryProduct(product) : null;
  }

  async listMovements(
    businessId: string,
    productId: string,
    { limit, cursor, filter }: PageRequest,
  ): Promise<MovementPage> {
    const ownsProduct = this.products.some(
      (product) => product.id === productId && product.businessId === businessId,
    );
    const history = this.movements
      .filter((movement) => ownsProduct && movement.productId === productId)
      .filter(
        (movement) =>
          (!filter?.type || movement.type === filter.type) &&
          (!filter?.reason || movement.reason === filter.reason),
      )
      .sort(
        (a, b) =>
          b.createdAt.getTime() - a.createdAt.getTime() || b.id.localeCompare(a.id),
      );
    const start = cursor
      ? history.findIndex((movement) => movement.id === cursor) + 1
      : 0;
    const page = history.slice(start, start + limit);
    const hasMore = start + limit < history.length;
    return {
      items: page.map(({ productId: _productId, revertsMovementId = null, ...movement }) => ({
        ...movement,
        revertsMovementId,
        reverted: this.movements.some((other) => other.revertsMovementId === movement.id),
      })),
      nextCursor: hasMore ? (page.at(-1)?.id ?? null) : null,
    };
  }
}

const toInventoryProduct = ({
  businessId: _businessId,
  isActive: _isActive,
  ...product
}: StoredProduct): InventoryProduct => product;
