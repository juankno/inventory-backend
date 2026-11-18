import {
  addDays,
  bucketStart,
  bucketStarts,
  currentPeriods,
  daysInPeriod,
  previousPeriod,
  seriesGranularity,
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

describe("periods for the overview", () => {
  it("should add days across months and years", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("should count both ends of the period", () => {
    expect(daysInPeriod("2026-11-01", "2026-11-01")).toBe(1);
    expect(daysInPeriod("2026-11-01", "2026-11-30")).toBe(30);
  });

  it("should take the same number of days right before", () => {
    expect(previousPeriod("2026-11-18", "2026-11-18")).toEqual({ from: "2026-11-17", to: "2026-11-17" });
    expect(previousPeriod("2026-11-16", "2026-11-22")).toEqual({ from: "2026-11-09", to: "2026-11-15" });
  });

  it.each([
    ["2026-11-18", "2026-11-18", "HOUR"],
    ["2026-11-01", "2026-11-30", "DAY"],
    ["2026-10-01", "2026-12-31", "WEEK"],
    ["2026-01-01", "2026-12-31", "MONTH"],
  ])("should group %s to %s by %s", (from, to, granularity) => {
    expect(seriesGranularity(from, to)).toBe(granularity);
  });

  it("should place a sale in its group in the time of Colombia", () => {
    // 11:30 p. m. del martes 17 en Colombia, ya miércoles 18 en UTC.
    const date = new Date("2026-11-18T04:30:00Z");
    expect(bucketStart(date, "HOUR", "2026-11-17")).toBe("2026-11-17T23");
    expect(bucketStart(date, "DAY", "2026-11-01")).toBe("2026-11-17");
    expect(bucketStart(date, "WEEK", "2026-11-01")).toBe("2026-11-16");
    expect(bucketStart(date, "WEEK", "2026-11-17")).toBe("2026-11-17");
    expect(bucketStart(date, "MONTH", "2026-01-01")).toBe("2026-11-01");
  });

  it("should list every week of the period once", () => {
    expect(bucketStarts("2026-11-04", "2026-11-20", "WEEK")).toEqual(["2026-11-04", "2026-11-09", "2026-11-16"]);
  });
});
