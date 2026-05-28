import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Text from '../components/Text';
import { CartItem } from '../App';
import { createOrder } from '../api/orders';

const GREEN = '#8DBB00';
const GREEN_DARK = '#4a6600';
const BG = '#0c0f0a';
const CARD = 'rgba(255,255,255,0.06)';
const BORDER = 'rgba(255,255,255,0.1)';

interface Props {
  total: number;
  address?: string;
  onAddressPress?: () => void;
  onBack: () => void;
  onSuccess: (deliveryType: 'delivery' | 'pickup', payment: 'kaspi' | 'cash', orderId: string) => void;
  authToken: string | null;
  phone: string;
  cartItems: CartItem[];
}

export default function CheckoutScreen({ total, address, onAddressPress, onBack, onSuccess, authToken, phone, cartItems }: Props) {
  const [deliveryType, setDeliveryType] = useState<'delivery' | 'pickup'>('delivery');
  const [timeType, setTimeType] = useState<'asap' | 'scheduled'>('asap');
  const [payment, setPayment] = useState<'kaspi' | 'cash'>('kaspi');
  const [comment, setComment] = useState('');

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onBack();
      return true;
    });
    return () => sub.remove();
  }, [onBack]);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const handleSubmit = async () => {
    if (!authToken) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const order = await createOrder(cartItems, deliveryType, payment, address ?? '', comment, authToken, phone);
      onSuccess(deliveryType, payment, order.id);
    } catch (e: any) {
      setSubmitError(e.message || 'Ошибка оформления заказа');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Hero header */}
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
            <Text style={styles.stepText}>ШАГ 2 ИЗ 2</Text>
            <Text style={styles.headerTitle}>Оформление</Text>
          </View>
          <View style={{ width: 42 }} />
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Delivery / Pickup tabs */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tab, deliveryType === 'delivery' && styles.tabActive]}
            onPress={() => setDeliveryType('delivery')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="bicycle-outline"
              size={16}
              color={deliveryType === 'delivery' ? '#fff' : 'rgba(255,255,255,0.45)'}
            />
            <Text style={[styles.tabTxt, deliveryType === 'delivery' && styles.tabTxtActive]}>
              Доставка
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, deliveryType === 'pickup' && styles.tabActive]}
            onPress={() => setDeliveryType('pickup')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="storefront-outline"
              size={16}
              color={deliveryType === 'pickup' ? '#fff' : 'rgba(255,255,255,0.45)'}
            />
            <Text style={[styles.tabTxt, deliveryType === 'pickup' && styles.tabTxtActive]}>
              Самовывоз
            </Text>
          </TouchableOpacity>
        </View>

        {/* Address */}
        {deliveryType === 'delivery' && (
          <>
            <Text style={styles.sectionLabel}>АДРЕС ДОСТАВКИ</Text>
            <TouchableOpacity style={styles.addressCard} activeOpacity={0.8} onPress={onAddressPress}>
              <Ionicons name="location-outline" size={20} color={GREEN} style={{ marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                {address ? (
                  <Text style={styles.addressMain}>{address}</Text>
                ) : (
                  <Text style={styles.addressPlaceholder}>Укажите адрес доставки</Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.3)" />
            </TouchableOpacity>
          </>
        )}

        {/* Time */}
        <Text style={styles.sectionLabel}>ВРЕМЯ</Text>
        <View style={styles.twoCol}>
          <TouchableOpacity
            style={[styles.timeCard, timeType === 'asap' && styles.timeCardActive]}
            onPress={() => setTimeType('asap')}
            activeOpacity={0.8}
          >
            <Text style={[styles.timeCardLabel, timeType === 'asap' && styles.timeCardLabelActive]}>
              КАК МОЖНО СКОРЕЕ
            </Text>
            <Text style={styles.timeCardMain}>~35 мин</Text>
            <Text style={styles.timeCardSub}>9:45 — 10:20</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.timeCard, timeType === 'scheduled' && styles.timeCardActive]}
            onPress={() => setTimeType('scheduled')}
            activeOpacity={0.8}
          >
            <Text style={[styles.timeCardLabel, timeType === 'scheduled' && styles.timeCardLabelActive]}>
              НА ВРЕМЯ
            </Text>
            <Text style={styles.timeCardMain}>Выбрать</Text>
            <Text style={styles.timeCardSub}>Сегодня / завтра</Text>
          </TouchableOpacity>
        </View>

        {/* Payment */}
        <Text style={styles.sectionLabel}>СПОСОБ ОПЛАТЫ</Text>
        <View style={styles.twoCol}>
          <TouchableOpacity
            style={[styles.payCard, payment === 'kaspi' && styles.payCardActive]}
            onPress={() => setPayment('kaspi')}
            activeOpacity={0.8}
          >
            {payment === 'kaspi' && (
              <View style={styles.payCheck}>
                <Ionicons name="checkmark" size={12} color="#fff" />
              </View>
            )}
            <Ionicons name="card-outline" size={28} color="rgba(255,255,255,0.6)" style={{ marginBottom: 8 }} />
            <Text style={styles.payName}>Картой</Text>
            <Text style={styles.paySub}>Банковская карта</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.payCard, payment === 'cash' && styles.payCardActive]}
            onPress={() => setPayment('cash')}
            activeOpacity={0.8}
          >
            {payment === 'cash' && (
              <View style={styles.payCheck}>
                <Ionicons name="checkmark" size={12} color="#fff" />
              </View>
            )}
            <Ionicons name="cash-outline" size={28} color="rgba(255,255,255,0.6)" style={{ marginBottom: 8 }} />
            <Text style={styles.payName}>Наличными</Text>
            <Text style={styles.paySub}>Курьеру при получении</Text>
          </TouchableOpacity>
        </View>

        {/* Comment */}
        <Text style={styles.sectionLabel}>КОММЕНТАРИЙ</Text>
        <TextInput
          style={styles.commentInput}
          placeholder="Например, не звонить в дверь..."
          placeholderTextColor="rgba(255,255,255,0.25)"
          value={comment}
          onChangeText={setComment}
          underlineColorAndroid="transparent"
          multiline
        />

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom bar */}
      <View style={styles.bottomBar}>
        {!!submitError && <Text style={styles.errorTxt}>{submitError}</Text>}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Итого с доставкой</Text>
          <Text style={styles.totalVal}>{total.toLocaleString('ru-RU')} ₸</Text>
        </View>
        <TouchableOpacity
          style={[styles.payBtn, submitting && { opacity: 0.6 }]}
          activeOpacity={0.85}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.payBtnTxt}>{payment === 'kaspi' ? 'Оплатить картой' : 'Оформить заказ'}</Text>
          }
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
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  stepText: { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '600', letterSpacing: 1 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginTop: 2 },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20 },

  sectionLabel: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 10,
    marginTop: 20,
  },

  tabRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 14,
    padding: 4,
    marginBottom: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 11,
  },
  tabActive: { backgroundColor: GREEN_DARK },
  tabTxt: { color: 'rgba(255,255,255,0.45)', fontWeight: '600', fontSize: 15 },
  tabTxtActive: { color: '#fff' },

  addressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },
  addressMain:        { color: '#fff', fontWeight: '600', fontSize: 15 },
  addressSub:         { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 2 },
  addressPlaceholder: { color: 'rgba(255,255,255,0.35)', fontSize: 15 },

  twoCol: { flexDirection: 'row', gap: 10 },
  timeCard: {
    flex: 1,
    backgroundColor: CARD,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: BORDER,
  },
  timeCardActive: { borderColor: GREEN },
  timeCardLabel: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  timeCardLabelActive: { color: GREEN },
  timeCardMain: { color: '#fff', fontSize: 17, fontWeight: '700', marginBottom: 4 },
  timeCardSub: { color: 'rgba(255,255,255,0.4)', fontSize: 12 },

  payCard: {
    flex: 1,
    backgroundColor: CARD,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: BORDER,
    position: 'relative',
  },
  payCardActive: { borderColor: GREEN },
  payCheck: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payName: { color: '#fff', fontWeight: '700', fontSize: 14, marginBottom: 3 },
  paySub: { color: 'rgba(255,255,255,0.4)', fontSize: 11 },

  commentInput: {
    backgroundColor: CARD,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    color: '#fff',
    fontSize: 14,
    minHeight: 54,
  },

  errorTxt: {
    color: '#e05252',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 46,
    backgroundColor: 'rgba(12,15,10,0.97)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    gap: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 13 },
  totalVal: { color: '#fff', fontSize: 17, fontWeight: '800' },
  payBtn: {
    backgroundColor: GREEN,
    borderRadius: 30,
    paddingVertical: 18,
    alignItems: 'center',
  },
  payBtnTxt: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
