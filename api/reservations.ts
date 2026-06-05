import { BASE_URL, baseHeaders } from './config';

export interface ApiTable {
  id: string;
  number: number;
  name: string;
  seatingCapacity: number;
  isAvailable: boolean;
}

export interface SchemaColor {
  r?: number; g?: number; b?: number; a?: number;
}

export interface SchemaTableElement {
  tableId: string;
  x: number; y: number; z: number;
  width: number; height: number; angle: number;
}

export interface SchemaRectElement {
  x: number; y: number; z: number;
  width: number; height: number; angle: number;
  color?: SchemaColor;
}

export interface SchemaEllipseElement {
  x: number; y: number; z: number;
  width: number; height: number; angle: number;
  color?: SchemaColor;
}

export interface SchemaMarkElement {
  x: number; y: number; z: number;
  width: number; height: number; angle: number;
  text: string;
  font?: any;
  color?: SchemaColor;
}

export interface SectionSchema {
  width: number;
  height: number;
  tableElements: SchemaTableElement[];
  rectangleElements: SchemaRectElement[];
  ellipseElements: SchemaEllipseElement[];
  markElements: SchemaMarkElement[];
  revision: number;
  isDeleted: boolean;
}

export interface TableSection {
  id: string;
  name: string;
  tables: ApiTable[];
  schema?: SectionSchema | null;
}

export interface ReservationTable {
  id: string;
  name?: string | null;
  number?: number | null;
  sectionName?: string | null;
}

export interface ReservationResponseItem {
  productId: string;
  name?: string;
  amount: number;
  price: number;
  sizeId?: string | null;
  comment?: string | null;
  modifiers?: { productId: string; amount: number; price: number; productGroupId?: string }[];
}

export interface UserReservation {
  id: string;
  status: string;
  type?: string;
  estimatedStartTime?: string;
  dateTime?: string;
  createdAt?: string;
  guestsCount?: number;
  guests?: number;
  tableNumber?: number;
  tableName?: string;
  sectionName?: string;
  place?: string;
  comment?: string;
  tables?: ReservationTable[];
  items?: ReservationResponseItem[] | null;
}

export interface BanquetOrderModifier {
  productId: string;
  amount: number;
  price?: number;
  productGroupId: string | null;
}

export interface BanquetOrderItem {
  productId: string;
  amount: number;
  price: number;
  sizeId?: string;
  comment?: string;
  modifiers?: BanquetOrderModifier[];
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

export async function fetchSections(params?: { date?: string; time?: string; duration?: number }): Promise<TableSection[]> {
  const query = params
    ? '?' + Object.entries(params).filter(([, v]) => v != null).map(([k, v]) => `${k}=${v}`).join('&')
    : '';
  const res = await fetch(`${BASE_URL}/reservations/sections${query}`, {
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
  if (!res.ok) {
    const err: any = new Error(data.message || 'Ошибка создания резерва');
    err.status = res.status;
    throw err;
  }
  const id = data.id ?? data.reservationId ?? data.data?.id;
  return { ...data, id };
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
