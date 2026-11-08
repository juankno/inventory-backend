import { AppError } from "../../../../shared/errors/app-error.ts";
import type { Product } from "../../domain/models/product.model.ts";
import type {
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
}
