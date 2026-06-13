export const BASE_URL          = 'https://dev.starten.kz/api/v1';
export const WS_URL            = 'https://dev.starten.kz';
export const RESTAURANT_ID     = '6e2e862f-ba99-4823-a3c1-fa2ad3757cb3';
export const CASH_PAYMENT_ID  = '09322f46-578a-d210-add7-eec222a08871';
export const CARD_PAYMENT_ID  = 'e46b4e6c-10d5-a739-8fb1-b6674d1e65e7';

export function baseHeaders(token?: string | null): Record<string, string> {
  const h: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Restaurant-ID': RESTAURANT_ID,
  };
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}
