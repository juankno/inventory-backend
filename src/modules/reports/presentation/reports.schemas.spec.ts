import { overviewQuerySchema, reportPeriodSchema } from "./reports.schemas.ts";

describe("reportPeriodSchema", () => {
  it.each([
    ["one day", "2026-11-01", "2026-11-01"],
    ["a month", "2026-11-01", "2026-11-30"],
    ["a whole year", "2026-01-01", "2026-12-31"],
  ])("should accept %s", (_name, from, to) => {
    expect(reportPeriodSchema.safeParse({ from, to }).success).toBe(true);
  });

  it.each([
    ["an end before the start", "2026-11-02", "2026-11-01"],
    ["more than a year", "2025-01-01", "2026-12-31"],
    ["a date that does not exist", "2026-02-30", "2026-03-01"],
    ["another format", "01/11/2026", "2026-11-30"],
  ])("should reject %s", (_name, from, to) => {
    expect(reportPeriodSchema.safeParse({ from, to }).success).toBe(false);
  });

  it("should reject a missing date", () => {
    expect(reportPeriodSchema.safeParse({ from: "2026-11-01" }).success).toBe(false);
  });
});

describe("overviewQuerySchema", () => {
  const period = { from: "2026-11-01", to: "2026-11-18" };

  it("should accept a period without a comparison", () => {
    expect(overviewQuerySchema.safeParse(period).success).toBe(true);
  });

  it("should accept a period with a comparison", () => {
    expect(
      overviewQuerySchema.safeParse({ ...period, compareFrom: "2026-10-01", compareTo: "2026-10-18" }).success,
    ).toBe(true);
  });

  it.each([
    ["only the start of the comparison", { compareFrom: "2026-10-01" }],
    ["a reversed comparison", { compareFrom: "2026-10-18", compareTo: "2026-10-01" }],
    ["another field", { extra: "1" }],
  ])("should reject %s", (_name, extra) => {
    expect(overviewQuerySchema.safeParse({ ...period, ...extra }).success).toBe(false);
  });
});
