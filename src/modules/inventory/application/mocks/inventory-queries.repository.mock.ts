import type { HistoryMovement } from "../../domain/models/history-movement.model.ts";
import type { InventoryProduct } from "../../domain/models/inventory-product.model.ts";
import type {
  InventoryQueries,
  MovementPage,
  PageRequest,
} from "../ports/inventory-queries.repository.ts";

export type StoredProduct = InventoryProduct & {
  businessId: string;
  isActive: boolean;
};

export type StoredHistoryMovement = HistoryMovement & { productId: string };

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
    { limit, cursor }: PageRequest,
  ): Promise<MovementPage> {
    const ownsProduct = this.products.some(
      (product) => product.id === productId && product.businessId === businessId,
    );
    const history = this.movements
      .filter((movement) => ownsProduct && movement.productId === productId)
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
      items: page.map(({ productId: _productId, ...movement }) => movement),
      nextCursor: hasMore ? (page.at(-1)?.id ?? null) : null,
    };
  }
}

const toInventoryProduct = ({
  businessId: _businessId,
  isActive: _isActive,
  ...product
}: StoredProduct): InventoryProduct => product;
