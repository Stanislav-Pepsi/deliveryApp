import { CartItem } from '../App';
import { BASE_URL, baseHeaders } from './config';

export interface ApiOrder {
  id: string;
  iikoNumber: number | null;
  orderType: 'DELIVERY' | 'PICKUP';
  status: string;
  paymentType: 'CARD' | 'KASPI' | 'CASH';
  paymentStatus: 'UNPAID' | 'PAID' | 'REFUNDED';
  totalAmount: string;
  deliveryFee: string | null;
  promoDiscount: string | null;
  bonusesSpent: string | null;
  bonusesEarned: string | null;
  items: { productId: string; name?: string; amount: number; price: number; sizeId?: string }[];
  deliveryAddress: string | null;
  createdAt: string;
  updatedAt: string;
}

function splitAddress(address: string): { streetName: string; house: string } {
  const i = address.lastIndexOf(' ');
  if (i === -1) return { streetName: address, house: '' };
  return { streetName: address.substring(0, i), house: address.substring(i + 1) };
}

export async function createOrder(
  items: CartItem[],
  deliveryType: 'delivery' | 'pickup',
  payment: 'kaspi' | 'cash',
  address: string,
  comment: string,
  token: string,
  phone: string,
  bonusesToSpend?: number,
  promoCode?: string,
): Promise<{ orderId: string; deliveryFee: number | null; promoDiscount: number | null }> {
  const paymentType = payment === 'kaspi' ? 'CARD' : 'CASH';
  const totalAmount = items.reduce((s, i) => s + i.unitPrice * i.qty, 0);

  const body: Record<string, unknown> = {
    phone,
    orderType: deliveryType === 'delivery' ? 'DELIVERY' : 'PICKUP',
    paymentType,
    totalAmount,
    items: items.map(i => {
      const entry: Record<string, unknown> = {
        productId: i.dish.id,
        amount: i.qty,
        price: i.unitPrice,
      };
      if (i.size) entry.sizeId = i.size;
      if (i.extras.length > 0) entry.modifiers = i.extras.map(e => ({ productId: e.id, amount: 1, price: e.price, productGroupId: e.groupId ?? null }));
      return entry;
    }),
  };

  if (deliveryType === 'delivery' && address) {
    body.deliveryAddress = splitAddress(address);
  }

  if (comment) body.comment = comment;
  if (bonusesToSpend && bonusesToSpend > 0) body.bonusesToSpend = bonusesToSpend;
  if (promoCode) body.promoCode = promoCode;

  const res = await fetch(`${BASE_URL}/orders`, {
    method: 'POST',
    headers: baseHeaders(token),
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Ошибка оформления заказа');
  return data;
}

export async function fetchOrderById(orderId: string, token: string): Promise<ApiOrder> {
  const res = await fetch(`${BASE_URL}/orders/${orderId}`, {
    headers: baseHeaders(token),
  });
  if (!res.ok) throw new Error('Заказ не найден');
  return res.json();
}

export async function fetchOrders(token: string): Promise<ApiOrder[]> {
  const res = await fetch(`${BASE_URL}/orders`, {
    headers: baseHeaders(token),
  });
  if (!res.ok) throw new Error('Ошибка загрузки заказов');
  return res.json().catch(() => []);
}
