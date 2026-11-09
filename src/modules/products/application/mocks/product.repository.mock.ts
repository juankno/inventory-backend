import { AppError } from "../../../../shared/errors/app-error.ts";
import type { Product } from "../../domain/models/product.model.ts";
import type {
  ProductChanges,
  ProductData,
  ProductRepository,
} from "../ports/product.repository.ts";

export type InitialMovement = {
  productId: string;
  userId: string;
  type: "INBOUND";
  quantity: number;
  resultingStock: number;
};

export class ProductRepositoryMock implements ProductRepository {
  readonly products: Product[] = [];
  readonly initialMovements: InitialMovement[] = [];
  findCalls = 0;

  async create({ createdBy, ...data }: ProductData): Promise<Product> {
    const isCodeTaken = this.products.some(
      (product) =>
        product.businessId === data.businessId && product.code === data.code,
    );
    if (isCodeTaken) {
      throw new AppError("CODE_ALREADY_REGISTERED");
    }

    const now = new Date();
    const product: Product = {
      id: `product-${this.products.length + 1}`,
      ...data,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
    this.products.push(product);

    if (product.stock > 0) {
      this.initialMovements.push({
        productId: product.id,
        userId: createdBy,
        type: "INBOUND",
        quantity: product.stock,
        resultingStock: product.stock,
      });
    }
    return product;
  }

  async findActiveByCode(
    businessId: string,
    code: string,
  ): Promise<Product | null> {
    this.findCalls += 1;
    const product = this.products.find(
      (product) =>
        product.businessId === businessId &&
        product.code === code &&
        product.isActive,
    );
    return product ?? null;
  }

  async findActiveById(
    businessId: string,
    productId: string,
  ): Promise<Product | null> {
    return (
      this.products.find(
        (product) =>
          product.id === productId &&
          product.businessId === businessId &&
          product.isActive,
      ) ?? null
    );
  }

  async update(
    businessId: string,
    productId: string,
    changes: ProductChanges,
  ): Promise<Product | null> {
    const product = await this.findActiveById(businessId, productId);
    if (!product) return null;

    Object.assign(product, changes, { updatedAt: new Date() });
    return product;
  }

  async deactivate(businessId: string, productId: string): Promise<boolean> {
    const product = await this.findActiveById(businessId, productId);
    if (!product) return false;

    product.isActive = false;
    return true;
  }

  async restore(businessId: string, productId: string): Promise<Product | null> {
    const product = this.products.find(
      (item) => item.id === productId && item.businessId === businessId,
    );
    if (!product) return null;

    product.isActive = true;
    return product;
  }
}

