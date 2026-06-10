import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { io } from 'socket.io-client';
import Text from '../components/Text';
import { DishData, OrderDisplayItem } from '../App';
import { ApiOrder, fetchOrders } from '../api/orders';

import { WS_URL } from '../api/config';

const GREEN      = '#8DBB00';
const GREEN_DARK = '#4a6600';
const BG         = '#0c0f0a';
const CARD       = 'rgba(255,255,255,0.06)';
const BORDER     = 'rgba(255,255,255,0.1)';

const STATUS_LABELS: Record<string, string> = {
  CREATED:     'Принят',
  IN_PROGRESS: 'Готовится',
  READY:       'Готовится',
  ON_WAY:      'Передан',
  DELIVERED:   'Доставлен',
  CANCELLED:   'Отменён',
};
const ACTIVE_STATUSES = new Set(['CREATED', 'IN_PROGRESS', 'READY', 'ON_WAY']);

export interface OrderSummary {
  id: string;
  iikoNumber: number | null;
  status: string;
  total: number;
  bonusesSpent?: number | null;
  promoDiscount?: number | null;
  deliveryFee?: number | null;
  deliveryType: 'delivery' | 'pickup';
  payment: 'kaspi' | 'cash';
  address: string;
  orderItems: OrderDisplayItem[];
  createdAt?: string;
}

interface Props {
  onBack: () => void;
  onOrderPress: (summary: OrderSummary) => void;
  authToken: string | null;
  dishes: DishData[];
  isDemoMode?: boolean;
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const date = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return `${date} · ${time}`;
}

const LIMIT = 20;

export default function OrdersScreen({ onBack, onOrderPress, authToken, dishes, isDemoMode }: Props) {
  const [orders, setOrders]       = useState<ApiOrder[]>([]);
  const [loading, setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore]     = useState(false);
  const pageRef = useRef(1);

  const loadOrders = async (page: number, append = false) => {
    if (!authToken) { setLoading(false); return; }
    try {
      const res = await fetchOrders(authToken, page, LIMIT);
      setOrders(prev => append ? [...prev, ...res.data] : res.data);
      setHasMore(page * LIMIT < res.total);
      pageRef.current = page;
    } catch {}
  };

  useEffect(() => {
    if (isDemoMode) {
      const { DEMO_ORDERS } = require('../constants/demo');
      setOrders(DEMO_ORDERS);
      setLoading(false);
      return;
    }
    loadOrders(1).finally(() => setLoading(false));
  }, [authToken, isDemoMode]);

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    await loadOrders(pageRef.current + 1, true);
    setLoadingMore(false);
  };

  // Polling — обновляем первую страницу каждые 15 секунд
  useEffect(() => {
    if (isDemoMode || !authToken) return;
    const interval = setInterval(() => {
      fetchOrders(authToken, 1, LIMIT)
        .then(res => setOrders(prev => {
          const fresh = res.data;
          return pageRef.current > 1 ? [...fresh, ...prev.slice(fresh.length)] : fresh;
        }))
        .catch(() => {});
    }, 15000);
    return () => clearInterval(interval);
  }, [authToken, isDemoMode]);

  // WebSocket — мгновенное обновление статуса
  useEffect(() => {
    if (isDemoMode || !authToken) return;
    const socket = io(`${WS_URL}/client`, {
      auth: { token: `Bearer ${authToken}` },
      transports: ['websocket'],
    });
    socket.on('order:status_changed', (payload: { orderId: string; status: string }) => {
      setOrders(prev => prev.map(o => o.id === payload.orderId ? { ...o, status: payload.status } : o));
    });
    return () => { socket.disconnect(); };
  }, [authToken, isDemoMode]);

  const current = orders.filter(o => ACTIVE_STATUSES.has(o.status));
  const past    = orders.filter(o => !ACTIVE_STATUSES.has(o.status));

  const renderOrder = (o: ApiOrder) => {
    const active = ACTIVE_STATUSES.has(o.status);
    const total = parseFloat(o.totalAmount) || 0;
    let addressText = '';
    if (o.deliveryAddress) {
      try {
        const parsed = JSON.parse(o.deliveryAddress);
        const base = [parsed.streetName, parsed.house].filter(Boolean).join(', ');
        const details = [
          parsed.entrance ? `под. ${parsed.entrance}` : '',
          parsed.floor    ? `этаж ${parsed.floor}`    : '',
          parsed.flat     ? `кв. ${parsed.flat}`      : '',
        ].filter(Boolean).join(', ');
        addressText = details ? `${base}, ${details}` : base;
      } catch {
        addressText = o.deliveryAddress;
      }
    }
    const summary: OrderSummary = {
      id: o.id,
      iikoNumber: o.iikoNumber,
      status: o.status,
      total,
      bonusesSpent: o.bonusesSpent ? parseFloat(o.bonusesSpent) : null,
      deliveryFee: o.deliveryFee ? parseFloat(o.deliveryFee) : null,
      promoDiscount: o.promoDiscount ? parseFloat(o.promoDiscount) : null,
      deliveryType: o.orderType === 'DELIVERY' ? 'delivery' : 'pickup',
      payment: o.paymentType === 'SCASH' ? 'cash' : 'kaspi',
      address: addressText,
      createdAt: o.createdAt,
      orderItems: (o.items ?? []).map(i => {
        const dish = dishes.find(d => d.id === i.productId);
        const size = dish?.sizes.find(s => s.sizeId === i.sizeId);
        const allModifiers = (size ?? dish?.sizes.find(s => s.isDefault) ?? dish?.sizes[0])?.modifierGroups.flatMap(g => g.modifiers) ?? [];
        const sizeName = (dish && dish.sizes.length > 1) ? (size?.sizeName || i.sizeName) : undefined;
        const extraNames = (i.modifiers ?? []).map(m => allModifiers.find(mod => mod.id === m.productId)?.name || m.name).filter(Boolean);
        return {
          name: dish?.name || i.name || 'Позиция',
          meta: [sizeName, ...extraNames].filter(Boolean).join(' · ') || undefined,
          qty: i.amount,
          total: i.price * i.amount,
        };
      }),
    };
    const itemCount = o.items?.length ?? 0;
    const orderNum = o.iikoNumber != null ? `Заказ #${o.iikoNumber}` : 'Заказ #...';
    return (
      <TouchableOpacity
        key={o.id}
        onPress={() => onOrderPress(summary)}
        activeOpacity={0.75}
        style={styles.cardWrapper}
      >
        <View style={[styles.card, active ? styles.cardActive : styles.cardDim]}>
          <View style={styles.cardTop}>
            <Text style={styles.orderNum}>{orderNum}</Text>
            <View style={[styles.badge, active ? styles.badgeActive : styles.badgeDone]}>
              <Text style={[styles.badgeTxt, active ? styles.badgeActiveTxt : styles.badgeDoneTxt]}>
                {o.status === 'READY' && o.orderType === 'PICKUP'
                  ? 'Готов'
                  : (STATUS_LABELS[o.status] ?? o.status)}
              </Text>
            </View>
          </View>
          {itemCount > 0 && (
            <Text style={styles.orderItems}>
              {itemCount} {itemCount === 1 ? 'позиция' : itemCount < 5 ? 'позиции' : 'позиций'}
              {addressText ? ` · ${addressText}` : ''}
            </Text>
          )}
          <View style={styles.cardBottom}>
            <Text style={styles.orderDate}>{formatDateTime(o.createdAt)}</Text>
            <Text style={styles.orderTotal}>{total.toLocaleString('ru-RU')} ₸</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.8}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.headerSub}>ПРОФИЛЬ</Text>
          <Text style={styles.headerTitle}>Мои заказы</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={GREEN} style={{ marginTop: 60 }} />
      ) : orders.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="receipt-outline" size={48} color="rgba(255,255,255,0.15)" />
          <Text style={styles.emptyTxt}>Нет заказов</Text>
        </View>
      ) : (
        <FlatList
          data={[
            ...(current.length > 0 ? [{ type: 'header' as const, title: 'АКТИВНЫЕ' }, ...current.map(o => ({ type: 'order' as const, order: o }))] : []),
            ...(past.length > 0 ? [{ type: 'header' as const, title: 'ИСТОРИЯ' }, ...past.map(o => ({ type: 'order' as const, order: o }))] : []),
          ]}
          keyExtractor={(item, i) => item.type === 'header' ? `h-${i}` : item.order.id}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          renderItem={({ item, index }) => {
            if (item.type === 'header') {
              return <Text style={[styles.sectionLabel, index > 0 && { marginTop: 24 }]}>{item.title}</Text>;
            }
            return <>{renderOrder(item.order)}</>;
          }}
          ListFooterComponent={
            loadingMore
              ? <ActivityIndicator color={GREEN} style={{ marginVertical: 16 }} />
              : <View style={{ height: 40 }} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: BG },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20,
  },
  backBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerSub:   { color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 3 },
  headerTitle: { color: '#fff', fontSize: 24, fontWeight: '800' },

  scroll: { paddingHorizontal: 20, paddingTop: 8 },

  empty:    { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyTxt: { color: 'rgba(255,255,255,0.4)', fontSize: 16, fontWeight: '600' },

  sectionLabel: {
    color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: '700',
    letterSpacing: 1.5, marginBottom: 10,
  },

  cardWrapper: { marginBottom: 18 },

  orderTag: {
    alignSelf: 'flex-start',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginLeft: 14,
    marginBottom: -8,
    zIndex: 1,
  },
  orderTagActive: { backgroundColor: 'rgba(141,187,0,0.15)', borderColor: GREEN },
  orderTagDim:    { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.15)' },
  orderTagTxt:       { fontSize: 12, fontWeight: '700' },
  orderTagTxtActive: { color: GREEN },
  orderTagTxtDim:    { color: 'rgba(255,255,255,0.35)' },

  card: {
    backgroundColor: CARD, borderRadius: 18,
    borderWidth: 1, borderColor: BORDER,
    padding: 16,
  },
  cardActive: {
    backgroundColor: 'rgba(141,187,0,0.08)',
    borderColor: GREEN_DARK,
    borderWidth: 1.5,
  },
  cardDim: { opacity: 0.4 },

  cardTop:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  orderNum:   { color: '#fff', fontSize: 15, fontWeight: '700', fontStyle: 'italic' },
  orderItems: { color: 'rgba(255,255,255,0.75)', fontSize: 13, lineHeight: 19, marginBottom: 12 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderDate:  { color: 'rgba(255,255,255,0.4)', fontSize: 12 },
  orderTotal:    { color: '#fff', fontSize: 15, fontWeight: '700' },
  orderDiscount: { color: '#8DBB00', fontSize: 12, fontWeight: '600', marginBottom: 4 },

  badge:          { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  badgeActive:    { backgroundColor: 'rgba(141,187,0,0.15)', borderColor: GREEN_DARK },
  badgeDone:      { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.12)' },
  badgeTxt:       { fontSize: 11, fontWeight: '700' },
  badgeActiveTxt: { color: GREEN },
  badgeDoneTxt:   { color: 'rgba(255,255,255,0.4)' },
});
