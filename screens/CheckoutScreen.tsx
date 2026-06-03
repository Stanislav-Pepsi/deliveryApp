import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  Image,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import Text from '../components/Text';
import { CartItem } from '../App';
import { createOrder, UnavailableItemsError } from '../api/orders';
import { fetchLoyaltyBalance } from '../api/loyalty';
import { RestaurantInfo, getHoursForDay } from '../api/restaurant';

const GREEN = '#8DBB00';
const GREEN_DARK = '#4a6600';
const BG = '#0c0f0a';
const CARD = 'rgba(255,255,255,0.06)';
const BORDER = 'rgba(255,255,255,0.1)';

interface Props {
  subtotal: number;
  deliveryFeeAmount?: number | null;
  address?: string;
  onAddressPress?: () => void;
  onBack: () => void;
  onSuccess: (deliveryType: 'delivery' | 'pickup', payment: 'kaspi' | 'cash', orderId: string, bonusesSpent: number, deliveryFee: number, promoDiscount: number) => void;
  authToken: string | null;
  phone: string;
  cartItems: CartItem[];
  initialBonuses?: number;
  promoCode?: string;
  promoDiscount?: number;
  cashbackPercent?: number | null;
  restaurantInfo?: RestaurantInfo | null;
}

export default function CheckoutScreen({ subtotal, deliveryFeeAmount, address, onAddressPress, onBack, onSuccess, authToken, phone, cartItems, initialBonuses = 0, promoCode, promoDiscount = 0, cashbackPercent, restaurantInfo }: Props) {
  const [deliveryType, setDeliveryType] = useState<'delivery' | 'pickup'>('delivery');
  const [timeType, setTimeType] = useState<'asap' | 'scheduled'>('asap');
  const [payment, setPayment] = useState<'kaspi' | 'cash'>('kaspi');
  const [comment, setComment] = useState('');
  const [loyaltyBalance, setLoyaltyBalance] = useState(0);
  const [useBonus, setUseBonus] = useState(initialBonuses > 0);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedDay, setSelectedDay] = useState<'today' | 'tomorrow'>('today');
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [timeError, setTimeError] = useState('');
  const sheetAnim = useRef(new Animated.Value(0)).current;

  // Определяем операционный день: если сейчас раньше часа открытия —
  // мы ещё в ночной смене предыдущего дня (например 00:06 → "сегодня" = вчера)
  const getOperationalDate = (day: 'today' | 'tomorrow') => {
    const now  = new Date();
    const nowH = now.getHours();
    const todayWh = getHoursForDay(restaurantInfo?.workingHours, now);
    const openH   = todayWh ? Math.floor(todayWh.openMin / 60) : 9;
    const inNightShift = nowH < openH; // до открытия — ещё старый рабочий день
    const d = new Date();
    if (inNightShift) {
      if (day === 'today') d.setDate(d.getDate() - 1); // "сегодня" = вчерашний рабочий день
      // "завтра" = текущий календарный день (d без изменений)
    } else {
      if (day === 'tomorrow') d.setDate(d.getDate() + 1);
    }
    return d;
  };

  const getDayDate = getOperationalDate;

  const openTimePicker = () => {
    setShowTimePicker(true);
    Animated.spring(sheetAnim, { toValue: 1, useNativeDriver: true, bounciness: 4 }).start();
  };

  const closeTimePicker = () => {
    Animated.timing(sheetAnim, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => setShowTimePicker(false));
  };

  const confirmTime = (slot: string) => {
    setSelectedTime(slot);
    closeTimePicker();
  };

  const SHEET_BG = '#161a13';

  const generateSlots = (day: 'today' | 'tomorrow'): string[] => {
    const operDate = getOperationalDate(day);
    const hours    = getHoursForDay(restaurantInfo?.workingHours, operDate);
    if (restaurantInfo?.workingHours && !hours) return [];
    const openMin  = hours?.openMin  ?? 10 * 60;
    const closeMin = hours?.closeMin ?? 22 * 60;
    const slots: string[] = [];
    const now = new Date();
    for (let min = openMin; min < closeMin; min += 30) {
      const realMin = min % (24 * 60);
      const h = Math.floor(realMin / 60);
      const m = realMin % 60;
      if (day === 'today') {
        // строим дату слота от операционного дня (не от текущего календарного)
        const slotDate = new Date(operDate);
        slotDate.setHours(h, m, 0, 0);
        if (min >= 24 * 60) slotDate.setDate(slotDate.getDate() + 1);
        if (slotDate.getTime() < now.getTime() + 30 * 60 * 1000) continue;
      }
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
    return slots;
  };

  const buildCompleteBefore = (): string | undefined => {
    if (timeType !== 'scheduled' || !selectedTime) return undefined;
    const [h, m] = selectedTime.split(':').map(Number);
    const wh     = getHoursForDay(restaurantInfo?.workingHours, getDayDate(selectedDay));
    const openH  = wh ? Math.floor(wh.openMin / 60) : 0;
    const date   = getDayDate(selectedDay);
    // послеполуночное время — следующие сутки относительно выбранного дня
    if (h < openH) date.setDate(date.getDate() + 1);
    date.setHours(h, m, 0, 0);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(h)}:${pad(m)}:00`;
  };

  useEffect(() => {
    if (!authToken) return;
    fetchLoyaltyBalance(authToken).then(b => setLoyaltyBalance(b.balance)).catch(() => {});
  }, [authToken]);

  const deliveryFee = deliveryType === 'delivery' && deliveryFeeAmount ? deliveryFeeAmount : 0;
  const total = subtotal + deliveryFee;
  const bonusesToSpend = useBonus ? loyaltyBalance : 0;
  const finalTotal = Math.max(0, total - bonusesToSpend - promoDiscount);
  const estimatedBonuses = cashbackPercent ? Math.floor(subtotal * cashbackPercent / 100) : null;

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
      const order = await createOrder(cartItems, deliveryType, payment, address ?? '', comment, authToken, phone, bonusesToSpend || undefined, promoCode, buildCompleteBefore());
      onSuccess(deliveryType, payment, order.orderId, bonusesToSpend, order.deliveryFee ?? deliveryFee, order.promoDiscount ?? promoDiscount);
    } catch (e: any) {
      if (e instanceof UnavailableItemsError) {
        const names = e.productIds.map(id => cartItems.find(i => i.dish.id === id)?.dish.name ?? id).join(', ');
        setSubmitError(`Недоступно: ${names}. Вернитесь в корзину и удалите эти позиции.`);
      } else {
        setSubmitError(e.message || 'Ошибка оформления заказа');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.8}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Оформление</Text>
        <View style={{ width: 42 }} />
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
            <Text style={styles.timeCardMain}>~60 мин</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.timeCard, timeType === 'scheduled' && styles.timeCardActive]}
            onPress={() => { setTimeType('scheduled'); openTimePicker(); }}
            activeOpacity={0.8}
          >
            <Text style={[styles.timeCardLabel, timeType === 'scheduled' && styles.timeCardLabelActive]}>
              НА ВРЕМЯ
            </Text>
            {selectedTime && timeType === 'scheduled' ? (
              <>
                <Text style={styles.timeCardMain}>{selectedTime}</Text>
                <Text style={styles.timeCardSub}>{selectedDay === 'today' ? 'Сегодня' : 'Завтра'}</Text>
              </>
            ) : (
              <>
                <Text style={styles.timeCardMain}>Выбрать</Text>
                <Text style={styles.timeCardSub}>Сегодня / завтра</Text>
              </>
            )}
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
          placeholder="Например, не звонить в дверь"
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
        {!!estimatedBonuses && estimatedBonuses > 0 && (
          <View style={styles.bonusAccrualRow}>
            <Ionicons name="star" size={13} color="#8DBB00" />
            <Text style={styles.bonusAccrualTxt}>
              Начислим {estimatedBonuses.toLocaleString('ru-RU')} бонусов после заказа
            </Text>
          </View>
        )}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Итого</Text>
          <Text style={styles.totalVal}>{finalTotal.toLocaleString('ru-RU')} ₸</Text>
        </View>
        <TouchableOpacity
          style={[styles.payBtn, submitting && { opacity: 0.6 }]}
          activeOpacity={0.85}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.payBtnTxt}>{'Оформить заказ'}</Text>
          }
        </TouchableOpacity>
      </View>
      {/* Time picker modal */}
      {showTimePicker && (
        <Modal transparent animationType="none" onRequestClose={closeTimePicker}>
          <TouchableWithoutFeedback onPress={closeTimePicker}>
            <View style={styles.modalOverlay} />
          </TouchableWithoutFeedback>
          <Animated.View style={[styles.timeSheet, {
            transform: [{ translateY: sheetAnim.interpolate({ inputRange: [0, 1], outputRange: [500, 0] }) }],
          }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Выберите время</Text>

            {/* Day tabs */}
            <View style={styles.dayTabs}>
              {(['today', 'tomorrow'] as const).map(day => (
                <TouchableOpacity
                  key={day}
                  style={[styles.dayTab, selectedDay === day && styles.dayTabActive]}
                  onPress={() => { setSelectedDay(day); setSelectedTime(null); setTimeError(''); }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.dayTabTxt, selectedDay === day && styles.dayTabTxtActive]}>
                    {day === 'today' ? 'Сегодня' : 'Завтра'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Time slots */}
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.slotsGrid}>
              {generateSlots(selectedDay).length === 0 ? (
                <Text style={styles.noSlotsTxt}>
                  {restaurantInfo?.workingHours && !getHoursForDay(restaurantInfo.workingHours, getDayDate(selectedDay))
                    ? 'В этот день ресторан не работает'
                    : 'Нет доступных слотов на это время'}
                </Text>
              ) : (
                <View style={styles.slotsWrap}>
                  {generateSlots(selectedDay).map(slot => (
                    <TouchableOpacity
                      key={slot}
                      style={[styles.slotChip, selectedTime === slot && styles.slotChipActive]}
                      onPress={() => confirmTime(slot)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.slotTxt, selectedTime === slot && styles.slotTxtActive]}>{slot}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </ScrollView>

            {!!timeError && <Text style={styles.timeErrorTxt}>{timeError}</Text>}
            {selectedTime && (
              <TouchableOpacity style={styles.confirmBtn} onPress={closeTimePicker} activeOpacity={0.85}>
                <Text style={styles.confirmBtnTxt}>
                  {`Подтвердить · ${selectedDay === 'today' ? 'Сегодня' : 'Завтра'} ${selectedTime}`}
                </Text>
              </TouchableOpacity>
            )}
          </Animated.View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
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

  bonusCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: CARD, borderRadius: 14,
    borderWidth: 1.5, borderColor: BORDER, padding: 14,
  },
  bonusCardActive: { borderColor: '#8DBB00', backgroundColor: 'rgba(141,187,0,0.08)' },
  bonusTitle:  { color: '#fff', fontSize: 15, fontWeight: '700', marginBottom: 3 },
  bonusSub:    { color: 'rgba(255,255,255,0.4)', fontSize: 12 },
  bonusDeduct: { color: '#8DBB00', fontSize: 12, marginTop: 4, fontWeight: '600' },
  bonusToggle: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center', marginLeft: 12,
  },
  bonusToggleActive: { backgroundColor: '#4a6600' },
  totalBonus: { color: '#8DBB00', fontSize: 12, fontWeight: '600', marginBottom: 2 },

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
  bonusAccrualRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bonusAccrualTxt: { color: '#8DBB00', fontSize: 12, fontWeight: '600', flex: 1 },
  totalLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 13 },
  totalVal: { color: '#fff', fontSize: 17, fontWeight: '800' },
  payBtn: {
    backgroundColor: GREEN,
    borderRadius: 30,
    paddingVertical: 18,
    alignItems: 'center',
  },
  payBtnTxt: { color: '#fff', fontSize: 17, fontWeight: '700' },

  modalOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  timeSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#161a13',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingBottom: 46,
    maxHeight: '75%',
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center', marginTop: 12, marginBottom: 16,
  },
  sheetTitle: { color: '#fff', fontSize: 17, fontWeight: '700', textAlign: 'center', marginBottom: 16 },

  dayTabs: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 12, padding: 4, marginBottom: 16 },
  dayTab: { flex: 1, paddingVertical: 10, borderRadius: 9, alignItems: 'center' },
  dayTabActive: { backgroundColor: GREEN_DARK },
  dayTabTxt: { color: 'rgba(255,255,255,0.45)', fontWeight: '600', fontSize: 15 },
  dayTabTxtActive: { color: '#fff' },

  slotsGrid: { paddingBottom: 16 },
  slotsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  slotChip: {
    paddingHorizontal: 18, paddingVertical: 12,
    borderRadius: 12, borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  slotChipActive: { borderColor: GREEN, backgroundColor: 'rgba(141,187,0,0.12)' },
  slotTxt: { color: 'rgba(255,255,255,0.6)', fontSize: 15, fontWeight: '600' },
  slotTxtActive: { color: GREEN },
  noSlotsTxt: { color: 'rgba(255,255,255,0.35)', fontSize: 14, textAlign: 'center', marginTop: 20 },
  timeErrorTxt: {
    color: '#e05252', fontSize: 12, fontWeight: '600',
    textAlign: 'center', marginBottom: 8,
  },
  confirmBtn: {
    backgroundColor: GREEN, borderRadius: 30,
    paddingVertical: 16, alignItems: 'center', marginTop: 4,
  },
  confirmBtnTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
