import { CartItem } from '../App';
import { BASE_URL, baseHeaders } from './config';

export class UnavailableItemsError extends Error {
  productIds: string[];
  constructor(message: string, productIds: string[]) {
    super(message);
    this.productIds = productIds;
  }
}

export interface ApiOrder {
  id: string;
  iikoNumber: number | null;
  orderType: 'DELIVERY' | 'PICKUP';
  status: string;
  paymentType: 'SCARD' | 'SCASH';
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
  completeBefore?: string,
): Promise<{ orderId: string; deliveryFee: number | null; promoDiscount: number | null }> {
  const paymentType = payment === 'kaspi' ? 'SCARD' : 'SCASH';
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
  if (completeBefore) body.completeBefore = completeBefore;

  const res = await fetch(`${BASE_URL}/orders`, {
    method: 'POST',
    headers: baseHeaders(token),
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message: string = data.message || 'Ошибка оформления заказа';
    if (message.startsWith('Items are currently unavailable:')) {
      const ids = message.replace('Items are currently unavailable:', '').trim().split(',').map((s: string) => s.trim()).filter(Boolean);
      throw new UnavailableItemsError(message, ids);
    }
    throw new Error(message);
  }
  return data;
}

export async function fetchOrderById(orderId: string, token: string): Promise<ApiOrder> {
  const res = await fetch(`${BASE_URL}/orders/${orderId}`, {
    headers: baseHeaders(token),
  });
  if (!res.ok) throw new Error('Заказ не найден');
  return res.json();
}

export interface PaginatedOrders { data: ApiOrder[]; total: number; page: number; limit: number; }

export async function fetchOrders(token: string, page = 1, limit = 20): Promise<PaginatedOrders> {
  const res = await fetch(`${BASE_URL}/orders?page=${page}&limit=${limit}`, {
    headers: baseHeaders(token),
  });
  if (!res.ok) throw new Error('Ошибка загрузки заказов');
  const json = await res.json().catch(() => ({ data: [], total: 0, page, limit }));
  if (Array.isArray(json)) return { data: json, total: json.length, page, limit };
  return { data: json.data ?? [], total: json.total ?? 0, page: json.page ?? page, limit: json.limit ?? limit };
}
