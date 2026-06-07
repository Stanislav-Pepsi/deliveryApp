import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import {
  Animated,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import Text from '../components/Text';

const GREEN      = '#8DBB00';
const GREEN_DARK = '#4a6600';
const BG         = '#0c0f0a';
const CARD       = 'rgba(255,255,255,0.06)';
const BORDER     = 'rgba(255,255,255,0.1)';

export interface OrderDetail {
  num: string;
  date: string;
  status: string;
  lines: { name: string; qty: number; price: string }[];
  delivery: 'delivery' | 'pickup';
  address?: string;
  addressSub?: string;
  time: string;
  payment: 'kaspi' | 'cash';
  comment?: string;
  total: string;
}

interface Props {
  order: OrderDetail;
  onBack: () => void;
}

export default function OrderDetailScreen({ order, onBack }: Props) {
  const blinkAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(blinkAnim, { toValue: 0.15, duration: 500, useNativeDriver: true }),
        Animated.timing(blinkAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Hero header — same as CheckoutScreen */}
      <View style={styles.hero}>
        <Image
          source={require('../assets/pexels-batuhan-kocabas-123879152-23330916.jpg')}
          style={styles.heroImg}
          resizeMode="cover"
        />
        <View style={styles.heroDim} />
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.8}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.stepText}>ЗАКАЗ {order.num}</Text>
            <Text style={styles.headerTitle}>Детали заказа</Text>
          </View>
          <View style={{ width: 42 }} />
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Состав заказа */}
        <Text style={styles.sectionLabel}>СОСТАВ ЗАКАЗА</Text>
        <View style={styles.linesCard}>
          {order.lines.map((l, i) => (
            <View key={i} style={[styles.lineRow, i < order.lines.length - 1 && styles.lineRowDivider]}>
              <Text style={styles.lineName}>{l.name}{l.qty > 1 ? ` × ${l.qty}` : ''}</Text>
              <Text style={styles.linePrice}>{l.price}</Text>
            </View>
          ))}
        </View>

        {/* Delivery / Pickup tabs — same visual, read-only */}
        <Text style={styles.sectionLabel}>СПОСОБ ПОЛУЧЕНИЯ</Text>
        <View style={styles.tabRow}>
          <View style={[styles.tab, order.delivery === 'delivery' && styles.tabActive]}>
            <Ionicons
              name="bicycle-outline"
              size={16}
              color={order.delivery === 'delivery' ? '#fff' : 'rgba(255,255,255,0.45)'}
            />
            <Text style={[styles.tabTxt, order.delivery === 'delivery' && styles.tabTxtActive]}>
              Доставка
            </Text>
          </View>
          <View style={[styles.tab, order.delivery === 'pickup' && styles.tabActive]}>
            <Ionicons
              name="storefront-outline"
              size={16}
              color={order.delivery === 'pickup' ? '#fff' : 'rgba(255,255,255,0.45)'}
            />
            <Text style={[styles.tabTxt, order.delivery === 'pickup' && styles.tabTxtActive]}>
              Самовывоз
            </Text>
          </View>
        </View>

        {/* Address */}
        {order.delivery === 'delivery' && order.address && (
          <>
            <Text style={styles.sectionLabel}>АДРЕС ДОСТАВКИ</Text>
            <View style={styles.addressCard}>
              <Ionicons name="location-outline" size={20} color={GREEN} style={{ marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.addressMain}>{order.address}</Text>
                {order.addressSub && <Text style={styles.addressSub}>{order.addressSub}</Text>}
              </View>
            </View>
          </>
        )}

        {/* Time */}
        <Text style={styles.sectionLabel}>ВРЕМЯ</Text>
        <View style={styles.twoCol}>
          <View style={[styles.timeCard, order.time === 'asap' && styles.timeCardActive]}>
            <Text style={[styles.timeCardLabel, order.time === 'asap' && styles.timeCardLabelActive]}>
              КАК МОЖНО СКОРЕЕ
            </Text>
            {order.time === 'asap' ? (
              <Animated.View style={{ opacity: blinkAnim }}>
                <Text style={styles.timeCardMain}>~35 мин</Text>
              </Animated.View>
            ) : (
              <Text style={styles.timeCardMain}>~35 мин</Text>
            )}
            <Text style={styles.timeCardSub}>9:45 — 10:20</Text>
          </View>
          <View style={[styles.timeCard, order.time === 'scheduled' && styles.timeCardActive]}>
            <Text style={[styles.timeCardLabel, order.time === 'scheduled' && styles.timeCardLabelActive]}>
              НА ВРЕМЯ
            </Text>
            <Text style={styles.timeCardMain}>Выбрать</Text>
            <Text style={styles.timeCardSub}>Сегодня / завтра</Text>
          </View>
        </View>

        {/* Payment */}
        <Text style={styles.sectionLabel}>СПОСОБ ОПЛАТЫ</Text>
        <View style={styles.twoCol}>
          <View style={[styles.payCard, order.payment === 'kaspi' && styles.payCardActive]}>
            {order.payment === 'kaspi' && (
              <View style={styles.payCheck}>
                <Ionicons name="checkmark" size={12} color="#fff" />
              </View>
            )}
            <Image
              source={require('../assets/png-klev-club-9nmb-p-kaspi-logotip-png-28.png')}
              style={styles.kaspiLogoImg}
              resizeMode="contain"
            />
            <Text style={styles.payName}>Kaspi KZ</Text>
            <Text style={styles.paySub}>Быстрая оплата</Text>
          </View>
          <View style={[styles.payCard, order.payment === 'cash' && styles.payCardActive]}>
            {order.payment === 'cash' && (
              <View style={styles.payCheck}>
                <Ionicons name="checkmark" size={12} color="#fff" />
              </View>
            )}
            <Ionicons name="cash-outline" size={28} color="rgba(255,255,255,0.6)" style={{ marginBottom: 8 }} />
            <Text style={styles.payName}>Наличными</Text>
            <Text style={styles.paySub}>Курьеру при получении</Text>
          </View>
        </View>

        {/* Comment */}
        {order.comment ? (
          <>
            <Text style={styles.sectionLabel}>КОММЕНТАРИЙ</Text>
            <View style={styles.commentBox}>
              <Text style={styles.commentTxt}>{order.comment}</Text>
            </View>
          </>
        ) : null}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom bar — same as CheckoutScreen */}
      <View style={styles.bottomBar}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Итого с доставкой</Text>
          <Text style={styles.totalVal}>{order.total}</Text>
        </View>
        <TouchableOpacity style={styles.backBtnBottom} activeOpacity={0.85} onPress={onBack}>
          <Text style={styles.backBtnTxt}>Назад к заказам</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  hero: { height: 120, position: 'relative' },
  heroImg: { width: '100%', height: '100%' },
  heroDim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.65)' },
  headerRow: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  backBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  stepText:     { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '600', letterSpacing: 1 },
  headerTitle:  { color: '#fff', fontSize: 18, fontWeight: '700', marginTop: 2 },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20 },

  sectionLabel: {
    color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: '700',
    letterSpacing: 1.2, marginBottom: 10, marginTop: 20,
  },

  linesCard: {
    backgroundColor: CARD, borderRadius: 14,
    borderWidth: 1, borderColor: BORDER,
    overflow: 'hidden',
  },
  lineRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 14 },
  lineRowDivider: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)' },
  lineName:  { color: 'rgba(255,255,255,0.8)', fontSize: 14, flex: 1 },
  linePrice: { color: '#fff', fontSize: 14, fontWeight: '600', marginLeft: 12 },

  tabRow: {
    flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 14, padding: 4, marginBottom: 4,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 6,
    paddingVertical: 12, borderRadius: 11,
  },
  tabActive:    { backgroundColor: GREEN_DARK },
  tabTxt:       { color: 'rgba(255,255,255,0.45)', fontWeight: '600', fontSize: 15 },
  tabTxtActive: { color: '#fff' },

  addressCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: CARD, borderRadius: 14,
    padding: 16, borderWidth: 1, borderColor: BORDER,
  },
  addressMain: { color: '#fff', fontWeight: '600', fontSize: 15 },
  addressSub:  { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 2 },

  twoCol: { flexDirection: 'row', gap: 10 },

  timeCard: {
    flex: 1, backgroundColor: CARD, borderRadius: 14,
    padding: 14, borderWidth: 1.5, borderColor: BORDER,
  },
  timeCardActive:      { borderColor: GREEN },
  timeCardLabel:       { color: 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: '700', letterSpacing: 0.8, marginBottom: 8 },
  timeCardLabelActive: { color: GREEN },
  timeCardMain: { color: '#fff', fontSize: 17, fontWeight: '700', marginBottom: 4 },
  timeCardSub:  { color: 'rgba(255,255,255,0.4)', fontSize: 12 },

  payCard: {
    flex: 1, backgroundColor: CARD, borderRadius: 14,
    padding: 14, borderWidth: 1.5, borderColor: BORDER, position: 'relative',
  },
  payCardActive: { borderColor: GREEN },
  payCheck: {
    position: 'absolute', top: 10, right: 10,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center',
  },
  kaspiLogoImg: { width: 28, height: 28, marginBottom: 8, alignSelf: 'flex-start' },
  payName: { color: '#fff', fontWeight: '700', fontSize: 14, marginBottom: 3 },
  paySub:  { color: 'rgba(255,255,255,0.4)', fontSize: 11 },

  commentBox: {
    backgroundColor: CARD, borderRadius: 14,
    borderWidth: 1, borderColor: BORDER,
    padding: 14, minHeight: 54,
  },
  commentTxt: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },

  bottomBar: {
    paddingHorizontal: 20, paddingTop: 14, paddingBottom: 46,
    backgroundColor: 'rgba(12,15,10,0.97)',
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)',
    gap: 12,
  },
  totalRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel:    { color: 'rgba(255,255,255,0.5)', fontSize: 13 },
  totalVal:      { color: '#fff', fontSize: 17, fontWeight: '800' },
  backBtnBottom: { backgroundColor: GREEN, borderRadius: 30, paddingVertical: 18, alignItems: 'center' },
  backBtnTxt:    { color: '#fff', fontSize: 17, fontWeight: '700' },
});
