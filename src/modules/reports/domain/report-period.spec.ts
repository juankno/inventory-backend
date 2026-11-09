import {
  currentPeriods,
  isCalendarDate,
  toBogotaClock,
  toDateRange,
} from "./report-period.ts";

describe("isCalendarDate", () => {
  it("should accept a real date", () => {
    expect(isCalendarDate("2026-02-28")).toBe(true);
  });

  it.each(["2026-02-30", "2026-13-01", "2026-1-1", "ayer", ""])(
    "should reject %j",
    (value) => {
      expect(isCalendarDate(value)).toBe(false);
    },
  );
});

describe("toDateRange", () => {
  it("should cover whole days in Colombia, including the last one", () => {
    expect(toDateRange("2026-11-01", "2026-11-02")).toEqual({
      start: new Date("2026-11-01T05:00:00Z"),
      end: new Date("2026-11-03T05:00:00Z"),
    });
  });
});

describe("toBogotaClock", () => {
  it("should show the time of Colombia", () => {
    expect(toBogotaClock(new Date("2026-11-01T02:00:00Z"))).toEqual(
      new Date("2026-10-31T21:00:00Z"),
    );
  });
});

describe("currentPeriods", () => {
  it("should still be yesterday in Colombia right after midnight UTC", () => {
    // Domingo 8 de noviembre a las 8 p. m. en Colombia.
    const { today } = currentPeriods(new Date("2026-11-09T01:00:00Z"));

    expect(today.start).toEqual(new Date("2026-11-08T05:00:00Z"));
    expect(today.end).toEqual(new Date("2026-11-09T05:00:00Z"));
  });

  it("should start the week on Monday", () => {
    // Miércoles 11 de noviembre.
    const { week } = currentPeriods(new Date("2026-11-11T15:00:00Z"));

    expect(week.start).toEqual(new Date("2026-11-09T05:00:00Z"));
    expect(week.end).toEqual(new Date("2026-11-12T05:00:00Z"));
  });

  it("should count Sunday as the end of the week that began on Monday", () => {
    // Domingo 8 de noviembre.
    const { week } = currentPeriods(new Date("2026-11-08T15:00:00Z"));

    expect(week.start).toEqual(new Date("2026-11-02T05:00:00Z"));
  });

  it("should start the week today on a Monday", () => {
    const { today, week } = currentPeriods(new Date("2026-11-09T15:00:00Z"));

    expect(week.start).toEqual(today.start);
  });
});
