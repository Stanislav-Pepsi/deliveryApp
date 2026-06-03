import { BASE_URL, baseHeaders } from './config';

export interface ApiTable {
  id: string;
  name: string;
  seatingCapacity: number;
}

export interface TableSection {
  id: string;
  name: string;
  tables: ApiTable[];
}

export interface UserReservation {
  id: string;
  status: string;
  type?: string;
  estimatedStartTime?: string;
  dateTime?: string;
  guestsCount?: number;
  guests?: number;
  tableNumber?: number;
  sectionName?: string;
  place?: string;
}

export interface BanquetOrderItem {
  productId: string;
  quantity: number;
}

export interface CreateReservationParams {
  type: 'TABLE' | 'BANQUET';
  tableIds: string[];
  estimatedStartTime: string;
  durationInMinutes: number;
  guestsCount: number;
  phone: string;
  comment?: string;
  items?: BanquetOrderItem[];
}

export async function fetchSections(): Promise<TableSection[]> {
  const res = await fetch(`${BASE_URL}/reservations/sections`, {
    headers: baseHeaders(),
  });
  if (!res.ok) throw new Error('Ошибка загрузки залов');
  return res.json().catch(() => []);
}

export async function createReservation(
  params: CreateReservationParams,
  token: string,
): Promise<{ id: string }> {
  const res = await fetch(`${BASE_URL}/reservations`, {
    method: 'POST',
    headers: baseHeaders(token),
    body: JSON.stringify(params),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Ошибка создания резерва');
  return data;
}

export async function cancelReservation(
  id: string,
  cancelReason: 'ClientRefused' | 'ClientNotAppeared' | 'Other',
  token: string,
): Promise<void> {
  const res = await fetch(`${BASE_URL}/reservations/${id}/cancel`, {
    method: 'POST',
    headers: baseHeaders(token),
    body: JSON.stringify({ cancelReason }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || 'Ошибка отмены бронирования');
  }
}

export interface PaginatedReservations { data: UserReservation[]; total: number; }

export async function fetchUserReservations(token: string, page = 1, limit = 20): Promise<PaginatedReservations> {
  const res = await fetch(`${BASE_URL}/reservations?page=${page}&limit=${limit}`, {
    headers: baseHeaders(token),
  });
  if (!res.ok) throw new Error('Ошибка загрузки резервов');
  const json = await res.json().catch(() => ({ data: [], total: 0 }));
  if (Array.isArray(json)) return { data: json, total: json.length };
  return { data: json.data ?? [], total: json.total ?? 0 };
}
