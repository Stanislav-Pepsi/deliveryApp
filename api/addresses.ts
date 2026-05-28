import { BASE_URL, baseHeaders } from './config';

export interface ApiAddress {
  id: string;
  fullAddress: string;
}

export async function fetchAddresses(token: string): Promise<ApiAddress[]> {
  const res = await fetch(`${BASE_URL}/addresses`, {
    headers: baseHeaders(token),
  });
  if (!res.ok) throw new Error('Ошибка загрузки адресов');
  return res.json().catch(() => []);
}

export async function addAddress(fullAddress: string, token: string): Promise<ApiAddress> {
  const res = await fetch(`${BASE_URL}/addresses`, {
    method: 'POST',
    headers: baseHeaders(token),
    body: JSON.stringify({ fullAddress }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Ошибка добавления адреса');
  return data;
}

export async function deleteAddress(id: string, token: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/addresses/${id}`, {
    method: 'DELETE',
    headers: baseHeaders(token),
  });
  if (!res.ok) throw new Error('Ошибка удаления адреса');
}
