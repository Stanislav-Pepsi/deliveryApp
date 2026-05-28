import { Ionicons } from '@expo/vector-icons';
import { io } from 'socket.io-client';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  BackHandler,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import Text from '../components/Text';
import { OrderDisplayItem } from '../App';
import { fetchOrderById } from '../api/orders';

const GREEN = '#8DBB00';
const GREEN_DARK = '#4a6600';
const BG = '#0c0f0a';
const CARD = 'rgba(255,255,255,0.06)';
const BORDER = 'rgba(255,255,255,0.1)';

const WS_URL = 'https://nonvirulently-nonpursuant-georgie.ngrok-free.dev';

interface Props {
  total: number;
  deliveryType: 'delivery' | 'pickup';
  payment: 'kaspi' | 'cash';
  address?: string;
  orderId?: string;
  initialStatus?: string;
  iikoNumber?: number | null;
  orderItems?: OrderDisplayItem[];
  authToken?: string | null;
  onGoHome: () => void;
}


const STEPS_DELIVERY = ['Принят', 'Готовится', 'Передан', 'Доставлен'];
const STEPS_PICKUP   = ['Принят', 'Готовится', 'Готов', 'Выдан'];

const RESTAURANT_ADDRESS = 'Базилик · ул. Абая, 10';

const STATUS_STEP: Record<string, number> = {
  CREATED:     0,
  IN_PROGRESS: 1,
  READY:       1,
  ON_WAY:      2,
  DELIVERED:   3,
};

export default function OrderSuccessScreen({ total, deliveryType, payment, address, orderId, initialStatus, iikoNumber, orderItems, authToken, onGoHome }: Props) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const [currentStatus, setCurrentStatus] = useState(initialStatus || 'CREATED');
  const [currentIikoNumber, setCurrentIikoNumber] = useState<number | null>(iikoNumber ?? null);

  useEffect(() => {
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, bounciness: 12, speed: 8 }),
      Animated.timing(fadeAnim,  { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { onGoHome(); return true; });
    return () => sub.remove();
  }, [onGoHome]);

  // REST: начальная загрузка актуального статуса и iikoNumber
  useEffect(() => {
    if (!orderId || !authToken) return;
    fetchOrderById(orderId, authToken)
      .then(o => {
        if (o.status) setCurrentStatus(o.status);
        if (o.iikoNumber != null) setCurrentIikoNumber(o.iikoNumber);
      })
      .catch(() => {});
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

  // Polling: fallback если WebSocket не прислал событие (напр. оплата картой)
  useEffect(() => {
    if (!orderId || !authToken || currentIikoNumber != null) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    let count = 0;
    const check = () => {
      if (cancelled || count >= 15) return;
      count++;
      fetchOrderById(orderId, authToken)
        .then(o => {
          if (cancelled) return;
          if (o.status) setCurrentStatus(o.status);
          if (o.iikoNumber != null) { setCurrentIikoNumber(o.iikoNumber); return; }
          if (count < 15) timer = setTimeout(check, 2000);
        })
        .catch(() => { if (!cancelled && count < 15) timer = setTimeout(check, 2000); });
    };
    timer = setTimeout(check, 2000);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [orderId, authToken]);

  const isDelivery = deliveryType === 'delivery';
  const steps = isDelivery ? STEPS_DELIVERY : STEPS_PICKUP;
  const timeLabel = isDelivery ? '~35 мин' : '~20 мин';
  const timeCaption = isDelivery ? 'ДОСТАВИМ' : 'БУДЕТ ГОТОВ';
  const currentStep = STATUS_STEP[currentStatus] ?? 0;
  const isCancelled = currentStatus === 'CANCELLED';

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Checkmark */}
        <Animated.View style={[
          styles.checkCircle,
          isCancelled && styles.checkCircleCancelled,
          { transform: [{ scale: scaleAnim }] },
        ]}>
          <Ionicons name={isCancelled ? 'close' : 'checkmark'} size={40} color="#fff" />
        </Animated.View>

        <Animated.View style={{ opacity: fadeAnim, alignItems: 'center' }}>
          <Text style={styles.title}>
            {isCancelled ? 'Заказ отменён' : 'Заказ принят!'}
          </Text>
          <Text style={styles.subtitle}>
            {isCancelled
              ? 'Свяжитесь с рестораном\nдля уточнения деталей.'
              : isDelivery
                ? 'Скоро курьер заберёт ваш\nзаказ из кафе.'
                : 'Приходите забрать заказ\nкогда он будет готов.'}
          </Text>
        </Animated.View>

        <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
          {/* Order number + time */}
          <View style={styles.orderRow}>
            <View>
              <Text style={styles.cardLabel}>ЗАКАЗ</Text>
              <Text style={styles.orderNum}>
                {currentIikoNumber != null ? `#${currentIikoNumber}` : '#...'}
              </Text>
            </View>
            {!isCancelled && (
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.cardLabel}>{timeCaption}</Text>
                <Text style={styles.timeVal}>{timeLabel}</Text>
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
                {isDelivery ? (address || 'Адрес не указан') : RESTAURANT_ADDRESS}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Payment */}
          <View style={styles.infoRow}>
            {payment === 'kaspi' ? (
              <Image
                source={require('../assets/png-klev-club-9nmb-p-kaspi-logotip-png-28.png')}
                style={styles.kaspiIcon}
                resizeMode="contain"
              />
            ) : (
              <Ionicons name="cash-outline" size={20} color="rgba(255,255,255,0.4)" />
            )}
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.cardLabel}>ОПЛАЧЕНО</Text>
              <Text style={styles.infoVal}>
                {total.toLocaleString('ru-RU')} ₸ ·{' '}
                {payment === 'kaspi' ? 'Картой' : 'Наличными'}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Items */}
        {orderItems && orderItems.length > 0 && (
          <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
            <Text style={[styles.cardLabel, { marginBottom: 8 }]}>СОСТАВ ЗАКАЗА</Text>
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
          </Animated.View>
        )}

        {/* Progress tracker */}
        {!isCancelled && (
          <Animated.View style={[styles.trackerCard, { opacity: fadeAnim }]}>
            <Text style={styles.trackerTitle}>Статус заказа</Text>
            <View style={styles.stepperRow}>
              {steps.map((step, i) => {
                const done = i <= currentStep;
                const isFirst = i === 0;
                const isLast  = i === steps.length - 1;
                return (
                  <View key={step} style={styles.stepCol}>
                    <View style={styles.dotRow}>
                      <View style={[styles.stepLine, isFirst && styles.stepLineInvisible, done && !isFirst && styles.stepLineDone]} />
                      <View style={[styles.stepDot, done && styles.stepDotDone]} />
                      <View style={[styles.stepLine, isLast && styles.stepLineInvisible, i < currentStep && styles.stepLineDone]} />
                    </View>
                    <Text style={[styles.stepLabel, done && styles.stepLabelDone]}>{step}</Text>
                  </View>
                );
              })}
            </View>
          </Animated.View>
        )}

        {/* Buttons */}
        <Animated.View style={[styles.btns, { opacity: fadeAnim }]}>
          <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.85} onPress={onGoHome}>
            <Text style={styles.primaryBtnTxt}>Вернуться</Text>
          </TouchableOpacity>
        </Animated.View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  scroll: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 24 },

  checkCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: GREEN_DARK,
    borderWidth: 3, borderColor: GREEN,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 24,
  },
  checkCircleCancelled: {
    backgroundColor: '#660000',
    borderColor: '#e05252',
  },

  title: { color: '#fff', fontSize: 26, fontWeight: '800', marginBottom: 8 },
  subtitle: {
    color: 'rgba(255,255,255,0.45)', fontSize: 14,
    lineHeight: 20, textAlign: 'center', marginBottom: 28,
  },

  card: {
    width: '100%',
    backgroundColor: CARD,
    borderRadius: 18,
    borderWidth: 1, borderColor: BORDER,
    padding: 18,
    marginBottom: 16,
  },
  orderRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    marginBottom: 14,
  },
  cardLabel: {
    color: 'rgba(255,255,255,0.35)', fontSize: 10,
    fontWeight: '700', letterSpacing: 1, marginBottom: 3,
  },
  orderNum: { color: '#fff', fontSize: 26, fontWeight: '800' },
  timeVal: { color: GREEN, fontSize: 22, fontWeight: '800' },

  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginBottom: 14 },

  infoRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  infoVal: { color: '#fff', fontSize: 14, fontWeight: '500' },
  kaspiIcon: { width: 20, height: 20, marginTop: 1 },

  trackerCard: {
    width: '100%',
    backgroundColor: CARD,
    borderRadius: 18,
    borderWidth: 1, borderColor: BORDER,
    padding: 18,
    marginBottom: 28,
  },
  trackerTitle: {
    color: 'rgba(255,255,255,0.35)', fontSize: 10,
    fontWeight: '700', letterSpacing: 1, marginBottom: 16,
  },
  stepperRow: { flexDirection: 'row' },
  stepCol: { flex: 1, alignItems: 'center' },
  dotRow: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  stepDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.2)' },
  stepDotDone: { backgroundColor: GREEN },
  stepLine: { flex: 1, height: 2, backgroundColor: 'rgba(255,255,255,0.15)' },
  stepLineInvisible: { backgroundColor: 'transparent' },
  stepLineDone: { backgroundColor: GREEN },
  stepLabel: {
    textAlign: 'center', marginTop: 6,
    color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: '500',
  },
  stepLabelDone: { color: GREEN },

  itemRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)',
    gap: 8,
  },
  itemName:  { color: '#fff', fontSize: 14, fontWeight: '600', marginBottom: 2 },
  itemMeta:  { color: 'rgba(255,255,255,0.4)', fontSize: 12 },
  itemQty:   { color: 'rgba(255,255,255,0.5)', fontSize: 14, minWidth: 24, textAlign: 'right' },
  itemPrice: { color: '#fff', fontSize: 14, fontWeight: '700', minWidth: 80, textAlign: 'right' },

  btns: { width: '100%', gap: 12 },
  primaryBtn: {
    backgroundColor: GREEN_DARK,
    borderRadius: 30, paddingVertical: 18,
    alignItems: 'center',
    borderWidth: 1, borderColor: GREEN,
  },
  primaryBtnTxt: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
