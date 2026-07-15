const TIME_ZONE_COOKIE = "momentum_tz";

export function getTimeZoneCookieName() {
  return TIME_ZONE_COOKIE;
}

/** Inline script: persist the browser IANA zone for subsequent SSR requests. */
export const timeZoneInitScript = `(function(){try{var tz=Intl.DateTimeFormat().resolvedOptions().timeZone;if(!tz)return;document.cookie="${TIME_ZONE_COOKIE}="+encodeURIComponent(tz)+";path=/;max-age=31536000;samesite=lax";}catch(e){}})();`;

export function getRequestTimeZone(request: Request) {
  const cookie = request.headers.get("cookie") ?? "";
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${TIME_ZONE_COOKIE}=([^;]+)`));
  const raw = match?.[1] ? decodeURIComponent(match[1]) : null;
  return isValidTimeZone(raw) ? raw : "UTC";
}

export function isValidTimeZone(value: string | null | undefined): value is string {
  if (!value) return false;
  try {
    Intl.DateTimeFormat("en-GB", { timeZone: value }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  /** 0 = Sunday … 6 = Saturday */
  weekday: number;
};

const WEEKDAY_TO_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export function getZonedParts(date: Date, timeZone: string): ZonedParts {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      weekday: "short",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  ) as Record<string, string>;

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
    weekday: WEEKDAY_TO_INDEX[parts.weekday ?? "Sun"] ?? 0,
  };
}

/** Offset between the given instant's UTC fields and its wall time in `timeZone`. */
function getTimeZoneOffsetMs(date: Date, timeZone: string) {
  const parts = getZonedParts(date, timeZone);
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  return asUtc - date.getTime();
}

/** Build a UTC instant for a wall-clock datetime in `timeZone`. */
export function zonedLocalDateTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timeZone: string,
) {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second);
  const offset1 = getTimeZoneOffsetMs(new Date(utcGuess), timeZone);
  const instant1 = Date.UTC(year, month - 1, day, hour, minute, second) - offset1;
  const offset2 = getTimeZoneOffsetMs(new Date(instant1), timeZone);
  return new Date(Date.UTC(year, month - 1, day, hour, minute, second) - offset2);
}

export function startOfZonedDay(date: Date, timeZone: string) {
  const parts = getZonedParts(date, timeZone);
  return zonedLocalDateTimeToUtc(parts.year, parts.month, parts.day, 0, 0, 0, timeZone);
}

export function endOfZonedDay(date: Date, timeZone: string) {
  const parts = getZonedParts(date, timeZone);
  return zonedLocalDateTimeToUtc(parts.year, parts.month, parts.day, 23, 59, 59, timeZone);
}

export function addZonedDays(date: Date, days: number, timeZone: string) {
  const parts = getZonedParts(date, timeZone);
  const base = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days, 12, 0, 0));
  return zonedLocalDateTimeToUtc(
    base.getUTCFullYear(),
    base.getUTCMonth() + 1,
    base.getUTCDate(),
    0,
    0,
    0,
    timeZone,
  );
}

export function calendarDaysBetween(a: Date, b: Date, timeZone: string) {
  const startA = startOfZonedDay(a, timeZone).getTime();
  const startB = startOfZonedDay(b, timeZone).getTime();
  return Math.round(Math.abs(startA - startB) / (24 * 60 * 60 * 1000));
}
export function formatDate(date: Date, timeZone?: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(timeZone ? { timeZone } : {}),
  }).format(date);
}

export function formatDateTime(date: Date, timeZone?: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h12",

    ...(timeZone ? { timeZone } : {}),
  }).format(date);
}

/** Relative calendar gap in the user's zone, e.g. "Today", "Yesterday", "2 days ago". */
export function formatRelativeDate(date: Date, timeZone: string, now = new Date()) {
  const days = calendarDaysBetween(date, now, timeZone);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 14) return `${days} days ago`;
  if (days < 45) {
    const weeks = Math.round(days / 7);
    return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
  }
  return formatDate(date, timeZone);
}

/** Format a Date for `<input type="date">` using calendar parts in `timeZone`. */
export function formatDateInput(date: Date, timeZone = "UTC") {
  const parts = getZonedParts(date, timeZone);
  const month = String(parts.month).padStart(2, "0");
  const day = String(parts.day).padStart(2, "0");
  return `${parts.year}-${month}-${day}`;
}

/** Format a Date for `<input type="time">` using clock parts in `timeZone`. */
export function formatTimeInput(date: Date, timeZone = "UTC") {
  const parts = getZonedParts(date, timeZone);
  const hour = String(parts.hour).padStart(2, "0");
  const minute = String(parts.minute).padStart(2, "0");
  return `${hour}:${minute}`;
}

/** Parse `YYYY-MM-DD` as noon in `timeZone` to keep the calendar date stable. */
export function parseDateInput(value: string, timeZone = "UTC") {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;

  const parsed = zonedLocalDateTimeToUtc(year, month, day, 12, 0, 0, timeZone);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Parse `YYYY-MM-DD` + `HH:MM` in `timeZone`. */
export function parseDateTimeInput(dateValue: string, timeValue: string, timeZone = "UTC") {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    return null;
  }
  if (!/^\d{2}:\d{2}$/.test(timeValue)) {
    return null;
  }

  const [year, month, day] = dateValue.split("-").map(Number);
  const [hour, minute] = timeValue.split(":").map(Number);
  if (!year || !month || !day || hour == null || minute == null) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;

  const parsed = zonedLocalDateTimeToUtc(year, month, day, hour, minute, 0, timeZone);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** When logging for today, keep the real time so same-day entries sort correctly. */
export function resolvePerformedAtForCreate(performedAt: Date, timeZone = "UTC", now = new Date()) {
  const today = formatDateInput(now, timeZone);
  const selected = formatDateInput(performedAt, timeZone);

  if (selected === today) {
    return now;
  }

  return performedAt;
}

/** Preserve intraday time when the date field is unchanged on edit. */
export function resolvePerformedAtForUpdate(
  nextPerformedAt: Date,
  existingPerformedAt: Date,
  timeZone = "UTC",
  now = new Date(),
) {
  const nextDay = formatDateInput(nextPerformedAt, timeZone);
  const existingDay = formatDateInput(existingPerformedAt, timeZone);

  if (nextDay === existingDay) {
    return existingPerformedAt;
  }

  return resolvePerformedAtForCreate(nextPerformedAt, timeZone, now);
}

export function getMonthRange(month: number, year = new Date().getFullYear()) {
  return {
    start: new Date(year, month - 1, 1),
    end: new Date(year, month, 1),
  };
}
