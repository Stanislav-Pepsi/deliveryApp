import { Ionicons } from '@expo/vector-icons';
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
const GREEN      = '#8DBB00';
const GREEN_DARK = '#4a6600';
const BG         = '#0c0f0a';
const CARD       = 'rgba(255,255,255,0.06)';
const BORDER     = 'rgba(255,255,255,0.1)';

interface Order {
  id: string;
  num: string;
  date: string;
  status: string;
  totalStr: string;
  totalNum: number;
  deliveryType: 'delivery' | 'pickup';
  payment: 'kaspi' | 'cash';
  items: string;
  active: boolean;
}

const ORDERS_DATA: Order[] = [
  { id: '1', num: '#1042', date: '27.05.2026', status: 'В обработке', totalStr: '5 800 ₸', totalNum: 5800, deliveryType: 'delivery', payment: 'kaspi', items: 'Сет «Базилик», Паста карбонара', active: true },
  { id: '2', num: '#1038', date: '25.05.2026', status: 'Доставляется',  totalStr: '3 200 ₸', totalNum: 3200, deliveryType: 'delivery', payment: 'cash',  items: 'Боул «Лосось» × 2',             active: true },
  { id: '3', num: '#1031', date: '18.05.2026', status: 'Выполнен',      totalStr: '4 200 ₸', totalNum: 4200, deliveryType: 'pickup',   payment: 'kaspi', items: 'Сет «Шеф»',                     active: false },
  { id: '4', num: '#1024', date: '10.05.2026', status: 'Выполнен',      totalStr: '7 600 ₸', totalNum: 7600, deliveryType: 'delivery', payment: 'kaspi', items: 'Сет «Базилик» × 2',             active: false },
  { id: '5', num: '#1018', date: '02.05.2026', status: 'Выполнен',      totalStr: '2 100 ₸', totalNum: 2100, deliveryType: 'pickup',   payment: 'cash',  items: 'Паста карбонара',                active: false },
];

export interface OrderSummary {
  total: number;
  deliveryType: 'delivery' | 'pickup';
  payment: 'kaspi' | 'cash';
}

interface Props {
  onBack: () => void;
  onOrderPress: (summary: OrderSummary) => void;
}

export default function OrdersScreen({ onBack, onOrderPress }: Props) {
  const current = ORDERS_DATA.filter(o => o.active);
  const past    = ORDERS_DATA.filter(o => !o.active);

  const renderOrder = (o: Order) => (
    <TouchableOpacity
      key={o.id}
      style={[styles.card, !o.active && styles.cardDim]}
      onPress={() => onOrderPress({ total: o.totalNum, deliveryType: o.deliveryType, payment: o.payment })}
      activeOpacity={0.75}
    >
      <View style={styles.cardTop}>
        <Text style={styles.orderNum}>{o.num}</Text>
        <View style={[styles.badge, o.active ? styles.badgeActive : styles.badgeDone]}>
          <Text style={[styles.badgeTxt, o.active ? styles.badgeActiveTxt : styles.badgeDoneTxt]}>
            {o.status}
          </Text>
        </View>
      </View>
      <Text style={styles.orderItems} numberOfLines={2}>{o.items}</Text>
      <View style={styles.cardBottom}>
        <Text style={styles.orderDate}>{o.date}</Text>
        <Text style={styles.orderTotal}>{o.totalStr}</Text>
      </View>
    </TouchableOpacity>
  );

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

  sectionLabel: {
    color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: '700',
    letterSpacing: 1.5, marginBottom: 10,
  },

  card: {
    backgroundColor: CARD, borderRadius: 18,
    borderWidth: 1, borderColor: BORDER,
    padding: 16, marginBottom: 10,
  },
  cardDim: { opacity: 0.45 },

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
