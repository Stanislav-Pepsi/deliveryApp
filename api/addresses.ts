import { BASE_URL, baseHeaders } from './config';

export interface ApiAddress {
  id: string;
  label: string | null;
  street: string;
  house: string;
  apartment: string | null;
  entrance: string | null;
  floor: string | null;
  isDefault: boolean;
}

export interface AddressInput {
  street: string;
  house: string;
  apartment?: string;
  entrance?: string;
  floor?: string;
  label?: string;
  isDefault?: boolean;
}

export function addressDisplay(a: ApiAddress): string {
  const base = [a.street, a.house].filter(Boolean).join(', ');
  const details = [
    a.entrance ? `под. ${a.entrance}` : '',
    a.floor    ? `этаж ${a.floor}`    : '',
    a.apartment ? `кв. ${a.apartment}` : '',
  ].filter(Boolean).join(', ');
  return details ? `${base}, ${details}` : base;
}

export async function fetchAddresses(token: string): Promise<ApiAddress[]> {
  const res = await fetch(`${BASE_URL}/addresses`, {
    headers: baseHeaders(token),
  });
  if (!res.ok) throw new Error('Ошибка загрузки адресов');
  return res.json().catch(() => []);
}

export async function addAddress(input: AddressInput, token: string): Promise<ApiAddress> {
  const res = await fetch(`${BASE_URL}/addresses`, {
    method: 'POST',
    headers: baseHeaders(token),
    body: JSON.stringify({
      label:     input.label     ?? null,
      street:    input.street,
      house:     input.house,
      apartment: input.apartment ?? null,
      entrance:  input.entrance  ?? null,
      floor:     input.floor     ?? null,
      isDefault: input.isDefault ?? false,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Ошибка добавления адреса');
  return data;
}

export async function updateAddress(id: string, input: AddressInput, token: string): Promise<ApiAddress> {
  const res = await fetch(`${BASE_URL}/addresses/${id}`, {
    method: 'PATCH',
    headers: baseHeaders(token),
    body: JSON.stringify({
      label:     input.label     ?? null,
      street:    input.street,
      house:     input.house,
      apartment: input.apartment ?? null,
      entrance:  input.entrance  ?? null,
      floor:     input.floor     ?? null,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Ошибка обновления адреса');
  return data;
}

export async function deleteAddress(id: string, token: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/addresses/${id}`, {
    method: 'DELETE',
    headers: baseHeaders(token),
  });
  if (!res.ok) throw new Error('Ошибка удаления адреса');
}
