import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
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
import { CartItem, DishData } from '../App';
import { validatePromo, calcDiscount, promoLabel, PromoResult } from '../api/promos';
import { RestaurantInfo } from '../api/restaurant';

const GREEN = '#E8242E';
const BG = '#0a0a0a';
const CARD = 'rgba(255,255,255,0.06)';

interface Props {
  items: CartItem[];
  dishes?: DishData[];
  onUpdateQty: (dishId: string, size: string, qty: number) => void;
  onBack: () => void;
  onCheckout: (bonusesToSpend: number, promoCode?: string, promoDiscount?: number) => void;
  loyaltyBalance?: number | null;
  deliveryFeeAmount?: number | null;
  authToken?: string | null;
  restaurantInfo?: RestaurantInfo | null;
}

export default function CartScreen({ items, dishes, onUpdateQty, onBack, onCheckout, loyaltyBalance, deliveryFeeAmount, authToken, restaurantInfo }: Props) {
  const [promo, setPromo] = useState('');
  const [promoResult, setPromoResult] = useState<PromoResult | null>(null);
  const [promoError, setPromoError] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [useBonus, setUseBonus] = useState(false);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onBack();
      return true;
    });
    return () => sub.remove();
  }, [onBack]);

  const dishAvailabilityMap = new Map((dishes ?? []).map(d => [d.id, d.isAvailable]));
  const hasUnavailable = items.some(item => dishAvailabilityMap.get(item.dish.id) === false);

  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.qty, 0);
  const delivery = items.length > 0 && deliveryFeeAmount ? deliveryFeeAmount : 0;

  // minOrderAmount проверяется от суммы еды без доставки
  const isPromoReady = !promoResult?.minOrderAmount || subtotal >= promoResult.minOrderAmount;

  const promoPct = promoResult?.minOrderAmount
    ? Math.min(100, (subtotal / promoResult.minOrderAmount) * 100)
    : 0;
  const progressAnim = useRef(new Animated.Value(promoPct)).current;
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: promoPct,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [promoPct]);

  const giftDish = promoResult?.discountType === 'GIFT_ITEM' && promoResult.giftProductId && isPromoReady
    ? (dishes ?? []).find(d => d.id === promoResult.giftProductId) ?? null
    : null;
  const total = subtotal + delivery;
  const bonusesToSpend = useBonus && loyaltyBalance ? loyaltyBalance : 0;
  const promoDiscount = promoResult && isPromoReady ? calcDiscount(promoResult, total) : 0;
  const finalTotal = Math.max(0, total - bonusesToSpend - promoDiscount);

  const applyPromo = async () => {
    if (!promo.trim() || !authToken) return;
    setPromoLoading(true);
    setPromoError('');
    setPromoResult(null);
    try {
      const result = await validatePromo(promo.trim(), authToken);
      setPromoResult(result);
      setUseBonus(false);
    } catch (e: any) {
      setPromoError(e.message);
    } finally {
      setPromoLoading(false);
    }
  };

  const clearPromo = () => {
    setPromo('');
    setPromoResult(null);
    setPromoError('');
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.8}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Корзина</Text>
        <View style={{ width: 42 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {items.length === 0 ? (
          <View style={styles.emptyBox}>
            <LottieView
              source={require('../assets/animation/ccf9120e-a0dc-11ef-a2cf-cfff2d40f7be.json')}
              autoPlay
              loop
              style={{ width: 180, height: 180, marginBottom: -40, marginRight: 8 }}
            />
            <Text style={styles.emptyText}>Корзина пуста</Text>
          </View>
        ) : (
          <>
            {/* Items */}
            {items.map(item => {
              const itemUnavailable = dishAvailabilityMap.get(item.dish.id) === false;
              return (
                <View key={`${item.dish.id}-${item.size}`} style={[styles.itemCard, itemUnavailable && styles.itemCardUnavailable]}>
                  {item.dish.img
                    ? <Image source={typeof item.dish.img === 'string' ? { uri: item.dish.img } : item.dish.img} style={[styles.itemImg, itemUnavailable && { opacity: 0.4 }]} resizeMode="cover" />
                    : <View style={[styles.itemImg, { backgroundColor: '#1a2010' }, itemUnavailable && { opacity: 0.4 }]} />
                  }
                  <View style={styles.itemInfo}>
                    <Text style={[styles.itemName, itemUnavailable && { opacity: 0.5 }]}>{item.dish.name}</Text>
                    {itemUnavailable
                      ? <Text style={styles.itemUnavailableTxt}>Уже готовим</Text>
                      : <Text style={styles.itemMeta}>{item.dish.category}{item.sizeName ? ` · ${item.sizeName}` : ''}</Text>
                    }
                    {!itemUnavailable && <Text style={styles.itemPrice}>{(item.unitPrice * item.qty).toLocaleString('ru-RU')} ₸</Text>}
                  </View>
                  <View style={[styles.qtyRow, itemUnavailable && { opacity: 0.3 }]}>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => onUpdateQty(item.dish.id, item.size, item.qty - 1)}
                      disabled={itemUnavailable}
                    >
                      <Text style={styles.qtyBtnTxt}>−</Text>
                    </TouchableOpacity>
                    <Text style={styles.qtyNum}>{item.qty}</Text>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => onUpdateQty(item.dish.id, item.size, item.qty + 1)}
                      disabled={itemUnavailable}
                    >
                      <Text style={styles.qtyBtnTxt}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}

            {giftDish && (
              <View style={[styles.itemCard, styles.giftCard]}>
                {giftDish.img
                  ? <Image source={giftDish.img} style={styles.itemImg} resizeMode="cover" />
                  : <View style={[styles.itemImg, { backgroundColor: '#1a2010' }]} />
                }
                <View style={styles.itemInfo}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    <Text style={styles.itemName}>{giftDish.name}</Text>
                    <View style={styles.giftBadge}>
                      <Text style={styles.giftBadgeTxt}>🎁 Подарок</Text>
                    </View>
                  </View>
                  <Text style={[styles.itemPrice, { color: GREEN }]}>Бесплатно</Text>
                </View>
              </View>
            )}

          </>
        )}

        <View style={{ height: 16 }} />
      </ScrollView>

      {/* Bottom: promo + summary + button */}
      {items.length > 0 && (
        <View style={styles.bottomBar}>

          {/* Прогресс промокода */}
          {!!promoResult && !!promoResult.minOrderAmount && !isPromoReady && (
            <View style={styles.promoProgressWrap}>
              <View style={styles.promoProgressRow}>
                <Text style={styles.promoProgressLabel}>
                  {subtotal.toLocaleString('ru-RU')} / {promoResult.minOrderAmount.toLocaleString('ru-RU')} ₸
                </Text>
                <Text style={styles.promoProgressPct}>{Math.round(promoPct)}%</Text>
              </View>
              <View style={styles.promoProgressBar}>
                <Animated.View
                  style={[
                    styles.promoProgressFill,
                    { width: progressAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) },
                  ]}
                />
              </View>
              <Text style={styles.promoProgressHint}>
                Добавьте ещё на{' '}
                <Text style={{ color: GREEN, fontWeight: '700' }}>
                  {(promoResult.minOrderAmount - subtotal).toLocaleString('ru-RU')} ₸
                </Text>
                {' '}чтобы получить скидку
              </Text>
            </View>
          )}

          {/* Promo + Summary block */}
          <View style={styles.summaryCard}>
            <View style={[styles.promoRow, useBonus && { opacity: 0.4 }]}>
              <Ionicons name="gift-outline" size={18} color={promoResult ? GREEN : 'rgba(255,255,255,0.4)'} style={{ marginRight: 10 }} />
              <TextInput
                style={styles.promoInput}
                placeholder="Введите промокод"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={promo}
                onChangeText={t => { setPromo(t); if (promoResult) clearPromo(); setPromoError(''); }}
                underlineColorAndroid="transparent"
                editable={!useBonus && !promoResult}
                autoCapitalize="characters"
              />
              {promoResult ? (
                <TouchableOpacity style={[styles.bonusToggle, { borderColor: 'rgba(255,255,255,0.15)' }]} onPress={clearPromo} activeOpacity={0.85}>
                  <Ionicons name="close" size={16} color="#fff" />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={[styles.bonusToggle, promo.trim().length > 0 && { backgroundColor: GREEN, borderColor: GREEN }, (useBonus || promoLoading) && { opacity: 0.4 }]} onPress={applyPromo} activeOpacity={0.85} disabled={useBonus || promoLoading || !promo.trim()}>
                  <Text style={[styles.bonusToggleTxt, promo.trim().length > 0 && styles.promoBtnTxt]}>{promoLoading ? '...' : 'Применить'}</Text>
                </TouchableOpacity>
              )}
            </View>
            {!!promoError && <Text style={styles.promoErrorTxt}>{promoError}</Text>}
            {!!promoResult && (
              <Text style={styles.promoSuccessTxt}>
                {isPromoReady ? `✓ ${promoLabel(promoResult)}` : `✓ ${promoResult.description || promoResult.code}`}
              </Text>
            )}
            {promoResult?.discountType === 'FIXED_DISCOUNT' && isPromoReady && !!promoResult.description && (
              <Text style={styles.promoDescTxt}>{promoResult.description}</Text>
            )}

            {/* Bonus row */}
            {!!loyaltyBalance && loyaltyBalance > 0 && (
              <>
                <View style={styles.divider} />
                <TouchableOpacity style={[styles.bonusRow, (promo.length > 0 || !!promoResult) && { opacity: 0.4 }]} onPress={() => { if (!promo.length && !promoResult) setUseBonus(v => !v); }} activeOpacity={0.8}>
                  <View style={styles.bonusLeft}>
                    <Ionicons name="star" size={16} color={GREEN} style={{ marginRight: 8 }} />
                    <View>
                      <Text style={styles.bonusTitle}>Бонусы</Text>
                      <Text style={styles.bonusSub}>{loyaltyBalance.toLocaleString('ru-RU')} доступно</Text>
                    </View>
                  </View>
                  <View style={[styles.promoBtn, useBonus && { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
                    <Text style={styles.promoBtnTxt}>
                      {useBonus ? `−${bonusesToSpend.toLocaleString('ru-RU')}` : 'Применить'}
                    </Text>
                  </View>
                </TouchableOpacity>
              </>
            )}

            <View style={styles.divider} />

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Сумма</Text>
              <Text style={styles.summaryVal}>{subtotal.toLocaleString('ru-RU')} ₸</Text>
            </View>
            {deliveryFeeAmount != null && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Доставка</Text>
                <Text style={styles.summaryVal}>
                  {delivery > 0 ? `${delivery.toLocaleString('ru-RU')} ₸` : 'Бесплатно'}
                </Text>
              </View>
            )}
            {promoDiscount > 0 && (
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: GREEN }]}>Скидка ({promoResult!.code})</Text>
                <Text style={[styles.summaryVal, { color: GREEN }]}>−{promoDiscount.toLocaleString('ru-RU')} ₸</Text>
              </View>
            )}

            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={styles.totalLabel}>Итого</Text>
              <Text style={styles.totalVal}>{finalTotal.toLocaleString('ru-RU')} ₸</Text>
            </View>

            {hasUnavailable && (
              <Text style={styles.unavailableWarning}>Уберите недоступные позиции перед оформлением</Text>
            )}
            {restaurantInfo?.isTemporarilyClosed && (
              <View style={styles.closedWarning}>
                <Ionicons name="time-outline" size={15} color="#e05252" style={{ marginRight: 6, flexShrink: 0 }} />
                <Text style={styles.closedWarningTxt}>
                  Ресторан временно не принимает заказы. Бронирование столиков доступно.
                </Text>
              </View>
            )}
            {(() => {
              const blocked = hasUnavailable || !!restaurantInfo?.isTemporarilyClosed;
              return (
                <TouchableOpacity
                  style={[styles.checkoutBtn, blocked && { opacity: 0.4 }]}
                  activeOpacity={0.85}
                  onPress={() => { if (!blocked) onCheckout(bonusesToSpend, promoResult?.code, promoDiscount || undefined); }}
                  disabled={blocked}
                >
                  <Text style={styles.checkoutTxt}>Оформить заказ</Text>
                </TouchableOpacity>
              );
            })()}
          </View>
        </View>
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
  scrollContent: { paddingHorizontal: 20, paddingTop: 8, flexGrow: 1 },

  emptyBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 0, paddingBottom: 120 },
  emptyText: { color: 'rgba(255,255,255,0.4)', fontSize: 16, textAlign: 'center' },
  emptyBtn: {
    backgroundColor: GREEN,
    borderRadius: 30,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginTop: 8,
  },
  emptyBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },

  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 16,
    marginBottom: 12,
    padding: 12,
    gap: 12,
  },
  itemImg: { width: 64, height: 64, borderRadius: 12 },
  itemInfo: { flex: 1 },
  itemName: { color: '#fff', fontWeight: '700', fontSize: 15, marginBottom: 3 },
  itemMeta: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginBottom: 5 },
  itemPrice: { color: '#fff', fontWeight: '700', fontSize: 15 },
  itemCardUnavailable: { borderWidth: 1, borderColor: 'rgba(224,82,82,0.3)', backgroundColor: 'rgba(224,82,82,0.04)' },
  itemUnavailableTxt: { color: '#e05252', fontSize: 12, fontWeight: '600', marginBottom: 4 },
  unavailableWarning: { color: '#e05252', fontSize: 12, fontWeight: '600', textAlign: 'center', marginBottom: 4 },
  closedWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(224,82,82,0.1)',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  closedWarningTxt: { color: '#e05252', fontSize: 12, fontWeight: '500', flex: 1, lineHeight: 17 },

  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  qtyBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnTxt: { color: '#fff', fontSize: 18, lineHeight: 22 },
  qtyNum: { color: '#fff', fontSize: 15, fontWeight: '700', minWidth: 16, textAlign: 'center' },

  summaryCard: {
    backgroundColor: CARD,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 46,
    gap: 12,
  },

  promoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
  },
  promoInput: { flex: 1, color: '#fff', fontSize: 14, paddingVertical: 12 },
  promoBtn: {
    backgroundColor: GREEN,
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 14,
  },
  promoBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 13 },
  promoErrorTxt:   { color: '#e05252', fontSize: 12, marginTop: -6 },
  promoSuccessTxt: { color: GREEN, fontSize: 12, fontWeight: '600', marginTop: -6 },
  promoDescTxt:    { color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: -8 },
  promoProgressWrap: {
    backgroundColor: 'rgba(232,36,46,0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(232,36,46,0.25)',
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  promoProgressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  promoProgressLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },
  promoProgressAmount: { color: GREEN, fontWeight: '700' },
  promoProgressPct: { color: GREEN, fontSize: 12, fontWeight: '600' },
  promoProgressHint: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 6 },
  promoProgressBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  promoProgressFill: {
    height: 8,
    borderRadius: 4,
    backgroundColor: GREEN,
  },

  giftCard: { borderWidth: 1, borderColor: 'rgba(232,36,46,0.3)', backgroundColor: 'rgba(232,36,46,0.05)' },
  giftBadge: { backgroundColor: 'rgba(232,36,46,0.15)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  giftBadgeTxt: { color: GREEN, fontSize: 11, fontWeight: '700' },

  summary: {
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { color: 'rgba(255,255,255,0.45)', fontSize: 14 },
  summaryVal: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: 4 },
  totalLabel: { color: '#fff', fontSize: 16, fontWeight: '700' },
  totalVal: { color: '#fff', fontSize: 18, fontWeight: '800' },

  bonusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bonusLeft: { flexDirection: 'row', alignItems: 'center' },
  bonusTitle: { color: '#fff', fontSize: 14, fontWeight: '600' },
  bonusSub:   { color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 1 },
  bonusToggle: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 10, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  bonusToggleActive:   { borderColor: GREEN, backgroundColor: 'rgba(232,36,46,0.12)' },
  bonusToggleTxt:      { color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '600' },
  bonusToggleTxtActive:{ color: GREEN },
  bonusDeduct: { color: GREEN, fontSize: 11, fontWeight: '600', marginBottom: 2 },

  bottomBar: {
    backgroundColor: BG,
  },
  checkoutBtn: {
    backgroundColor: GREEN,
    borderRadius: 30,
    paddingVertical: 18,
    alignItems: 'center',
  },
  checkoutTxt: { color: '#fff', fontSize: 17, fontWeight: '700' },
});

