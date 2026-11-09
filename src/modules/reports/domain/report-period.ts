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
