import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import Text from '../components/Text';
import { UserReservation, fetchUserReservations, fetchSections } from '../api/reservations';

const GREEN      = '#8DBB00';
const GREEN_DARK = '#4a6600';
const BG         = '#0c0f0a';
const CARD       = 'rgba(255,255,255,0.06)';
const BORDER     = 'rgba(255,255,255,0.1)';

const STATUS_MAP: Record<string, { label: string; active: boolean }> = {
  CREATED:    { label: 'Создан',        active: true },
  CONFIRMED:  { label: 'Визит состоялся', active: false },
  PENDING:    { label: 'Ожидается',    active: true },
  CANCELLED:  { label: 'Отменён',      active: false },
  COMPLETED:  { label: 'Завершён',     active: false },
};

export interface MappedBanquetItem {
  name?: string;
  amount: number;
  price: number;
  comment?: string;
  modifiers?: { amount: number; price: number }[];
}

export interface MappedReserve {
  id: string;
  place: string;
  sectionName?: string;
  date: string;
  time?: string;
  createdAt?: string;
  guests: number;
  status: string;
  active: boolean;
  isCancelled: boolean;
  bookType: 'table' | 'banquet';
  banquetItems?: MappedBanquetItem[];
  comment?: string;
}

function formatApiDate(raw: string): { date: string; time: string | undefined } {
  const sep = raw.includes('T') ? 'T' : ' ';
  const dt = raw.split(sep);
  const parts = (dt[0] ?? '').split('-');
  const date = parts.length === 3 ? `${parts[2]}.${parts[1]}.${parts[0]}` : raw;
  const time = dt[1]?.slice(0, 5);
  return { date, time };
}

function mapReservation(r: UserReservation): MappedReserve {
  const { date, time } = formatApiDate(r.estimatedStartTime ?? r.dateTime ?? '');
  const table = r.tables?.[0];
  const rawNumber = (table?.number ?? r.tableNumber ?? 0);
  const rawName = table?.name ?? r.tableName ?? '';
  const rawSection = table?.sectionName ?? r.sectionName;
  const place = rawNumber > 0
    ? String(rawNumber)
    : (/^\d+$/.test(rawName) ? rawName : null)
    ?? r.place
    ?? '';
  const createdAt = r.createdAt
    ? formatApiDate(r.createdAt).date + (formatApiDate(r.createdAt).time ? ` · ${formatApiDate(r.createdAt).time}` : '')
    : undefined;
  const guestsVal = r.guestsCount ?? r.guests ?? 0;
  const { label, active } = STATUS_MAP[r.status] ?? { label: r.status, active: false };
  const isCancelled = r.status === 'CANCELLED';
  const bookType = r.type === 'BANQUET' ? 'banquet' : 'table';
  const banquetItems = r.items?.map(i => ({
    name: i.name ?? undefined,
    amount: i.amount,
    price: i.price,
    comment: i.comment ?? undefined,
    modifiers: i.modifiers?.map(m => ({ amount: m.amount, price: m.price })),
  }));
  return {
    id: r.id, place, sectionName: rawSection ?? undefined,
    date, time, createdAt,
    guests: guestsVal, status: label, active, isCancelled, bookType,
    banquetItems: banquetItems?.length ? banquetItems : undefined,
    comment: r.comment,
  };
}

interface Props {
  onBack: () => void;
  authToken: string | null;
  onReservationPress: (r: MappedReserve) => void;
  isDemoMode?: boolean;
}

export default function ReservesScreen({ onBack, authToken, onReservationPress, isDemoMode }: Props) {
  const [reserves, setReserves]       = useState<MappedReserve[]>([]);
  const [loading, setLoading]         = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore]         = useState(false);
  const pageRef = useRef(1);

  useEffect(() => {
    if (isDemoMode) {
      const { DEMO_RESERVES } = require('../constants/demo');
      setReserves(DEMO_RESERVES);
      setLoading(false);
      return;
    }
    if (!authToken) { setLoading(false); return; }
    fetchSections()
      .catch(() => {})
      .finally(() => {
        fetchUserReservations(authToken, 1, 20)
          .then(res => {
            setReserves(res.data.map(mapReservation));
            setHasMore(20 < res.total);
            pageRef.current = 1;
          })
          .catch(() => {})
          .finally(() => setLoading(false));
      });
  }, [authToken, isDemoMode]);

  const loadMore = async () => {
    if (loadingMore || !hasMore || !authToken) return;
    setLoadingMore(true);
    try {
      const nextPage = pageRef.current + 1;
      const res = await fetchUserReservations(authToken, nextPage, 20);
      setReserves(prev => [...prev, ...res.data.map(mapReservation)]);
      setHasMore(nextPage * 20 < res.total);
      pageRef.current = nextPage;
    } catch {}
    setLoadingMore(false);
  };

  const current = reserves.filter(r => r.active);
  const past    = reserves.filter(r => !r.active);

  const renderReserve = (r: MappedReserve) => (
    <TouchableOpacity key={r.id} style={[styles.card, !r.active && styles.cardDim]} onPress={() => onReservationPress(r)} activeOpacity={0.75}>
      <View style={styles.cardTop}>
        <View style={styles.iconBox}>
          <Ionicons name="restaurant-outline" size={18} color={r.active ? GREEN : 'rgba(255,255,255,0.3)'} />
        </View>
        <Text style={[styles.bookTypeLabel, !r.active && { color: 'rgba(255,255,255,0.25)' }]}>
          {r.bookType === 'banquet' ? 'Банкет' : 'Столик'}
        </Text>
        <View style={[styles.badge, r.active ? styles.badgeActive : styles.badgeDone]}>
          <Text style={[styles.badgeTxt, r.active ? styles.badgeActiveTxt : styles.badgeDoneTxt]}>
            {r.status}
          </Text>
        </View>
      </View>
      <Text style={[styles.place, !r.active && styles.textDim]}>
        {[r.sectionName, r.place && /^\d+$/.test(r.place) ? `Номер стола: ${r.place}` : null].filter(Boolean).join(' · ')}
      </Text>

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
          <Text style={styles.headerTitle}>Мои резервы</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={GREEN} style={{ marginTop: 60 }} />
      ) : reserves.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="calendar-outline" size={48} color="rgba(255,255,255,0.15)" />
          <Text style={styles.emptyTxt}>Нет резервов</Text>
        </View>
      ) : (
        <FlatList
          data={[
            ...(current.length > 0 ? [{ type: 'header' as const, title: 'ПРЕДСТОЯЩИЕ' }, ...current.map(r => ({ type: 'item' as const, reserve: r }))] : []),
            ...(past.length > 0    ? [{ type: 'header' as const, title: 'ИСТОРИЯ' },     ...past.map(r => ({ type: 'item' as const, reserve: r }))]    : []),
          ]}
          keyExtractor={(item, i) => item.type === 'header' ? `h-${i}` : item.reserve.id}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          renderItem={({ item, index }) =>
            item.type === 'header'
              ? <Text style={[styles.sectionLabel, index > 0 && { marginTop: 24 }]}>{item.title}</Text>
              : renderReserve(item.reserve)
          }
          ListFooterComponent={
            loadingMore
              ? <ActivityIndicator color={GREEN} style={{ marginVertical: 16 }} />
              : <View style={{ height: 40 }} />
          }
        />
      )}
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

  empty:    { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyTxt: { color: 'rgba(255,255,255,0.4)', fontSize: 16, fontWeight: '600' },

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

  bookTypeLabel: { flex: 1, color: '#fff', fontSize: 16, fontWeight: '800', marginLeft: 10 },
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
