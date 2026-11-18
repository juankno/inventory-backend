import z from "zod";

import { isCalendarDate } from "../domain/report-period.ts";

const MAX_PERIOD_DAYS = 366;
const DAY_MS = 24 * 60 * 60 * 1000;

const day = z.string().refine(isCalendarDate);

const isValidPeriod = (from: string, to: string): boolean => {
  const days = (Date.parse(to) - Date.parse(from)) / DAY_MS;
  return days >= 0 && days < MAX_PERIOD_DAYS;
};

/** `from` y `to` son días en hora de Colombia, los dos incluidos. */
export const reportPeriodSchema = z
  .strictObject({ from: day, to: day })
  .refine(({ from, to }) => isValidPeriod(from, to));

/** Como el período, con otro opcional para comparar: van los dos o ninguno. */
export const overviewQuerySchema = z
  .strictObject({
    from: day,
    to: day,
    compareFrom: day.optional(),
    compareTo: day.optional(),
  })
  .refine(({ from, to }) => isValidPeriod(from, to))
  .refine(({ compareFrom, compareTo }) =>
    compareFrom === undefined && compareTo === undefined
      ? true
      : compareFrom !== undefined &&
        compareTo !== undefined &&
        isValidPeriod(compareFrom, compareTo),
  );
