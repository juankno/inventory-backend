/** Colombia no tiene horario de verano: siempre es UTC-5. */
const BOGOTA_OFFSET_MS = 5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Rango de fechas; `end` no se incluye. */
export interface DateRange {
  start: Date;
  end: Date;
}

export const isCalendarDate = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
};

const startOfBogotaDay = (day: string): Date =>
  new Date(new Date(`${day}T00:00:00Z`).getTime() + BOGOTA_OFFSET_MS);

/** Los días completos de `from` a `to`, los dos incluidos, en hora de Colombia. */
export const toDateRange = (from: string, to: string): DateRange => ({
  start: startOfBogotaDay(from),
  end: new Date(startOfBogotaDay(to).getTime() + DAY_MS),
});

/** Excel no maneja zonas horarias: la fecha se escribe con la hora que se ve en Colombia. */
export const toBogotaClock = (date: Date): Date =>
  new Date(date.getTime() - BOGOTA_OFFSET_MS);

/** Hoy y la semana actual, que empieza el lunes, en hora de Colombia. */
export const currentPeriods = (
  now: Date,
): { today: DateRange; week: DateRange } => {
  const clock = toBogotaClock(now).getTime();
  const todayStart = Math.floor(clock / DAY_MS) * DAY_MS + BOGOTA_OFFSET_MS;
  const end = new Date(todayStart + DAY_MS);
  const daysSinceMonday = (new Date(clock).getUTCDay() + 6) % 7;
  return {
    today: { start: new Date(todayStart), end },
    week: { start: new Date(todayStart - daysSinceMonday * DAY_MS), end },
  };
};

/** Suma días a una fecha AAAA-MM-DD. */
export const addDays = (day: string, days: number): string =>
  new Date(Date.parse(`${day}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);

/** Cuántos días hay de `from` a `to`, los dos incluidos. */
export const daysInPeriod = (from: string, to: string): number =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS) + 1;

/** El período del mismo largo que termina justo antes de `from`. */
export const previousPeriod = (
  from: string,
  to: string,
): { from: string; to: string } => {
  const days = daysInPeriod(from, to);
  return { from: addDays(from, -days), to: addDays(from, -1) };
};

/**
 * Cómo se agrupan las ventas en el gráfico, para que tenga entre 1 y ~31 barras:
 * un día por horas, hasta un mes por días, hasta un trimestre por semanas y el
 * resto por meses.
 */
export type SeriesGranularity = "HOUR" | "DAY" | "WEEK" | "MONTH";

export const seriesGranularity = (from: string, to: string): SeriesGranularity => {
  const days = daysInPeriod(from, to);
  if (days === 1) return "HOUR";
  if (days <= 31) return "DAY";
  if (days <= 92) return "WEEK";
  return "MONTH";
};

const mondayOf = (day: string): string => {
  const weekday = new Date(`${day}T00:00:00Z`).getUTCDay();
  return addDays(day, -((weekday + 6) % 7));
};

/** El grupo de un día: el mismo día, su lunes o su día 1, sin ir antes de `from`. */
const dayBucket = (
  day: string,
  granularity: Exclude<SeriesGranularity, "HOUR">,
  from: string,
): string => {
  const start =
    granularity === "DAY" ? day : granularity === "WEEK" ? mondayOf(day) : `${day.slice(0, 7)}-01`;
  return start < from ? from : start;
};

/**
 * Dónde empieza el grupo de una fecha, en hora de Colombia: "2026-11-18T14" para
 * las horas y "2026-11-16" para los días, semanas (lunes) y meses (día 1). Un grupo
 * que empieza antes de `from` se marca con `from`.
 */
export const bucketStart = (
  date: Date,
  granularity: SeriesGranularity,
  from: string,
): string => {
  const clock = toBogotaClock(date).toISOString();
  return granularity === "HOUR"
    ? clock.slice(0, 13)
    : dayBucket(clock.slice(0, 10), granularity, from);
};

/** Todos los grupos del período, en orden, también los que no tienen ventas. */
export const bucketStarts = (
  from: string,
  to: string,
  granularity: SeriesGranularity,
): string[] => {
  if (granularity === "HOUR") {
    return Array.from({ length: 24 }, (_, hour) => `${from}T${String(hour).padStart(2, "0")}`);
  }
  const starts: string[] = [];
  for (let day = from; day <= to; day = addDays(day, 1)) {
    const start = dayBucket(day, granularity, from);
    if (starts.at(-1) !== start) starts.push(start);
  }
  return starts;
};
