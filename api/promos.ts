import { BASE_URL, baseHeaders } from './config';

export interface PromoResult {
  isValid: boolean;
  code: string;
  discountType: 'PERCENT_DISCOUNT' | 'FIXED_DISCOUNT' | 'GIFT_ITEM';
  discountValue: number;
  description: string;
}

const ERROR_MAP: [string, string][] = [
  ['not yet active',            'Промокод ещё не активен'],
  ['not active',                'Промокод недействителен'],
  ['has expired',               'Срок действия промокода истёк'],
  ['limit reached',             'Промокод больше не доступен'],
  ['already used',              'Вы уже использовали этот промокод'],
  ['first order',               'Доступен только для первого заказа'],
  ['not available at this time','Промокод недоступен в это время'],
];

export async function validatePromo(code: string, token: string): Promise<PromoResult> {
  const res = await fetch(`${BASE_URL}/promo-codes/validate?code=${encodeURIComponent(code)}`, {
    headers: baseHeaders(token),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 404) throw new Error('Промокод не найден');
    const msg: string = data.message || '';
    for (const [key, text] of ERROR_MAP) {
      if (msg.toLowerCase().includes(key)) throw new Error(text);
    }
    throw new Error(msg || 'Ошибка проверки промокода');
  }
  return data;
}

export function calcDiscount(promo: PromoResult, subtotal: number): number {
  if (promo.discountType === 'PERCENT_DISCOUNT')
    return Math.floor(subtotal * promo.discountValue / 100);
  if (promo.discountType === 'FIXED_DISCOUNT')
    return Math.min(promo.discountValue, subtotal);
  return 0;
}

export function promoLabel(promo: PromoResult): string {
  if (promo.discountType === 'PERCENT_DISCOUNT') return `Скидка ${promo.discountValue}%`;
  if (promo.discountType === 'FIXED_DISCOUNT')   return `Скидка ${promo.discountValue.toLocaleString('ru-RU')} ₸`;
  return promo.description || 'Подарок';
}
