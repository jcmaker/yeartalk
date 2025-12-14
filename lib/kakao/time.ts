const SEOUL_TZ = "Asia/Seoul";

const seoulDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: SEOUL_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const seoulHourFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: SEOUL_TZ,
  hour: "2-digit",
  hourCycle: "h23",
});

const seoulWeekdayFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: SEOUL_TZ,
  weekday: "short",
});

const weekdayToIndex: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export const parseSeoulLocalDateTimeToIsoUtc = (args: {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  hour: number; // 0-23
  minute: number; // 0-59
}): string | null => {
  try {
    // Asia/Seoul is fixed UTC+9 (no DST).
    const utcMs = Date.UTC(
      args.year,
      args.month - 1,
      args.day,
      args.hour - 9,
      args.minute,
      0,
      0,
    );
    const date = new Date(utcMs);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString();
  } catch {
    return null;
  }
};

export const getSeoulDateKey = (tsIso: string): string | null => {
  const date = new Date(tsIso);
  if (Number.isNaN(date.getTime())) return null;
  // en-CA => YYYY-MM-DD
  return seoulDateFormatter.format(date);
};

export const getSeoulHour = (tsIso: string): number | null => {
  const date = new Date(tsIso);
  if (Number.isNaN(date.getTime())) return null;
  const hourStr = seoulHourFormatter.format(date);
  const hour = Number.parseInt(hourStr, 10);
  return Number.isNaN(hour) ? null : hour;
};

export const getSeoulWeekdayIndex = (tsIso: string): number | null => {
  const date = new Date(tsIso);
  if (Number.isNaN(date.getTime())) return null;
  const weekday = seoulWeekdayFormatter.format(date);
  const idx = weekdayToIndex[weekday];
  return typeof idx === "number" ? idx : null;
};
