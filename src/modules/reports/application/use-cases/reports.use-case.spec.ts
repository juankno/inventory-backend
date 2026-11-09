import { MAX_REPORT_ROWS, type ReportMovement } from "../../domain/report.model.ts";
import { ReportQueriesMock, ReportRendererMock } from "../mocks/report.mocks.ts";
import {
  GenerateInventoryReport,
  GenerateMovementsReport,
  GenerateSalesReport,
} from "./generate-reports.use-case.ts";
import { GetSalesSummary } from "./get-sales-summary.use-case.ts";

const sale = (overrides: Partial<ReportMovement> = {}): ReportMovement => ({
  id: "movement-1",
  createdAt: new Date("2026-11-11T15:00:00Z"),
  productName: "Arroz",
  productCode: "7702354948016",
  unit: "UNIT",
  type: "OUTBOUND",
  reason: "SALE",
  quantity: 2,
  resultingStock: 8,
  unitPrice: 2500,
  reverted: false,
  ...overrides,
});

const period = { businessId: "business-1", from: "2026-11-01", to: "2026-11-30" };

function setup() {
  const queries = new ReportQueriesMock();
  const renderer = new ReportRendererMock();
  return { queries, renderer };
}

describe("GenerateInventoryReport", () => {
  it("should value the stock at the sale price and show its status", async () => {
    const { queries, renderer } = setup();
    queries.products.push(
      { name: "Arroz", code: "A", unit: "UNIT", stock: 10, minStock: 3, salePrice: 2500 },
      { name: "Panela", code: "B", unit: "UNIT", stock: 0, minStock: 4, salePrice: null },
      { name: "Atún", code: "C", unit: "UNIT", stock: 3, minStock: 4, salePrice: 1000 },
    );

    const report = await new GenerateInventoryReport(queries, renderer).execute({
      businessId: "business-1",
      today: "2026-11-11",
    });

    const sheet = renderer.rendered?.sheets[0];
    expect(report.filename).toBe("inventario-2026-11-11.xlsx");
    expect(sheet?.rows[0]).toEqual(["Arroz", "A", 10, "Unidad", 3, 2500, 25000, "Disponible"]);
    expect(sheet?.rows[1]?.slice(6)).toEqual([null, "Agotado"]);
    expect(sheet?.rows[2]?.slice(6)).toEqual([3000, "Por agotarse"]);
    expect(sheet?.totals?.[6]).toBe(28000);
  });
});

describe("GenerateMovementsReport", () => {
  it("should show the quantity with its sign and mark the undone ones", async () => {
    const { queries, renderer } = setup();
    queries.movements.push(
      sale({ reverted: true }),
      sale({ type: "INBOUND", reason: null, quantity: 5 }),
      sale({ type: "ADJUSTMENT", reason: null, quantity: -3 }),
    );

    await new GenerateMovementsReport(queries, renderer).execute(period);

    const rows = renderer.rendered?.sheets[0]?.rows;
    expect(rows?.[0]?.slice(3, 6)).toEqual(["Salida", "Venta", -2]);
    expect(rows?.[0]?.[8]).toBe("Sí");
    expect(rows?.[1]?.slice(3, 6)).toEqual(["Entrada", null, 5]);
    expect(rows?.[2]?.slice(3, 6)).toEqual(["Ajuste", null, -3]);
  });

  it("should write the date in the time of Colombia", async () => {
    const { queries, renderer } = setup();
    queries.movements.push(sale({ createdAt: new Date("2026-11-11T15:00:00Z") }));

    await new GenerateMovementsReport(queries, renderer).execute(period);

    expect(renderer.rendered?.sheets[0]?.rows[0]?.[0]).toEqual(
      new Date("2026-11-11T10:00:00Z"),
    );
  });

  it("should ask for a shorter period when there are too many rows", async () => {
    const { queries, renderer } = setup();
    for (let i = 0; i <= MAX_REPORT_ROWS; i++) queries.movements.push(sale());

    await expect(
      new GenerateMovementsReport(queries, renderer).execute(period),
    ).rejects.toMatchObject({ code: "REPORT_TOO_LARGE" });
  });

  it("should name the file with the period", async () => {
    const { queries, renderer } = setup();

    const report = await new GenerateMovementsReport(queries, renderer).execute({
      ...period,
      to: "2026-11-01",
    });

    expect(report.filename).toBe("movimientos-2026-11-01.xlsx");
  });
});

describe("GenerateSalesReport", () => {
  it("should use the price of each sale, not a single current price", async () => {
    const { queries, renderer } = setup();
    queries.movements.push(
      sale({ quantity: 2, unitPrice: 2500 }),
      sale({ quantity: 1, unitPrice: 3000 }),
    );

    await new GenerateSalesReport(queries, renderer).execute(period);

    const [byProduct, detail] = renderer.rendered?.sheets ?? [];
    expect(byProduct?.rows[0]?.slice(2, 5)).toEqual([3, "Unidad", 8000]);
    expect(byProduct?.totals?.[4]).toBe(8000);
    expect(detail?.rows.map((row) => row[6])).toEqual([5000, 3000]);
  });

  it("should not count undone sales or other outbound reasons", async () => {
    const { queries, renderer } = setup();
    queries.movements.push(
      sale(),
      sale({ reverted: true }),
      sale({ reason: "LOSS" }),
      sale({ type: "INBOUND", reason: null }),
    );

    await new GenerateSalesReport(queries, renderer).execute(period);

    expect(renderer.rendered?.sheets[0]?.totals?.[4]).toBe(5000);
    expect(renderer.rendered?.sheets[1]?.rows).toHaveLength(1);
  });

  it("should count the sales without a price instead of guessing their value", async () => {
    const { queries, renderer } = setup();
    queries.movements.push(sale({ unitPrice: null }), sale({ unitPrice: null }));

    await new GenerateSalesReport(queries, renderer).execute(period);

    const [byProduct, detail] = renderer.rendered?.sheets ?? [];
    expect(byProduct?.totals?.slice(4)).toEqual([0, 2]);
    expect(detail?.rows[0]?.slice(5)).toEqual([null, null]);
  });

  it("should put the product that sold the most first", async () => {
    const { queries, renderer } = setup();
    queries.movements.push(
      sale({ productName: "Poco", productCode: "A", unitPrice: 100 }),
      sale({ productName: "Mucho", productCode: "B", unitPrice: 9000 }),
    );

    await new GenerateSalesReport(queries, renderer).execute(period);

    expect(renderer.rendered?.sheets[0]?.rows.map((row) => row[0])).toEqual([
      "Mucho",
      "Poco",
    ]);
  });
});

describe("GetSalesSummary", () => {
  // Miércoles 11 de noviembre, 12 m. en Colombia.
  const now = new Date("2026-11-11T17:00:00Z");

  it("should separate today from the rest of the week", async () => {
    const { queries } = setup();
    queries.movements.push(
      sale({ createdAt: new Date("2026-11-11T15:00:00Z") }),
      sale({ createdAt: new Date("2026-11-10T15:00:00Z") }),
      sale({ createdAt: new Date("2026-11-08T15:00:00Z") }),
    );

    const summary = await new GetSalesSummary(queries).execute("business-1", now);

    expect(summary.today).toEqual({ sales: 1, total: 5000 });
    expect(summary.week).toEqual({ sales: 2, total: 10000 });
  });

  it("should list at most 5 top products, the best first", async () => {
    const { queries } = setup();
    for (let i = 1; i <= 6; i++) {
      queries.movements.push(
        sale({ productName: `P${i}`, productCode: `C${i}`, unitPrice: i * 100 }),
      );
    }

    const { topProducts } = await new GetSalesSummary(queries).execute("business-1", now);

    expect(topProducts.map((product) => product.name)).toEqual([
      "P6",
      "P5",
      "P4",
      "P3",
      "P2",
    ]);
  });

  it("should still rank products without a price by quantity", async () => {
    const { queries } = setup();
    queries.movements.push(
      sale({ productName: "Uno", productCode: "A", unitPrice: null, quantity: 1 }),
      sale({ productName: "Tres", productCode: "B", unitPrice: null, quantity: 3 }),
    );

    const summary = await new GetSalesSummary(queries).execute("business-1", now);

    expect(summary.topProducts[0]?.name).toBe("Tres");
    expect(summary.salesWithoutPrice).toBe(2);
    expect(summary.week.total).toBe(0);
  });

  it("should not count undone sales", async () => {
    const { queries } = setup();
    queries.movements.push(sale({ reverted: true }));

    const summary = await new GetSalesSummary(queries).execute("business-1", now);

    expect(summary.today).toEqual({ sales: 0, total: 0 });
  });
});
