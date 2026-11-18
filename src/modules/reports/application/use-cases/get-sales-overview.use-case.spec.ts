import { MAX_REPORT_ROWS, type ReportMovement, type ReportProduct } from "../../domain/report.model.ts";
import { ReportQueriesMock } from "../mocks/report.mocks.ts";
import { GetSalesOverview } from "./get-sales-overview.use-case.ts";

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
  unitCost: 2000,
  reverted: false,
  ...overrides,
});

const product = (stock: number, minStock: number | null): ReportProduct => ({
  name: "Arroz",
  code: "7702354948016",
  unit: "UNIT",
  stock,
  minStock,
  salePrice: 2500,
  costPrice: 2000,
});

function setup() {
  const queries = new ReportQueriesMock();
  return { queries, overview: new GetSalesOverview(queries) };
}

describe("GetSalesOverview", () => {
  it("should add up the period and compare it with the same number of days before", async () => {
    const { queries, overview } = setup();
    queries.movements.push(
      // 10 y 11 de noviembre: el período.
      sale({ createdAt: new Date("2026-11-11T15:00:00Z") }),
      sale({ createdAt: new Date("2026-11-10T15:00:00Z"), quantity: 1 }),
      // 8 y 9 de noviembre: los dos días anteriores.
      sale({ createdAt: new Date("2026-11-09T15:00:00Z") }),
      // 7 de noviembre: fuera de los dos.
      sale({ createdAt: new Date("2026-11-07T15:00:00Z") }),
    );

    const result = await overview.execute({ businessId: "business-1", from: "2026-11-10", to: "2026-11-11" });

    expect(result.current).toEqual({ sales: 2, total: 7500, profit: 1500 });
    expect(result.previous).toEqual({ from: "2026-11-08", to: "2026-11-09", sales: 1, total: 5000, profit: 1000 });
  });

  it("should compare with the period the app asks for", async () => {
    const { queries, overview } = setup();
    queries.movements.push(sale({ createdAt: new Date("2026-10-05T15:00:00Z") }));

    const result = await overview.execute({
      businessId: "business-1",
      from: "2026-11-01",
      to: "2026-11-18",
      compare: { from: "2026-10-01", to: "2026-10-18" },
    });

    expect(result.previous).toMatchObject({ from: "2026-10-01", to: "2026-10-18", sales: 1 });
  });

  it("should spread one day by hour in the time of Colombia", async () => {
    const { queries, overview } = setup();
    // 10 a. m. y 7 p. m. en Colombia.
    queries.movements.push(
      sale({ createdAt: new Date("2026-11-11T15:00:00Z") }),
      sale({ createdAt: new Date("2026-11-12T00:30:00Z") }),
    );

    const result = await overview.execute({ businessId: "business-1", from: "2026-11-11", to: "2026-11-11" });

    expect(result.granularity).toBe("HOUR");
    expect(result.series).toHaveLength(24);
    expect(result.series[10]).toEqual({ start: "2026-11-11T10", sales: 1, total: 5000, profit: 1000 });
    expect(result.series[19]).toMatchObject({ start: "2026-11-11T19", sales: 1 });
    expect(result.series[12]).toEqual({ start: "2026-11-11T12", sales: 0, total: 0, profit: 0 });
  });

  it("should include the days without sales", async () => {
    const { queries, overview } = setup();
    queries.movements.push(sale({ createdAt: new Date("2026-11-03T15:00:00Z") }));

    const result = await overview.execute({ businessId: "business-1", from: "2026-11-01", to: "2026-11-07" });

    expect(result.granularity).toBe("DAY");
    expect(result.series.map(({ start, sales }) => [start, sales])).toEqual([
      ["2026-11-01", 0],
      ["2026-11-02", 0],
      ["2026-11-03", 1],
      ["2026-11-04", 0],
      ["2026-11-05", 0],
      ["2026-11-06", 0],
      ["2026-11-07", 0],
    ]);
  });

  it("should group a quarter by weeks that start on Monday", async () => {
    const { queries, overview } = setup();
    // Sábado 3 de octubre: va en la semana que empieza el jueves 1, porque el período empieza ahí.
    queries.movements.push(sale({ createdAt: new Date("2026-10-03T15:00:00Z") }));

    const result = await overview.execute({ businessId: "business-1", from: "2026-10-01", to: "2026-12-31" });

    expect(result.granularity).toBe("WEEK");
    expect(result.series[0]).toMatchObject({ start: "2026-10-01", sales: 1 });
    expect(result.series[1]!.start).toBe("2026-10-05");
    expect(result.series.at(-1)!.start).toBe("2026-12-28");
  });

  it("should group a year by months", async () => {
    const { overview } = setup();

    const result = await overview.execute({ businessId: "business-1", from: "2026-01-15", to: "2026-12-31" });

    expect(result.granularity).toBe("MONTH");
    expect(result.series.map(({ start }) => start)).toEqual([
      "2026-01-15",
      "2026-02-01",
      "2026-03-01",
      "2026-04-01",
      "2026-05-01",
      "2026-06-01",
      "2026-07-01",
      "2026-08-01",
      "2026-09-01",
      "2026-10-01",
      "2026-11-01",
      "2026-12-01",
    ]);
  });

  it("should count the inventory that needs attention", async () => {
    const { queries, overview } = setup();
    queries.products.push(product(10, 3), product(2, 3), product(0, 3), product(0, null), product(5, null));

    const result = await overview.execute({ businessId: "business-1", from: "2026-11-11", to: "2026-11-11" });

    expect(result.inventory).toEqual({ products: 5, lowStock: 1, outOfStock: 2 });
  });

  it("should list the top products and the sales that do not add up", async () => {
    const { queries, overview } = setup();
    queries.movements.push(
      sale({ productCode: "a", productName: "Arroz" }),
      sale({ productCode: "b", productName: "Leche", unitPrice: 6000 }),
      sale({ productCode: "c", productName: "Pan", unitPrice: null, unitCost: null }),
    );

    const result = await overview.execute({ businessId: "business-1", from: "2026-11-11", to: "2026-11-11" });

    expect(result.topProducts.map(({ name }) => name)).toEqual(["Leche", "Arroz", "Pan"]);
    expect(result.salesWithoutPrice).toBe(1);
    expect(result.salesWithoutCost).toBe(1);
  });

  it("should ask for a shorter period when there are too many sales", async () => {
    const { queries, overview } = setup();
    for (let index = 0; index <= MAX_REPORT_ROWS; index++) queries.movements.push(sale());

    const result = overview.execute({ businessId: "business-1", from: "2026-11-11", to: "2026-11-11" });

    await expect(result).rejects.toMatchObject({ code: "REPORT_TOO_LARGE" });
  });
});
