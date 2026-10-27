import "dotenv/config";
import { randomUUID } from "node:crypto";
import bcrypt from "bcrypt";

import { PrismaClient, type CodeType, type Unit } from "../src/generated/prisma/client.ts";
import { createPrismaClient } from "../src/shared/infrastructure/prisma.ts";

// Datos semilla (RO-01, ERS Apéndice B): una cuenta de demostración con el
// inventario simulado de 20 productos. Se puede ejecutar varias veces y
// siempre deja la cuenta en el mismo estado inicial.

const DEMO_EMAIL = "demo@inventario.local";
const DEMO_BUSINESS = "Tienda de demostración";
const DEMO_OWNER = "Comerciante de prueba";

type SeedProduct = {
  name: string;
  codeType: CodeType;
  code: string;
  unit: Unit;
  stock: number;
  minStock: number;
};

// TODO: reemplazar los GTIN de prueba (prefijo 20, de uso interno GS1) por los
// GTIN reales de los empaques que se compren para la evaluación.
// Los identificadores internos son fijos para que los QR impresos sigan sirviendo.
const products: SeedProduct[] = [
  { name: "Gaseosa 400 ml", codeType: "GTIN", code: "2000000000015", unit: "UNIT", stock: 24, minStock: 6 },
  { name: "Agua en botella 600 ml", codeType: "GTIN", code: "2000000000022", unit: "UNIT", stock: 18, minStock: 6 },
  { name: "Papas fritas 45 g", codeType: "GTIN", code: "2000000000039", unit: "UNIT", stock: 15, minStock: 5 },
  { name: "Galletas paquete", codeType: "GTIN", code: "2000000000046", unit: "UNIT", stock: 12, minStock: 4 },
  { name: "Leche 1 litro", codeType: "GTIN", code: "2000000000053", unit: "UNIT", stock: 10, minStock: 4 },
  { name: "Pasta 500 g", codeType: "GTIN", code: "2000000000060", unit: "UNIT", stock: 8, minStock: 3 },
  { name: "Atún en lata", codeType: "GTIN", code: "2000000000077", unit: "UNIT", stock: 3, minStock: 4 },
  { name: "Aceite 1 litro", codeType: "GTIN", code: "2000000000084", unit: "UNIT", stock: 6, minStock: 2 },
  { name: "Jabón de baño", codeType: "GTIN", code: "2000000000091", unit: "UNIT", stock: 0, minStock: 3 },
  { name: "Café molido 250 g", codeType: "GTIN", code: "2000000000107", unit: "UNIT", stock: 5, minStock: 2 },
  { name: "Arroz a granel", codeType: "INTERNAL", code: "INV-JPWM17FPXP", unit: "KILOGRAM", stock: 25, minStock: 5 },
  { name: "Fríjol a granel", codeType: "INTERNAL", code: "INV-Q719S5WRA1", unit: "KILOGRAM", stock: 8, minStock: 3 },
  { name: "Lenteja a granel", codeType: "INTERNAL", code: "INV-24APRJY5FB", unit: "KILOGRAM", stock: 6, minStock: 2 },
  { name: "Azúcar a granel", codeType: "INTERNAL", code: "INV-7Q64VPZD3B", unit: "KILOGRAM", stock: 2, minStock: 5 },
  { name: "Huevos", codeType: "INTERNAL", code: "INV-8RP1CM2KAM", unit: "UNIT", stock: 60, minStock: 30 },
  { name: "Pan del día", codeType: "INTERNAL", code: "INV-AK0K67147H", unit: "UNIT", stock: 30, minStock: 10 },
  { name: "Queso campesino", codeType: "INTERNAL", code: "INV-63J0DD85FP", unit: "POUND", stock: 4, minStock: 2 },
  { name: "Panela", codeType: "INTERNAL", code: "INV-E71J7SW978", unit: "UNIT", stock: 0, minStock: 4 },
  { name: "Maní reempacado 100 g", codeType: "INTERNAL", code: "INV-V8RAXW12VS", unit: "UNIT", stock: 10, minStock: 3 },
  { name: "Bolsa de hielo", codeType: "INTERNAL", code: "INV-3V2339PTKS", unit: "UNIT", stock: 12, minStock: 4 },
];

async function removeDemoAccount(prisma: PrismaClient) {
  const user = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (!user) return;
  const businessId = user.businessId;
  await prisma.$transaction([
    prisma.movement.deleteMany({ where: { product: { businessId } } }),
    prisma.product.deleteMany({ where: { businessId } }),
    prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }),
    prisma.user.delete({ where: { id: user.id } }),
    prisma.business.delete({ where: { id: businessId } }),
  ]);
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("Falta la variable DATABASE_URL");
  const password = process.env.SEED_DEMO_PASSWORD ?? "Demo1234";
  const prisma = createPrismaClient(databaseUrl);

  try {
    await removeDemoAccount(prisma);

    const business = await prisma.business.create({
      data: {
        name: DEMO_BUSINESS,
        user: {
          create: {
            ownerName: DEMO_OWNER,
            email: DEMO_EMAIL,
            passwordHash: await bcrypt.hash(password, 10),
            dataPolicyAcceptedAt: new Date(),
          },
        },
      },
      include: { user: true },
    });
    const userId = business.user!.id;

    for (const product of products) {
      // La existencia inicial se registra como una entrada para que el historial cuadre (B-03).
      await prisma.product.create({
        data: {
          businessId: business.id,
          name: product.name,
          unit: product.unit,
          codeType: product.codeType,
          code: product.code,
          stock: product.stock,
          minStock: product.minStock,
          movements:
            product.stock > 0
              ? {
                  create: {
                    userId,
                    type: "INBOUND",
                    quantity: product.stock,
                    resultingStock: product.stock,
                    idempotencyKey: randomUUID(),
                  },
                }
              : undefined,
        },
      });
    }

    console.log(`Cuenta de demostración lista: ${DEMO_EMAIL} con ${products.length} productos.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
