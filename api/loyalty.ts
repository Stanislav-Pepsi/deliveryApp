import { BASE_URL, baseHeaders } from './config';

export interface LoyaltyBalance {
  balance: number;
  currency: string;
}

export interface LoyaltyTransaction {
  id: string;
  type: 'EARNED' | 'SPENT' | 'REFUNDED' | 'MANUAL_ADD' | 'MANUAL_DEDUCT';
  amount: string;
  orderId: string | null;
  description: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export async function fetchLoyaltyBalance(token: string): Promise<LoyaltyBalance> {
  const res = await fetch(`${BASE_URL}/loyalty/balance`, {
    headers: baseHeaders(token),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.warn('[loyalty/balance]', res.status, data);
    throw new Error(data.message || 'Ошибка загрузки баланса');
  }
  return data;
}

export interface PaginatedTransactions { data: LoyaltyTransaction[]; total: number; }

export async function fetchLoyaltyTransactions(token: string, page = 1, limit = 20): Promise<PaginatedTransactions> {
  const res = await fetch(`${BASE_URL}/loyalty/transactions?page=${page}&limit=${limit}`, {
    headers: baseHeaders(token),
  });
  const json = await res.json().catch(() => ({ data: [], total: 0 }));
  if (!res.ok) { console.warn('[loyalty/transactions]', res.status, json); return { data: [], total: 0 }; }
  if (Array.isArray(json)) return { data: json, total: json.length };
  return { data: json.data ?? [], total: json.total ?? 0 };
}
