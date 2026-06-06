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
  items: {
    productId: string;
    name?: string;
    amount: number;
    price: number;
    sizeId?: string;
    sizeName?: string;
    modifiers?: { productId: string; name?: string; amount: number; price: number; productGroupId?: string | null }[];
  }[];
  deliveryAddress: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function createOrder(
  items: CartItem[],
  deliveryType: 'delivery' | 'pickup',
  payment: 'kaspi' | 'cash',
  addressId: string | undefined,
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

  // Бэкенд сам подтянет адрес из адресной книги по addressId — это сохраняет
  // все поля (квартира/подъезд/этаж/комментарий), в отличие от разбора строки
  if (deliveryType === 'delivery' && addressId) {
    body.addressId = addressId;
  }

  if (comment) body.comment = comment;
  // promoCode и bonusesToSpend взаимоисключающие на бэкенде (вернёт 400) —
  // промокод выбран пользователем явно, поэтому он в приоритете
  if (promoCode) {
    body.promoCode = promoCode;
  } else if (bonusesToSpend && bonusesToSpend > 0) {
    body.bonusesToSpend = bonusesToSpend;
  }
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
