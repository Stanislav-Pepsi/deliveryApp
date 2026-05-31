export const BASE_URL          = 'https://nonvirulently-nonpursuant-georgie.ngrok-free.dev/api/v1';
export const RESTAURANT_ID     = 'd0d87afb-755b-4b53-99b5-4cf9c0d302ca';
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
