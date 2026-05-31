import { BASE_URL, baseHeaders } from './config';

export interface RestaurantInfo {
  id?: string;
  name: string;
  address: string;
  phone: string;
  workingHours?: string;
  timezone?: string;
  deliveryFeeAmount: number | null;
  cashbackPercent: number | null;
}

export async function fetchRestaurantInfo(token: string): Promise<RestaurantInfo> {
  const res = await fetch(`${BASE_URL}/restaurant/info`, {
    headers: baseHeaders(token),
  });
  if (!res.ok) throw new Error('Ошибка загрузки информации о ресторане');
  return res.json();
}
