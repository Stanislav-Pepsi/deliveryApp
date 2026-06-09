import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import { io } from 'socket.io-client';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  BackHandler,
  Linking,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import Text from '../components/Text';
import { OrderDisplayItem } from '../App';
import { cancelOrder, fetchOrderById } from '../api/orders';
import { RestaurantInfo } from '../api/restaurant';

const GREEN = '#8DBB00';
const GREEN_DARK = '#4a6600';
const BG = '#0c0f0a';
const CARD = 'rgba(255,255,255,0.06)';
const BORDER = 'rgba(255,255,255,0.1)';

const WS_URL = 'https://api.starten.kz';

interface Props {
  total: number;
  bonusesSpent?: number | null;
  promoDiscount?: number | null;
  deliveryFee?: number | null;
  deliveryType: 'delivery' | 'pickup';
  payment: 'kaspi' | 'cash';
  address?: string;
  orderId?: string;
  initialStatus?: string;
  iikoNumber?: number | null;
  orderItems?: OrderDisplayItem[];
  authToken?: string | null;
  mode?: 'success' | 'view';
  createdAt?: string;
  restaurantInfo?: RestaurantInfo | null;
  onGoHome: () => void;
}

const STATUS_TITLE: Record<string, string> = {
  CREATED:     'Заказ принят',
  IN_PROGRESS: 'Заказ готовится',
  READY:       'Заказ готовится',
  ON_WAY:      'Заказ в пути',
  DELIVERED:   'Заказ доставлен',
  CANCELLED:   'Заказ отменён',
};

const STATUS_DESC: Record<string, string> = {
  CREATED:     'Мы скоро перезвоним вам, чтобы уточнить детали заказа',
  IN_PROGRESS: 'Ваш заказ уже готовится на кухне — совсем скоро будет готов',
  READY:       'Последние штрихи — ваш заказ почти готов..',
  ON_WAY:      'Курьер уже мчится к вам, осталось совсем немного',
  DELIVERED:   'Ваш заказ доставлен — приятного аппетита!',
  CANCELLED:   'Этот заказ отменён. Если у вас остались вопросы — свяжитесь с рестораном.',
};



const STEPS_DELIVERY = ['Принят', 'Готовится', 'Передан', 'Доставлен'];
const STEPS_PICKUP   = ['Принят', 'Готовится', 'Готов', 'Выдан'];

type StepIcon = { lib: 'ion'; name: string } | { lib: 'mci'; name: string };
const ICONS_DELIVERY: StepIcon[] = [
  { lib: 'ion', name: 'receipt-outline' },
  { lib: 'mci', name: 'pot-steam-outline' },
  { lib: 'ion', name: 'bicycle-outline' },
  { lib: 'ion', name: 'home-outline' },
];
const ICONS_PICKUP: StepIcon[] = [
  { lib: 'ion', name: 'receipt-outline' },
  { lib: 'mci', name: 'pot-steam-outline' },
  { lib: 'ion', name: 'bag-outline' },
  { lib: 'mci', name: 'food-outline' },
];


const STATUS_STEP: Record<string, number> = {
  CREATED:     0,
  IN_PROGRESS: 1,
  READY:       1,
  ON_WAY:      2,
  DELIVERED:   3,
};

const STATUS_LOTTIE: Record<string, any> = {
  CREATED:      require('../assets/animation/31f7cbc4-1186-11ee-b48c-d3fac7979677.json'),
  IN_PROGRESS:  require('../assets/animation/dc289eba-1182-11ee-9b7b-df09ac721e7d.json'),
  READY:        require('../assets/animation/dc289eba-1182-11ee-9b7b-df09ac721e7d.json'),
  READY_PICKUP: require('../assets/animation/d31e2f7c-1a36-4a83-be1c-92ecba29b525.json'),
  ON_WAY:       require('../assets/animation/e1f7c594-116b-11ee-8ced-5714a508688b.json'),
  DELIVERED:    require('../assets/animation/19afdf2c-1166-11ee-9575-8b5eb4d1d40b.json'),
};


const STATUS_ANIM_SIZE: Record<string, any> = {
  CREATED:      { width: 180, height: 180, marginTop: 0,   marginBottom: -20, alignSelf: 'center' },
  IN_PROGRESS:  { width: 300, height: 300, marginTop: -10, marginBottom: -90 },
  READY:        { width: 300, height: 300, marginTop: -10, marginBottom: -90 },
  READY_PICKUP: { width: 300, height: 300, marginTop: -10, marginBottom: -90, alignSelf: 'center', marginLeft: 10 },
  ON_WAY:       { width: 300, height: 300, marginTop: -10, marginBottom: -90, alignSelf: 'center', marginLeft: -20 },
  DELIVERED:    { width: 180, height: 180, marginTop: 0,   marginBottom: -20, alignSelf: 'center', marginLeft: 40 },
};

const STATUS_ANIM_SPEED: Record<string, number> = {
  DELIVERED: 1.5,
};

function AnimatedStatusIcon({ status }: { status: string }) {
  const source = STATUS_LOTTIE[status];
  if (!source) return null;
  const size = STATUS_ANIM_SIZE[status] ?? { width: 300, height: 300, marginTop: -10, marginBottom: -90 };
  const speed = STATUS_ANIM_SPEED[status] ?? 0.5;
  const isSmall = size.width < 300;
  if (isSmall) {
    return (
      <View style={{ marginTop: size.marginTop, marginBottom: size.marginBottom, alignSelf: 'center', marginLeft: size.marginLeft ?? 0 }}>
        <LottieView source={source} autoPlay loop speed={speed} style={{ width: size.width, height: size.height }} />
      </View>
    );
  }
  return (
    <LottieView source={source} autoPlay loop speed={speed} style={size} />
  );
}


export default function OrderSuccessScreen({ total, bonusesSpent, promoDiscount, deliveryFee, deliveryType, payment, address, orderId, initialStatus, iikoNumber, orderItems, authToken, mode = 'success', createdAt, restaurantInfo, onGoHome }: Props) {
  const isViewMode = mode === 'view';
  const scaleAnim = useRef(new Animated.Value(isViewMode ? 1 : 0)).current;
  const fadeAnim  = useRef(new Animated.Value(isViewMode ? 1 : 0)).current;
  const timeBlinkAnim = useRef(new Animated.Value(1)).current;
  const [currentStatus, setCurrentStatus] = useState(initialStatus || 'CREATED');
  console.log('[OrderSuccess] mode:', mode, '| payment:', payment, '| initialStatus:', initialStatus, '| currentStatus(init):', initialStatus || 'CREATED');
  const [currentIikoNumber, setCurrentIikoNumber] = useState<number | null>(iikoNumber ?? null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const confirmCancelOrder = async () => {
    if (!orderId || !authToken) return;
    setCancelling(true);
    try {
      const res = await cancelOrder(orderId, authToken);
      setCurrentStatus(res.status || 'CANCELLED');
      setShowCancelConfirm(false);
    } catch (e: any) {
      setShowCancelConfirm(false);
      Alert.alert('Ошибка', e.message || 'Не удалось отменить заказ');
    } finally {
      setCancelling(false);
    }
  };

  useEffect(() => {
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, bounciness: 12, speed: 8 }),
      Animated.timing(fadeAnim,  { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  const ACTIVE_STATUSES = new Set(['CREATED', 'IN_PROGRESS', 'READY', 'ON_WAY']);
  useEffect(() => {
    if (!ACTIVE_STATUSES.has(currentStatus)) {
      timeBlinkAnim.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(timeBlinkAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
        Animated.timing(timeBlinkAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [currentStatus]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { onGoHome(); return true; });
    return () => sub.remove();
  }, [onGoHome]);

  // REST: начальная загрузка актуального статуса и iikoNumber
  useEffect(() => {
    if (!orderId || !authToken) return;
    fetchOrderById(orderId, authToken)
      .then(o => {
        console.log('[fetchOrder] raw status:', o.status, '| paymentType:', o.paymentType);
        if (o.status) setCurrentStatus(o.status);
        if (o.iikoNumber != null) setCurrentIikoNumber(o.iikoNumber);
      })
      .catch((e) => { console.log('[fetchOrder] error:', e.message); });
  }, [orderId, authToken]);

  // WebSocket: реалтайм обновления статуса + получение iikoNumber
  useEffect(() => {
    if (!orderId || !authToken) return;
    const socket = io(`${WS_URL}/client`, {
      auth: { token: `Bearer ${authToken}` },
      transports: ['websocket'],
    });
    socket.on('order:status_changed', (payload: { orderId: string; status: string }) => {
      if (payload.orderId === orderId) {
        fetchOrderById(orderId, authToken)
          .then(o => {
            if (o.status) setCurrentStatus(o.status);
            if (o.iikoNumber != null) setCurrentIikoNumber(o.iikoNumber);
          })
          .catch(() => { setCurrentStatus(payload.status); });
      }
    });
    return () => { socket.disconnect(); };
  }, [orderId, authToken]);

  // Polling: постоянное обновление статуса пока заказ активный
  useEffect(() => {
    if (!orderId || !authToken) return;
    const ACTIVE = new Set(['CREATED', 'IN_PROGRESS', 'READY', 'ON_WAY']);
    if (!ACTIVE.has(currentStatus)) return;
    const interval = setInterval(() => {
      fetchOrderById(orderId, authToken)
        .then(o => {
          if (o.status) setCurrentStatus(o.status);
          if (o.iikoNumber != null) setCurrentIikoNumber(o.iikoNumber);
        })
        .catch(() => {});
    }, 10000);
    return () => clearInterval(interval);
  }, [orderId, authToken, currentStatus]);

  // Polling: ищем iikoNumber пока не найдём — без лимита попыток
  useEffect(() => {
    const ACTIVE = new Set(['CREATED', 'IN_PROGRESS', 'READY', 'ON_WAY']);
    if (!orderId || !authToken || currentIikoNumber != null || !ACTIVE.has(currentStatus)) return;
    const timer = setTimeout(() => {
      fetchOrderById(orderId, authToken)
        .then(o => {
          if (o.status) setCurrentStatus(o.status);
          if (o.iikoNumber != null) setCurrentIikoNumber(o.iikoNumber);
        })
        .catch(() => {});
    }, 3000);
    return () => clearTimeout(timer);
  }, [orderId, authToken, currentIikoNumber, currentStatus]);

  const deductions = (bonusesSpent ?? 0) + (promoDiscount ?? 0);
  const isDelivery = deliveryType === 'delivery';
  const itemsSum = (orderItems ?? []).reduce((s, i) => s + i.total, 0);
  const grandTotal = (orderItems && orderItems.length > 0)
    ? itemsSum + (isDelivery && deliveryFee ? deliveryFee : 0)
    : total;
  const netTotal = Math.max(0, grandTotal - deductions);
  const bonusBase = itemsSum > 0 ? itemsSum : total;
  const estimatedBonuses = restaurantInfo?.cashbackPercent
    ? Math.floor(bonusBase * restaurantInfo.cashbackPercent / 100)
    : null;
  const steps = isDelivery ? STEPS_DELIVERY : STEPS_PICKUP;
  const icons = isDelivery ? ICONS_DELIVERY : ICONS_PICKUP;
  const effectiveAnimStatus = (!isDelivery && currentStatus === 'READY') ? 'READY_PICKUP' : currentStatus;

  const currentStep = (!isDelivery && currentStatus === 'READY')
    ? 2
    : (STATUS_STEP[currentStatus] ?? 0);

  const currentTitle =
    (!isDelivery && currentStatus === 'READY')      ? 'Заказ готов' :
    (!isDelivery && currentStatus === 'DELIVERED')  ? 'Заказ выдан' :
    (STATUS_TITLE[currentStatus] ?? 'Ваш заказ');

  const currentDesc =
    (!isDelivery && currentStatus === 'READY')      ? 'Ваш заказ готов — приходите забирать!' :
    (!isDelivery && currentStatus === 'DELIVERED')  ? 'Спасибо за визит — приятного аппетита!' :
    (STATUS_DESC[currentStatus] ?? '');

  const isCancelled = currentStatus === 'CANCELLED';
  const canCancel = currentStatus === 'CREATED' && !!orderId && !!authToken;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Checkmark / View header */}
        {isViewMode ? (
          <View style={{ alignItems: 'center' }}>
            {isCancelled ? (
              <View style={[styles.checkCircle, styles.checkCircleCancelled, { marginTop: 52 }]}>
                <Ionicons name="close" size={40} color="#fff" />
              </View>
            ) : (
              <AnimatedStatusIcon status={effectiveAnimStatus} />
            )}
            <Text style={styles.viewTitle}>{currentTitle}</Text>
            <Text style={styles.viewDesc}>{currentDesc}</Text>
          </View>
        ) : (
          <>
            <Animated.View style={[
              styles.checkCircle,
              isCancelled && styles.checkCircleCancelled,
              { transform: [{ scale: scaleAnim }], marginTop: 52 },
            ]}>
              <Ionicons name={isCancelled ? 'close' : 'checkmark'} size={40} color="#fff" />
            </Animated.View>
            <Animated.View style={{ opacity: fadeAnim, alignItems: 'center' }}>
              <Text style={styles.title}>
                {isCancelled ? 'Заказ отменён' : 'Заказ принят!'}
              </Text>
              <Text style={styles.subtitle}>
                {isCancelled
                  ? 'Если у вас остались вопросы —\nсвяжитесь с рестораном.'
                  : isDelivery
                    ? 'Скоро курьер заберёт ваш\nзаказ из кафе.'
                    : 'Приходите забрать заказ\nкогда он будет готов.'}
              </Text>
            </Animated.View>
          </>
        )}

        <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
          {/* Order number + time */}
          <View style={styles.orderRow}>
            <View>
              <Text style={styles.cardLabel}>ЗАКАЗ</Text>
              <Text style={styles.orderNum}>
                {currentIikoNumber != null ? `#${currentIikoNumber}` : '#...'}
              </Text>
            </View>
            {!!createdAt && (
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.cardLabel}>ВРЕМЯ ЗАКАЗА</Text>
                {(() => {
                  const d = new Date(createdAt);
                  const date = `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}`;
                  const time = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
                  return (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={styles.timeVal}>{date} · </Text>
                      <Animated.View style={{ opacity: timeBlinkAnim }}>
                        <Text style={styles.timeVal}>{time}</Text>
                      </Animated.View>
                    </View>
                  );
                })()}
              </View>
            )}
          </View>

          <View style={styles.divider} />

          {/* Address or pickup */}
          <View style={styles.infoRow}>
            <Ionicons
              name={isDelivery ? 'location-outline' : 'storefront-outline'}
              size={16}
              color="rgba(255,255,255,0.4)"
              style={{ marginTop: 1 }}
            />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.cardLabel}>{isDelivery ? 'АДРЕС' : 'РЕСТОРАН'}</Text>
              <Text style={styles.infoVal}>
                {isDelivery
                  ? (address || 'Адрес не указан')
                  : [restaurantInfo?.name, restaurantInfo?.address].filter(Boolean).join(' · ') || 'Ресторан'}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Payment */}
          <View style={styles.infoRow}>
            <Ionicons
              name={payment === 'kaspi' ? 'card-outline' : 'cash-outline'}
              size={20}
              color="rgba(255,255,255,0.4)"
            />
            <View style={{ flex: 1, marginLeft: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <View>
                <Text style={styles.cardLabel}>К ОПЛАТЕ</Text>
                <Text style={styles.infoVal}>
                  {netTotal.toLocaleString('ru-RU')} ₸ · {payment === 'kaspi' ? 'Картой' : 'Наличными'}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                {!!promoDiscount && promoDiscount > 0 && (
                  <Text style={styles.bonusLine}>Скидка · {promoDiscount.toLocaleString('ru-RU')} ₸</Text>
                )}
                {!!bonusesSpent && bonusesSpent > 0 && (
                  <Text style={styles.bonusLine}>Бонусы · {bonusesSpent.toLocaleString('ru-RU')} ₸</Text>
                )}
              </View>
            </View>
          </View>

        </Animated.View>

        {/* Items */}
        {orderItems && orderItems.length > 0 && (
          <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
            <Text style={[styles.cardLabel, { marginBottom: 8, textAlign: 'center' }]}>СОСТАВ ЗАКАЗА</Text>
            {orderItems.map((item, i) => (
              <View key={i} style={styles.itemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  {!!item.meta && <Text style={styles.itemMeta}>{item.meta}</Text>}
                </View>
                <Text style={styles.itemQty}>×{item.qty}</Text>
                <Text style={styles.itemPrice}>{item.total.toLocaleString('ru-RU')} ₸</Text>
              </View>
            ))}
            {isDelivery && !!deliveryFee && deliveryFee > 0 && (
              <View style={styles.itemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>Доставка</Text>
                </View>
                <Text style={styles.itemPrice}>{deliveryFee.toLocaleString('ru-RU')} ₸</Text>
              </View>
            )}
            {(() => {
              const hasDeductions = deductions > 0;
              return (
                <>
                  <View style={{ position: 'relative', overflow: 'hidden' }}>
                    <View style={[styles.itemRow, { borderBottomWidth: hasDeductions ? 1 : 0, marginTop: 4, opacity: hasDeductions ? 0.4 : 1 }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.itemName, { fontWeight: '800' }]}>Итого:</Text>
                      </View>
                      <Text style={[styles.itemPrice, { fontWeight: '800', fontSize: 15 }]}>
                        {grandTotal.toLocaleString('ru-RU')} ₸
                      </Text>
                    </View>
                    {hasDeductions && (
                      <View style={{ position: 'absolute', left: 0, right: 0, top: '50%', flexDirection: 'row', overflow: 'hidden', height: 1.5 }}>
                        {Array.from({ length: 80 }).map((_, i) => (
                          <View key={i} style={{ width: 10, height: 1.5, backgroundColor: 'rgba(255,255,255,0.3)', marginRight: 5 }} />
                        ))}
                      </View>
                    )}
                  </View>
                  {hasDeductions && (
                    <View style={[styles.itemRow, { borderBottomWidth: 0, marginTop: 4 }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.itemName, { fontWeight: '800' }]}>Итого с бонусами:</Text>
                      </View>
                      <Text style={[styles.itemPrice, { fontWeight: '800', fontSize: 15 }]}>
                        {netTotal.toLocaleString('ru-RU')} ₸
                      </Text>
                    </View>
                  )}
                  {!!estimatedBonuses && estimatedBonuses > 0 && !isCancelled && (
                    <View style={[styles.itemRow, { borderBottomWidth: 0, marginTop: -8 }]}>
                      <Text style={styles.bonusEarnLine}>
                        {currentStatus === 'DELIVERED' ? 'Начислено:' : 'Начислим:'}{' '}{estimatedBonuses.toLocaleString('ru-RU')} бонусов
                      </Text>
                    </View>
                  )}
                </>
              );
            })()}
          </Animated.View>
        )}

        {/* Progress tracker */}
        {!isCancelled && (
          <Animated.View style={[styles.trackerCard, { opacity: fadeAnim }]}>
            <Text style={styles.trackerTitle}>СТАТУС ЗАКАЗА</Text>
            <View style={styles.stepperRow}>
              {steps.map((step, i) => {
                const done = i <= currentStep;
                const isFirst = i === 0;
                const isLast  = i === steps.length - 1;
                return (
                  <View key={step} style={styles.stepCol}>
                    <View style={styles.dotRow}>
                      <View style={[styles.stepLine, isFirst && styles.stepLineInvisible, done && !isFirst && styles.stepLineDone]} />
                      <View style={[styles.stepDot, done && styles.stepDotDone]}>
                        {icons[i].lib === 'mci'
                          ? <MaterialCommunityIcons name={icons[i].name as any} size={14} color={done ? '#fff' : 'rgba(255,255,255,0.3)'} />
                          : <Ionicons name={icons[i].name as any} size={14} color={done ? '#fff' : 'rgba(255,255,255,0.3)'} />
                        }
                      </View>
                      <View style={[styles.stepLine, isLast && styles.stepLineInvisible, i < currentStep && styles.stepLineDone]} />
                    </View>
                    <Text style={[styles.stepLabel, done && styles.stepLabelDone]}>{step}</Text>
                  </View>
                );
              })}
            </View>
          </Animated.View>
        )}

        {/* Cancel order */}
        {canCancel && (
          <Animated.View style={[{ width: '100%' }, { opacity: fadeAnim }]}>
            <TouchableOpacity
              style={styles.cancelBtn}
              activeOpacity={0.85}
              onPress={() => setShowCancelConfirm(true)}
            >
              <Text style={styles.cancelBtnTxt}>Отменить заказ</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Buttons */}
        <Animated.View style={[styles.btns, { opacity: fadeAnim }]}>
          {!!restaurantInfo?.phone && (
            <TouchableOpacity
              style={styles.callBtn}
              activeOpacity={0.85}
              onPress={() => Linking.openURL(`tel:${restaurantInfo!.phone}`)}
            >
              <Ionicons name="call-outline" size={18} color={GREEN} />
              <Text style={styles.callBtnTxt}>Позвонить в ресторан</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.85} onPress={onGoHome}>
            <Text style={styles.primaryBtnTxt}>Вернуться</Text>
          </TouchableOpacity>
        </Animated.View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal transparent visible={showCancelConfirm} animationType="fade" onRequestClose={() => setShowCancelConfirm(false)}>
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>Отменить заказ?</Text>
            <Text style={styles.dialogMsg}>Вы уверены, что хотите отменить заказ? Это действие нельзя будет отменить.</Text>
            <View style={styles.dialogBtns}>
              <TouchableOpacity style={styles.dialogBtnNo} onPress={() => setShowCancelConfirm(false)} activeOpacity={0.8} disabled={cancelling}>
                <Text style={styles.dialogBtnNoTxt}>Нет</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dialogBtnYes} onPress={confirmCancelOrder} activeOpacity={0.8} disabled={cancelling}>
                {cancelling
                  ? <ActivityIndicator color="#e05252" />
                  : <Text style={styles.dialogBtnYesTxt}>Да, отменить</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  scroll: { alignItems: 'center', paddingTop: 12, paddingHorizontal: 16 },

  checkCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: GREEN_DARK,
    borderWidth: 3, borderColor: GREEN,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },
  checkCircleCancelled: {
    backgroundColor: '#660000',
    borderColor: '#e05252',
  },

  title: { color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 2 },
  subtitle: {
    color: 'rgba(255,255,255,0.45)', fontSize: 13,
    lineHeight: 18, textAlign: 'center', marginBottom: 16,
  },

  card: {
    width: '100%',
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1, borderColor: BORDER,
    padding: 10,
    marginBottom: 8,
  },
  orderRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    marginBottom: 6,
  },
  cardLabel: {
    color: 'rgba(255,255,255,0.35)', fontSize: 10,
    fontWeight: '700', letterSpacing: 1, marginBottom: 2,
  },
  orderNum: { color: '#fff', fontSize: 22, fontWeight: '800', fontStyle: 'italic' },
  timeVal: { color: GREEN, fontSize: 20, fontWeight: '800' },

  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginBottom: 10 },

  infoRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  infoVal: { color: '#fff', fontSize: 13, fontWeight: '500' },
  infoValOld: { color: 'rgba(255,255,255,0.35)', fontSize: 12, textDecorationLine: 'line-through', marginBottom: 1 },
  bonusLine:     { color: '#8DBB00', fontSize: 13, fontWeight: '500' },
  bonusEarnLine: { color: '#8DBB00', fontSize: 13, fontWeight: '700' },
  kaspiIcon: { width: 18, height: 18, marginTop: 1 },

  trackerCard: {
    width: '100%',
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1, borderColor: BORDER,
    padding: 10,
    marginBottom: 10,
  },
  trackerTitle: {
    color: 'rgba(255,255,255,0.35)', fontSize: 10,
    fontWeight: '700', letterSpacing: 1, marginBottom: 8,
    textAlign: 'center',
  },
  stepperRow: { flexDirection: 'row' },
  stepCol: { flex: 1, alignItems: 'center' },
  dotRow: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  stepDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  stepDotDone: { backgroundColor: GREEN },
  stepLine: { flex: 1, height: 2, backgroundColor: 'rgba(255,255,255,0.15)' },
  stepLineInvisible: { backgroundColor: 'transparent' },
  stepLineDone: { backgroundColor: GREEN },
  stepLabel: {
    textAlign: 'center', marginTop: 6,
    color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: '500',
  },
  stepLabelDone: { color: GREEN },

  cancelBtn: {
    paddingVertical: 14, alignItems: 'center', justifyContent: 'center',
    borderRadius: 30, borderWidth: 1, borderColor: 'rgba(224,82,82,0.4)',
    backgroundColor: 'rgba(224,82,82,0.08)',
    marginBottom: 8,
  },
  cancelBtnTxt: { color: '#e05252', fontSize: 15, fontWeight: '700' },

  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32,
  },
  dialog: {
    width: '100%', backgroundColor: '#1a1f17',
    borderRadius: 20, padding: 24,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  dialogTitle: { color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 8, textAlign: 'center' },
  dialogMsg:   { color: 'rgba(255,255,255,0.5)', fontSize: 14, lineHeight: 20, marginBottom: 24, textAlign: 'center' },
  dialogBtns:  { flexDirection: 'row', gap: 12 },
  dialogBtnNo: {
    flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  dialogBtnNoTxt:  { color: '#fff', fontSize: 15, fontWeight: '600' },
  dialogBtnYes: {
    flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center',
    backgroundColor: 'rgba(224,82,82,0.15)', borderWidth: 1, borderColor: '#e05252',
  },
  dialogBtnYesTxt: { color: '#e05252', fontSize: 15, fontWeight: '700' },

  itemRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingVertical: 5,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)',
    gap: 8,
  },
  itemName:  { color: '#fff', fontSize: 14, fontWeight: '600', marginBottom: 2 },
  itemMeta:  { color: 'rgba(255,255,255,0.4)', fontSize: 12 },
  itemQty:   { color: 'rgba(255,255,255,0.5)', fontSize: 14, minWidth: 24, textAlign: 'right' },
  itemPrice: { color: '#fff', fontSize: 14, fontWeight: '700', minWidth: 80, textAlign: 'right' },

  btns: { width: '100%', gap: 12 },
  callBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: 'rgba(141,187,0,0.1)',
    borderRadius: 30, paddingVertical: 16,
    borderWidth: 1, borderColor: GREEN,
  },
  callBtnTxt: { color: GREEN, fontSize: 16, fontWeight: '700' },
  primaryBtn: {
    backgroundColor: GREEN,
    borderRadius: 30, paddingVertical: 18,
    alignItems: 'center',
  },
  primaryBtnTxt: { color: '#fff', fontSize: 17, fontWeight: '700' },

  viewLayout: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 46,
  },

  viewTitle: {
    color: '#fff', fontSize: 26, fontWeight: '800',
    marginBottom: 6,
  },
  viewDesc: {
    color: 'rgba(255,255,255,0.45)', fontSize: 13,
    textAlign: 'center', lineHeight: 18, marginBottom: 16,
    paddingHorizontal: 16,
  },
  statusBadge: {
    backgroundColor: 'rgba(141,187,0,0.15)',
    borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8,
    marginBottom: 28,
  },
  statusBadgeCancelled: { backgroundColor: 'rgba(224,82,82,0.15)' },
  statusBadgeTxt: { color: GREEN, fontSize: 14, fontWeight: '700' },
  statusBadgeCancelledTxt: { color: '#e05252' },
});
