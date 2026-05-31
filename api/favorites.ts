import { BASE_URL, baseHeaders } from './config';

export async function fetchFavorites(token: string): Promise<Set<string>> {
  const res = await fetch(`${BASE_URL}/favorites`, { headers: baseHeaders(token) });
  if (!res.ok) throw new Error('Ошибка загрузки избранного');
  const data: string[] = await res.json().catch(() => []);
  return new Set(data);
}

export async function addFavorite(productId: string, token: string): Promise<void> {
  await fetch(`${BASE_URL}/favorites`, {
    method: 'POST',
    headers: baseHeaders(token),
    body: JSON.stringify({ productId }),
  });
}

export async function removeFavorite(productId: string, token: string): Promise<void> {
  await fetch(`${BASE_URL}/favorites/${productId}`, {
    method: 'DELETE',
    headers: baseHeaders(token),
  });
}
