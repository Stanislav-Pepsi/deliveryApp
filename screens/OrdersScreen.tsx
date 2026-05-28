import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import Text from '../components/Text';
import { DishData, OrderDisplayItem } from '../App';
import { ApiOrder, fetchOrders } from '../api/orders';

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
  deliveryType: 'delivery' | 'pickup';
  payment: 'kaspi' | 'cash';
  address: string;
  orderItems: OrderDisplayItem[];
}

interface Props {
  onBack: () => void;
  onOrderPress: (summary: OrderSummary) => void;
  authToken: string | null;
  dishes: DishData[];
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const date = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return `${date} · ${time}`;
}

export default function OrdersScreen({ onBack, onOrderPress, authToken, dishes }: Props) {
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authToken) { setLoading(false); return; }
    fetchOrders(authToken)
      .then(setOrders)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [authToken]);

  const current = orders.filter(o => ACTIVE_STATUSES.has(o.status));
  const past    = orders.filter(o => !ACTIVE_STATUSES.has(o.status));

  const renderOrder = (o: ApiOrder) => {
    const active = ACTIVE_STATUSES.has(o.status);
    const total = parseFloat(o.totalAmount) || 0;
    let addressText = '';
    if (o.deliveryAddress) {
      try {
        const parsed = JSON.parse(o.deliveryAddress);
        addressText = [parsed.streetName, parsed.house].filter(Boolean).join(', ');
      } catch {
        addressText = o.deliveryAddress;
      }
    }
    const summary: OrderSummary = {
      id: o.id,
      iikoNumber: o.iikoNumber,
      status: o.status,
      total,
      deliveryType: o.orderType === 'DELIVERY' ? 'delivery' : 'pickup',
      payment: o.paymentType === 'KASPI' ? 'kaspi' : o.paymentType === 'CASH' ? 'cash' : 'kaspi',
      address: addressText,
      orderItems: (o.items ?? []).map(i => ({
        name: dishes.find(d => d.id === i.productId)?.name || (i as any).name || 'Позиция',
        qty: i.amount,
        total: i.price * i.amount,
      })),
    };
    const itemCount = o.items?.length ?? 0;
    const orderNum = o.iikoNumber != null ? `Заказ №${o.iikoNumber}` : 'Заказ #...';
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
                {STATUS_LABELS[o.status] ?? o.status}
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

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator color={GREEN} style={{ marginTop: 60 }} />
        ) : orders.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={48} color="rgba(255,255,255,0.15)" />
            <Text style={styles.emptyTxt}>Нет заказов</Text>
          </View>
        ) : (
          <>
            {current.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>АКТИВНЫЕ</Text>
                {current.map(renderOrder)}
              </>
            )}
            {past.length > 0 && (
              <>
                <Text style={[styles.sectionLabel, { marginTop: 24 }]}>ИСТОРИЯ</Text>
                {past.map(renderOrder)}
              </>
            )}
          </>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
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
  orderNum:   { color: '#fff', fontSize: 15, fontWeight: '700' },
  orderItems: { color: 'rgba(255,255,255,0.75)', fontSize: 13, lineHeight: 19, marginBottom: 12 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderDate:  { color: 'rgba(255,255,255,0.4)', fontSize: 12 },
  orderTotal: { color: '#fff', fontSize: 15, fontWeight: '700' },

  badge:          { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  badgeActive:    { backgroundColor: 'rgba(141,187,0,0.15)', borderColor: GREEN_DARK },
  badgeDone:      { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.12)' },
  badgeTxt:       { fontSize: 11, fontWeight: '700' },
  badgeActiveTxt: { color: GREEN },
  badgeDoneTxt:   { color: 'rgba(255,255,255,0.4)' },
});
