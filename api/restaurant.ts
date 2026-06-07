import { BASE_URL, baseHeaders } from './config';

type DayHours = { open: string; close: string } | null;

export interface RestaurantInfo {
  id?: string;
  name: string;
  address: string;
  phone: string | null;
  workingHours?: Record<string, DayHours> | null;
  timezone?: string;
  isTemporarilyClosed: boolean;
  deliveryFeeAmount: number | null;
  cashbackPercent: number | null;
  serviceChargePercent: number | null;
}

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

function parseTime(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}

// Returns open/close in minutes from midnight. close may be > 1440 if cross-midnight.
export function getHoursForDay(
  workingHours: RestaurantInfo['workingHours'],
  date: Date,
): { openMin: number; closeMin: number } | null {
  if (!workingHours) return null;
  const key = DAY_KEYS[date.getDay()];
  const day = workingHours[key];
  if (!day?.open || !day?.close) return null;
  const openMin  = parseTime(day.open);
  const closeMin = parseTime(day.close);
  return {
    openMin,
    closeMin: closeMin <= openMin ? closeMin + 24 * 60 : closeMin,
  };
}

// Returns { dayKey: 'mon', timeStr: 'HH:MM' } in the restaurant's timezone
function getRestaurantTimeParts(timezone: string): { dayKey: string; timeStr: string } | null {
  try {
    const now = new Date();
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(now);
    const dayLabel = parts.find(p => p.type === 'weekday')?.value.toLowerCase();
    const hour     = parts.find(p => p.type === 'hour')?.value ?? '00';
    const minute   = parts.find(p => p.type === 'minute')?.value ?? '00';
    if (!dayLabel) return null;
    return { dayKey: dayLabel, timeStr: `${hour}:${minute}` };
  } catch {
    return null;
  }
}

// Whether the restaurant is open right now according to its schedule.
// Handles cross-midnight schedules (e.g. open 09:00, close 02:00 next day).
// Returns true when data is unavailable (fail-open).
export function isOpenNow(
  workingHours: RestaurantInfo['workingHours'],
  timezone?: string,
): boolean {
  if (!workingHours || !timezone) return true;
  const t = getRestaurantTimeParts(timezone);
  if (!t) return true;

  const [nowH, nowM] = t.timeStr.split(':').map(Number);
  const nowMin = nowH * 60 + nowM;

  // Check today's schedule
  const hours = workingHours[t.dayKey];
  if (hours) {
    const openMin  = parseTime(hours.open);
    const closeMin = parseTime(hours.close);
    if (closeMin > openMin) {
      // Same-day window: open 09:00 → close 22:00
      if (nowMin >= openMin && nowMin < closeMin) return true;
    } else {
      // Cross-midnight: open 09:00 → close 02:00 (next day)
      if (nowMin >= openMin) return true;
    }
  }

  // Check if we're inside the previous day's cross-midnight tail
  // e.g. it's 01:30 (Mon), prev day (Sun) closed at 02:00 → still open
  const currentIdx = DAY_KEYS.indexOf(t.dayKey);
  if (currentIdx !== -1) {
    const prevKey   = DAY_KEYS[(currentIdx + 6) % 7];
    const prevHours = workingHours[prevKey];
    if (prevHours) {
      const prevOpenMin  = parseTime(prevHours.open);
      const prevCloseMin = parseTime(prevHours.close);
      // Cross-midnight tail only applies when close < open
      if (prevCloseMin <= prevOpenMin && nowMin < prevCloseMin) return true;
    }
  }

  return false;
}

// Milliseconds until the restaurant closes (for a single setTimeout).
// Handles cross-midnight schedules. Returns -1 if closed or data unavailable.
export function getMsUntilClose(
  workingHours: RestaurantInfo['workingHours'],
  timezone?: string,
): number {
  if (!workingHours || !timezone) return -1;
  const t = getRestaurantTimeParts(timezone);
  if (!t) return -1;

  const [nowH, nowM] = t.timeStr.split(':').map(Number);
  const nowMin = nowH * 60 + nowM;
  const now    = new Date();
  const elapsedMs = now.getSeconds() * 1000 + now.getMilliseconds();

  const msDiff = (diffMin: number) => Math.max(0, diffMin * 60 * 1000 - elapsedMs);

  // Check today's schedule
  const hours = workingHours[t.dayKey];
  if (hours) {
    const openMin  = parseTime(hours.open);
    const closeMin = parseTime(hours.close);
    if (closeMin > openMin) {
      if (nowMin >= openMin && nowMin < closeMin) return msDiff(closeMin - nowMin);
    } else {
      // Cross-midnight: if after opening, time until midnight + closeMin
      if (nowMin >= openMin) return msDiff(24 * 60 - nowMin + closeMin);
    }
  }

  // Check cross-midnight tail of previous day
  const currentIdx = DAY_KEYS.indexOf(t.dayKey);
  if (currentIdx !== -1) {
    const prevKey   = DAY_KEYS[(currentIdx + 6) % 7];
    const prevHours = workingHours[prevKey];
    if (prevHours) {
      const prevOpenMin  = parseTime(prevHours.open);
      const prevCloseMin = parseTime(prevHours.close);
      if (prevCloseMin <= prevOpenMin && nowMin < prevCloseMin) return msDiff(prevCloseMin - nowMin);
    }
  }

  return -1;
}

// Next open time as "HH:MM" string (looks ahead up to 7 days). Returns null if unknown.
export function getNextOpenTime(
  workingHours: RestaurantInfo['workingHours'],
  timezone?: string,
): string | null {
  if (!workingHours || !timezone) return null;
  const t = getRestaurantTimeParts(timezone);
  if (!t) return null;

  const [nowH, nowM] = t.timeStr.split(':').map(Number);
  const nowMin = nowH * 60 + nowM;

  // If before today's opening, return today's open time
  const todayHours = workingHours[t.dayKey];
  if (todayHours && nowMin < parseTime(todayHours.open)) return todayHours.open;

  // Scan ahead up to 7 days
  const currentIdx = DAY_KEYS.indexOf(t.dayKey);
  if (currentIdx === -1) return null;
  for (let i = 1; i <= 7; i++) {
    const nextKey   = DAY_KEYS[(currentIdx + i) % 7];
    const nextHours = workingHours[nextKey];
    if (nextHours) return nextHours.open;
  }
  return null;
}

export async function fetchRestaurantInfo(token: string): Promise<RestaurantInfo> {
  const res = await fetch(`${BASE_URL}/restaurant/info`, {
    headers: baseHeaders(token),
  });
  if (!res.ok) throw new Error('Ошибка загрузки информации о ресторане');
  return res.json();
}
