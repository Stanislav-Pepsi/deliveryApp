import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import {
  Animated,
  BackHandler,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const GREEN = '#8DBB00';
const GREEN_DARK = '#4a6600';
const BG = '#0c0f0a';
const CARD = 'rgba(255,255,255,0.06)';
const BORDER = 'rgba(255,255,255,0.1)';

interface Props {
  total: number;
  deliveryType: 'delivery' | 'pickup';
  payment: 'kaspi' | 'cash';
  onGoHome: () => void;
}

const ORDER_NUM = '#' + Math.floor(1000 + Math.random() * 9000);

const STEPS_DELIVERY = ['Принят', 'Готовится', 'Готов', 'Передан'];
const STEPS_PICKUP   = ['Принят', 'Готовится', 'Готов', 'Выдан'];

export default function OrderSuccessScreen({ total, deliveryType, payment, onGoHome }: Props) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

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

  const isDelivery = deliveryType === 'delivery';
  const steps = isDelivery ? STEPS_DELIVERY : STEPS_PICKUP;
  const timeLabel = isDelivery ? '~35 мин' : '~20 мин';
  const timeCaption = isDelivery ? 'ДОСТАВИМ' : 'БУДЕТ ГОТОВ';

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Checkmark */}
        <Animated.View style={[styles.checkCircle, { transform: [{ scale: scaleAnim }] }]}>
          <Ionicons name="checkmark" size={40} color="#fff" />
        </Animated.View>

        <Animated.View style={{ opacity: fadeAnim, alignItems: 'center' }}>
          <Text style={styles.title}>Заказ принят!</Text>
          <Text style={styles.subtitle}>
            {isDelivery
              ? 'Скоро курьер заберёт ваш\nзаказ из кафе.'
              : 'Приходите забрать заказ\nкогда он будет готов.'}
          </Text>
        </Animated.View>

        <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
          {/* Order number + time */}
          <View style={styles.orderRow}>
            <View>
              <Text style={styles.cardLabel}>ЗАКАЗ</Text>
              <Text style={styles.orderNum}>{ORDER_NUM}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.cardLabel}>{timeCaption}</Text>
              <Text style={styles.timeVal}>{timeLabel}</Text>
            </View>
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
                {isDelivery ? 'Тверская, 12, кв. 84' : 'Базилик · ул. Абая, 10'}
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
                {payment === 'kaspi' ? 'Kaspi •••• 4821' : 'Наличными'}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Progress tracker */}
        <Animated.View style={[styles.trackerCard, { opacity: fadeAnim }]}>
          <Text style={styles.trackerTitle}>Статус заказа</Text>
          <View style={styles.stepperRow}>
            {steps.map((step, i) => {
              const done = i === 0;
              return (
                <View key={step} style={styles.stepCol}>
                  <View style={styles.dotRow}>
                    <View style={styles.stepLine} />
                    <View style={[styles.stepDot, done && styles.stepDotDone]} />
                    <View style={styles.stepLine} />
                  </View>
                  <Text style={[styles.stepLabel, done && styles.stepLabelDone]}>{step}</Text>
                </View>
              );
            })}
          </View>
        </Animated.View>

        {/* Buttons */}
        <Animated.View style={[styles.btns, { opacity: fadeAnim }]}>
          <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.85} onPress={onGoHome}>
            <Text style={styles.primaryBtnTxt}>На главную</Text>
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

  btns: { width: '100%', gap: 12 },
  primaryBtn: {
    backgroundColor: GREEN_DARK,
    borderRadius: 30, paddingVertical: 18,
    alignItems: 'center',
    borderWidth: 1, borderColor: GREEN,
  },
  primaryBtnTxt: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
