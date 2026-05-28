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

interface Reserve {
  id: string;
  type: 'table' | 'banquet';
  place: string;
  date: string;
  time?: string;
  guests: number;
  status: string;
  active: boolean;
  deposit?: string;
}

const RESERVES: Reserve[] = [
  { id: '1', type: 'table',   place: 'Стол №8, Зал 2-й этаж',  date: '01.06.2026', time: '19:00', guests: 3, status: 'Подтверждено', active: true },
  { id: '2', type: 'table',   place: 'Стол №7, Барная зона',    date: '18.03.2026', time: '19:30', guests: 4, status: 'Завершено',    active: false },
  { id: '3', type: 'banquet', place: 'Банкет, Зал «Базилик»',   date: '25.03.2026', time: undefined, guests: 20, status: 'Завершено', active: false, deposit: '25 000 ₸' },
];

interface Props {
  onBack: () => void;
}

export default function ReservesScreen({ onBack }: Props) {
  const current = RESERVES.filter(r => r.active);
  const past    = RESERVES.filter(r => !r.active);

  const renderReserve = (r: Reserve) => (
    <View key={r.id} style={[styles.card, !r.active && styles.cardDim]}>
      <View style={styles.cardTop}>
        <View style={styles.iconBox}>
          <Ionicons
            name={r.type === 'banquet' ? 'business-outline' : 'restaurant-outline'}
            size={18}
            color={r.active ? GREEN : 'rgba(255,255,255,0.3)'}
          />
        </View>
        <View style={[styles.badge, r.active ? styles.badgeActive : styles.badgeDone]}>
          <Text style={[styles.badgeTxt, r.active ? styles.badgeActiveTxt : styles.badgeDoneTxt]}>
            {r.status}
          </Text>
        </View>
      </View>

      <Text style={[styles.place, !r.active && styles.textDim]}>{r.place}</Text>

      <View style={styles.detailsRow}>
        <View style={styles.detailItem}>
          <Ionicons name="calendar-outline" size={13} color="rgba(255,255,255,0.3)" />
          <Text style={[styles.detailTxt, !r.active && styles.textDimSub]}>
            {r.date}{r.time ? `, ${r.time}` : ''}
          </Text>
        </View>
        <View style={styles.detailItem}>
          <Ionicons name="people-outline" size={13} color="rgba(255,255,255,0.3)" />
          <Text style={[styles.detailTxt, !r.active && styles.textDimSub]}>
            {r.guests} {r.guests === 1 ? 'гость' : r.guests < 5 ? 'гостя' : 'гостей'}
          </Text>
        </View>
        {r.deposit && (
          <View style={styles.detailItem}>
            <Ionicons name="cash-outline" size={13} color="rgba(255,255,255,0.3)" />
            <Text style={[styles.detailTxt, !r.active && styles.textDimSub]}>Депозит {r.deposit}</Text>
          </View>
        )}
      </View>
    </View>
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
          <Text style={styles.headerTitle}>Мои резервы</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {current.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>ПРЕДСТОЯЩИЕ</Text>
            {current.map(renderReserve)}
          </>
        )}
        {past.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { marginTop: 24 }]}>ИСТОРИЯ</Text>
            {past.map(renderReserve)}
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

  cardTop:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  iconBox:  {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(141,187,0,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },

  place: { color: '#fff', fontSize: 15, fontWeight: '700', marginBottom: 10 },

  detailsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  detailTxt:  { color: 'rgba(255,255,255,0.5)', fontSize: 12 },

  textDim:    { color: 'rgba(255,255,255,0.6)' },
  textDimSub: { color: 'rgba(255,255,255,0.3)' },

  badge:          { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  badgeActive:    { backgroundColor: 'rgba(141,187,0,0.15)', borderColor: GREEN_DARK },
  badgeDone:      { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.12)' },
  badgeTxt:       { fontSize: 11, fontWeight: '700' },
  badgeActiveTxt: { color: GREEN },
  badgeDoneTxt:   { color: 'rgba(255,255,255,0.4)' },
});
