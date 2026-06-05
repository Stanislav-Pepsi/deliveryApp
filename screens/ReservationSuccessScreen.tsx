import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const WS_URL = 'https://api.starten.kz';
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import Text from '../components/Text';
import { RestaurantInfo } from '../api/restaurant';
import { cancelReservation } from '../api/reservations';

const GREEN  = '#8DBB00';
const BG     = '#0c0f0a';
const CARD   = 'rgba(255,255,255,0.06)';
const BORDER = 'rgba(255,255,255,0.1)';

export interface ReservationResult {
  reservationId: string;
  tableName: string;
  tableNumber?: number;
  sectionName?: string;
  date: string;
  time: string;
  guests: number;
  bookType: 'table' | 'banquet';
  comment?: string;
}

interface Props {
  result: ReservationResult;
  authToken: string | null;
  restaurantInfo?: RestaurantInfo | null;
  onGoHome: () => void;
  onConfirmed?: () => void;
}

export default function ReservationSuccessScreen({ result, authToken, restaurantInfo, onGoHome, onConfirmed }: Props) {
  const { tableName, tableNumber, sectionName, date, time, guests, bookType, comment } = result;
  const rawTable    = tableNumber != null && tableNumber > 0 ? String(tableNumber) : tableName;
  const tableLabel  = rawTable && /^\d+$/.test(rawTable) ? `Номер стола: ${rawTable}` : null;
  const placeReserv = [sectionName, tableLabel].filter(Boolean).join(' · ');

  const [cancelling, setCancelling]       = useState(false);
  const [showConfirm, setShowConfirm]     = useState(false);
  const [reservationStatus, setReservationStatus] = useState('CREATED');

  const confirmCancel = async () => {
    if (!authToken) return;
    setCancelling(true);
    setShowConfirm(false);
    try {
      await cancelReservation(result.reservationId, 'ClientRefused', authToken);
      onGoHome();
    } catch {
      // silent
    } finally {
      setCancelling(false);
    }
  };

  const createdAt = (() => {
    const d = new Date();
    const dd  = String(d.getDate()).padStart(2, '0');
    const mm  = String(d.getMonth() + 1).padStart(2, '0');
    const hh  = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dd}.${mm}.${d.getFullYear()} · ${hh}:${min}`;
  })();

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

  useEffect(() => {
    if (!authToken) return;
    const socket = io(`${WS_URL}/client`, {
      auth: { token: authToken },
      transports: ['websocket'],
    });
    socket.on('reservation:status_changed', (payload: { reservationId: string; status: string }) => {
      if (payload.reservationId === result.reservationId) {
        setReservationStatus(payload.status);
        if (payload.status !== 'CREATED') {
          setTimeout(() => (onConfirmed ?? onGoHome)(), 800);
        }
      }
    });
    return () => { socket.disconnect(); };
  }, [authToken, result.reservationId]);

  const isBanquet = bookType === 'banquet';
  const guestWord = guests === 1 ? 'гость' : guests < 5 ? 'гостя' : 'гостей';

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <Animated.View style={{ transform: [{ scale: scaleAnim }], marginTop: 52, marginBottom: 8 }}>
          <LottieView
            source={require('../assets/animation/bb7e167e-1171-11ee-83ea-033143fbb32f.json')}
            autoPlay loop={false} speed={0.8}
            style={{ width: 120, height: 120 }}
          />
        </Animated.View>

        <Animated.View style={{ opacity: fadeAnim, alignItems: 'center' }}>
          <Text style={styles.title}>
            {isBanquet ? 'Отлично, мы вас ждем!' : 'Отлично, мы вас ждем!'}
          </Text>
          <Text style={styles.subtitle}>До встречи в выбранный день :)</Text>
        </Animated.View>

        <Animated.View style={[styles.card, { opacity: fadeAnim }]}>

          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={16} color="rgba(255,255,255,0.4)" />
            <View style={{ marginLeft: 10 }}>
              <Text style={styles.cardLabel}>ДАТА СОЗДАНИЯ</Text>
              <Text style={styles.infoVal}>{createdAt}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="storefront-outline" size={16} color="rgba(255,255,255,0.4)" />
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={styles.cardLabel}>ЗАВЕДЕНИЕ</Text>
              <Text style={styles.infoVal}>{[restaurantInfo?.name, restaurantInfo?.address].filter(Boolean).join(' · ') || '—'}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="grid-outline" size={16} color="rgba(255,255,255,0.4)" />
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={styles.cardLabel}>МЕСТО РЕЗЕРВА</Text>
              <Text style={styles.infoVal}>{placeReserv || '—'}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={16} color="rgba(255,255,255,0.4)" />
            <View style={{ marginLeft: 10 }}>
              <Text style={styles.cardLabel}>ДАТА РЕЗЕРВА</Text>
              <Text style={styles.infoVal}>{date} · {time}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="people-outline" size={16} color="rgba(255,255,255,0.4)" />
            <View style={{ marginLeft: 10 }}>
              <Text style={styles.cardLabel}>ГОСТЕЙ</Text>
              <Text style={styles.infoVal}>{guests} {guestWord}</Text>
            </View>
          </View>

          <View style={[styles.infoRow, { marginBottom: 0 }]}>
            <Ionicons name="chatbubble-outline" size={16} color="rgba(255,255,255,0.4)" />
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={styles.cardLabel}>КОММЕНТАРИЙ</Text>
              <Text style={styles.infoVal}>{comment || '—'}</Text>
            </View>
          </View>

        </Animated.View>

        {reservationStatus === 'CREATED' && (
          <Animated.View style={[{ width: '100%' }, { opacity: fadeAnim }]}>
            <TouchableOpacity
              style={[styles.cancelBtn, cancelling && { opacity: 0.5 }]}
              activeOpacity={0.85}
              disabled={cancelling}
              onPress={() => setShowConfirm(true)}
            >
              {cancelling
                ? <ActivityIndicator color="#e05252" />
                : <Text style={styles.cancelBtnTxt}>Отменить бронь</Text>
              }
            </TouchableOpacity>
          </Animated.View>
        )}

        <View style={{ height: 16 }} />
      </ScrollView>

      <Animated.View style={[styles.bottomBar, { opacity: fadeAnim }]}>
        <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.85} onPress={onGoHome}>
          <Text style={styles.primaryBtnTxt}>На главную</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Кастомный диалог подтверждения */}
      <Modal transparent visible={showConfirm} animationType="fade" onRequestClose={() => setShowConfirm(false)}>
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>Отменить бронирование?</Text>
            <Text style={styles.dialogMsg}>Вы уверены, что хотите отменить бронь?</Text>
            <View style={styles.dialogBtns}>
              <TouchableOpacity style={styles.dialogBtnNo} onPress={() => setShowConfirm(false)} activeOpacity={0.8}>
                <Text style={styles.dialogBtnNoTxt}>Нет</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dialogBtnYes} onPress={confirmCancel} activeOpacity={0.8}>
                <Text style={styles.dialogBtnYesTxt}>Да, отменить</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: BG },
  scroll: { alignItems: 'center', paddingTop: 12, paddingHorizontal: 16 },

  title: { color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 4, textAlign: 'center' },
  subtitle: {
    color: 'rgba(255,255,255,0.45)', fontSize: 13,
    lineHeight: 18, textAlign: 'center', marginBottom: 16, paddingHorizontal: 16,
  },

  card: {
    width: '100%', backgroundColor: CARD, borderRadius: 16,
    borderWidth: 1, borderColor: BORDER, padding: 14, marginBottom: 16,
  },
  infoRow:   { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  cardLabel: { color: 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 2 },
  infoVal:   { color: '#fff', fontSize: 14, fontWeight: '600' },

  bottomBar: {
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 46,
    backgroundColor: 'rgba(12,15,10,0.97)',
  },
  primaryBtn:    { backgroundColor: GREEN, borderRadius: 30, paddingVertical: 18, alignItems: 'center' },
  primaryBtnTxt: { color: '#fff', fontSize: 17, fontWeight: '700' },
  cancelBtn:     { paddingVertical: 10, alignItems: 'center', marginTop: -4 },
  cancelBtnTxt:  { color: '#e05252', fontSize: 17, fontWeight: '700' },

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
});
