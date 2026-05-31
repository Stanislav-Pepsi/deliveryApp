import { BASE_URL, baseHeaders } from './config';

export interface ApiTable {
  id: string;
  number: number;
  seats: number;
  description?: string;
  isAvailable: boolean;
}

export interface TableSection {
  id: string;
  name: string;
  tables: ApiTable[];
}

export interface UserReservation {
  id: string;
  tableNumber?: number;
  sectionName?: string;
  place?: string;
  dateTime: string;
  guests: number;
  status: string;
}

export async function fetchSections(token: string): Promise<TableSection[]> {
  const res = await fetch(`${BASE_URL}/reservations/sections`, {
    headers: baseHeaders(token),
  });
  if (!res.ok) throw new Error('Ошибка загрузки залов');
  return res.json().catch(() => []);
}

export async function createReservation(
  tableId: string,
  date: string,
  time: string,
  guests: number,
  token: string,
): Promise<{ id: string }> {
  const [d, m, y] = date.split('.');
  const dateTime = `${y}-${m}-${d} ${time}:00`;
  const res = await fetch(`${BASE_URL}/reservations`, {
    method: 'POST',
    headers: baseHeaders(token),
    body: JSON.stringify({ tableId, dateTime, guests }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Ошибка создания резерва');
  return data;
}

export async function fetchUserReservations(token: string): Promise<UserReservation[]> {
  const res = await fetch(`${BASE_URL}/reservations`, {
    headers: baseHeaders(token),
  });
  if (!res.ok) throw new Error('Ошибка загрузки резервов');
  return res.json().catch(() => []);
}
