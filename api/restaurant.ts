import { BASE_URL, baseHeaders } from './config';

type DayHours = { open: string; close: string } | null;

export interface RestaurantInfo {
  id?: string;
  name: string;
  address: string;
  phone: string | null;
  workingHours?: Record<string, DayHours> | null;
  timezone?: string;
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

export async function fetchRestaurantInfo(token: string): Promise<RestaurantInfo> {
  const res = await fetch(`${BASE_URL}/restaurant/info`, {
    headers: baseHeaders(token),
  });
  if (!res.ok) throw new Error('Ошибка загрузки информации о ресторане');
  return res.json();
}
