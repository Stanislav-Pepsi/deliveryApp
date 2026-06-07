import { BASE_URL, baseHeaders } from './config';

export interface Announcement {
  id: string;
  title: string;
  body: string;
  description: string | null;
  imageUrl: string | null;
  createdAt: string;
}

export interface PaginatedAnnouncements {
  data: Announcement[];
  total: number;
  page: number;
  limit: number;
}

export async function fetchAnnouncements(page = 1, limit = 20): Promise<PaginatedAnnouncements> {
  const res = await fetch(`${BASE_URL}/announcements?page=${page}&limit=${limit}`, {
    headers: baseHeaders(),
  });
  const json = await res.json().catch(() => ({ data: [], total: 0, page, limit }));
  if (!res.ok) throw new Error(json.message || 'Ошибка загрузки акций');
  if (Array.isArray(json)) return { data: json, total: json.length, page, limit };
  return { data: json.data ?? [], total: json.total ?? 0, page: json.page ?? page, limit: json.limit ?? limit };
}
