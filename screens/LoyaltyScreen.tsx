import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import Text from '../components/Text';
import { LoyaltyBalance, LoyaltyTransaction, fetchLoyaltyBalance, fetchLoyaltyTransactions } from '../api/loyalty';

const GREEN      = '#8DBB00';
const GREEN_DARK = '#4a6600';
const BG         = '#0c0f0a';
const CARD       = 'rgba(255,255,255,0.06)';
const BORDER     = 'rgba(255,255,255,0.1)';
const RED        = '#e05252';

const TYPE_CONFIG: Record<string, { label: string; color: string; sign: string }> = {
  EARNED:       { label: 'Начислено за заказ',    color: GREEN, sign: '+' },
  SPENT:        { label: 'Списано при оплате',     color: RED,   sign: '−' },
  REFUNDED:     { label: 'Возврат бонусов',        color: GREEN, sign: '+' },
  MANUAL_ADD:   { label: 'Начислено рестораном',   color: GREEN, sign: '+' },
  MANUAL_DEDUCT:{ label: 'Списано рестораном',     color: RED,   sign: '−' },
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`;
}

interface Props {
  onBack: () => void;
  authToken: string | null;
  isDemoMode?: boolean;
  demoBalance?: number | null;
}

export default function LoyaltyScreen({ onBack, authToken, isDemoMode, demoBalance }: Props) {
  const [balance, setBalance]           = useState<LoyaltyBalance | null>(null);
  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([]);
  const [loading, setLoading]           = useState(true);
  const [loadingMore, setLoadingMore]   = useState(false);
  const [hasMore, setHasMore]           = useState(false);
  const pageRef = useRef(1);

  useEffect(() => {
    if (isDemoMode) {
      setBalance({ balance: demoBalance ?? 0, cashbackPercent: 10 } as any);
      setLoading(false);
      return;
    }
    if (!authToken) { setLoading(false); return; }
    Promise.all([
      fetchLoyaltyBalance(authToken),
      fetchLoyaltyTransactions(authToken, 1, 20),
    ])
      .then(([b, res]) => {
        setBalance(b);
        setTransactions(res.data);
        setHasMore(20 < res.total);
        pageRef.current = 1;
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [authToken, isDemoMode]);

  const loadMore = async () => {
    if (loadingMore || !hasMore || !authToken || isDemoMode) return;
    setLoadingMore(true);
    try {
      const nextPage = pageRef.current + 1;
      const res = await fetchLoyaltyTransactions(authToken, nextPage, 20);
      setTransactions(prev => [...prev, ...res.data]);
      setHasMore(nextPage * 20 < res.total);
      pageRef.current = nextPage;
    } catch {}
    setLoadingMore(false);
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.8}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.headerSub}>ПРОФИЛЬ</Text>
          <Text style={styles.headerTitle}>Мои бонусы</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Balance card */}
        {balance != null && (
          <View style={styles.balanceCard}>
            <Ionicons name="star" size={28} color={GREEN} style={{ marginBottom: 8 }} />
            <Text style={styles.balanceNum}>{balance.balance.toLocaleString('ru-RU')}</Text>
            <Text style={styles.balanceLbl}>{balance.currency}</Text>
          </View>
        )}

        {loading ? (
          <ActivityIndicator color={GREEN} style={{ marginTop: 40 }} />
        ) : transactions.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="star-outline" size={48} color="rgba(255,255,255,0.15)" />
            <Text style={styles.emptyTxt}>Нет операций</Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionLabel}>ИСТОРИЯ ОПЕРАЦИЙ</Text>
            <FlatList
              data={transactions}
              keyExtractor={t => t.id}
              scrollEnabled={false}
              onEndReached={loadMore}
              onEndReachedThreshold={0.3}
              style={styles.listCard}
              renderItem={({ item: t, index: i }) => {
                const cfg = TYPE_CONFIG[t.type] ?? { label: t.type, color: '#fff', sign: '' };
                const amount = parseFloat(t.amount);
                return (
                  <View style={[styles.row, i < transactions.length - 1 && styles.rowDivider]}>
                    <View style={[styles.iconBox, { backgroundColor: cfg.color === GREEN ? 'rgba(141,187,0,0.12)' : 'rgba(224,82,82,0.12)' }]}>
                      <Ionicons name={cfg.sign === '+' ? 'arrow-up' : 'arrow-down'} size={16} color={cfg.color} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.rowLabel}>{cfg.label}</Text>
                      <Text style={styles.rowDate}>{formatDate(t.createdAt)}</Text>
                      {t.expiresAt && <Text style={styles.rowExpiry}>Сгорят: {formatDate(t.expiresAt)}</Text>}
                    </View>
                    <Text style={[styles.rowAmount, { color: cfg.color }]}>{cfg.sign}{amount.toLocaleString('ru-RU')}</Text>
                  </View>
                );
              }}
              ListFooterComponent={loadingMore ? <ActivityIndicator color={GREEN} style={{ marginVertical: 12 }} /> : null}
            />
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

  balanceCard: {
    backgroundColor: 'rgba(141,187,0,0.08)',
    borderRadius: 20, borderWidth: 1.5, borderColor: GREEN_DARK,
    padding: 24, alignItems: 'center', marginBottom: 20,
  },
  balanceNum: { color: '#fff', fontSize: 48, fontWeight: '800', lineHeight: 54 },
  balanceLbl: { color: 'rgba(255,255,255,0.4)', fontSize: 14, fontWeight: '600', marginTop: 4 },

  sectionLabel: {
    color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: '700',
    letterSpacing: 1.5, marginBottom: 10,
  },

  listCard: {
    backgroundColor: CARD, borderRadius: 18,
    borderWidth: 1, borderColor: BORDER, overflow: 'hidden',
  },
  row:        { flexDirection: 'row', alignItems: 'center', padding: 14 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)' },
  iconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowLabel:  { color: '#fff', fontSize: 14, fontWeight: '600', marginBottom: 2 },
  rowDate:   { color: 'rgba(255,255,255,0.4)', fontSize: 12 },
  rowExpiry: { color: '#e09a52', fontSize: 11, marginTop: 2 },
  rowAmount: { fontSize: 15, fontWeight: '700' },

  empty:    { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyTxt: { color: 'rgba(255,255,255,0.4)', fontSize: 16, fontWeight: '600' },
});
