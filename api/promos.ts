import { BASE_URL, baseHeaders } from './config';

export interface PromoResult {
  isValid: boolean;
  code: string;
  discountType: 'PERCENT_DISCOUNT' | 'FIXED_DISCOUNT' | 'GIFT_ITEM';
  discountValue: number;
  description: string;
  giftProductId?: string;
  minOrderAmount?: number;
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
  const discountValue = Number(
    data.discountValue ?? data.discount_value ?? data.value ?? data.discount ?? data.amount ?? 0
  );
  const giftProductId: string | undefined =
    data.giftProductId ?? data.gift_product_id ?? undefined;
  const minOrderAmount: number | undefined =
    data.minOrderAmount != null ? Number(data.minOrderAmount)
    : data.min_order_amount != null ? Number(data.min_order_amount)
    : undefined;
  return { ...data, discountValue, giftProductId, minOrderAmount };
}

export function calcDiscount(promo: PromoResult, subtotal: number): number {
  if (promo.discountType === 'PERCENT_DISCOUNT')
    return Math.floor(subtotal * promo.discountValue / 100);
  if (promo.discountType === 'FIXED_DISCOUNT')
    return Math.min(promo.discountValue, subtotal);
  return 0;
}

export function promoLabel(promo: PromoResult): string {
  if (promo.discountType === 'PERCENT_DISCOUNT') return `−${promo.discountValue}%`;
  if (promo.discountType === 'FIXED_DISCOUNT')   return `−${promo.discountValue.toLocaleString('ru-RU')} ₸`;
  return promo.description || 'Подарок';
}
