import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import Text from '../components/Text';
import { Announcement, fetchAnnouncements } from '../api/announcements';

const { width: W } = Dimensions.get('window');
const GREEN = '#E8242E';
const BG    = '#0a0a0a';
const CARD  = 'rgba(255,255,255,0.06)';

interface Props {
  onBack: () => void;
  isDemoMode?: boolean;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`;
}

export default function AnnouncementsScreen({ onBack, isDemoMode }: Props) {
  const [items, setItems]       = useState<Announcement[]>([]);
  const [loading, setLoading]   = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage]         = useState(1);
  const [hasMore, setHasMore]   = useState(false);

  const load = async (p: number, append = false) => {
    try {
      const res = await fetchAnnouncements(p, 20);
      setItems(prev => append ? [...prev, ...res.data] : res.data);
      setHasMore(p * 20 < res.total);
      setPage(p);
    } catch {}
  };

  useEffect(() => {
    if (isDemoMode) { setLoading(false); return; }
    load(1).finally(() => setLoading(false));
  }, [isDemoMode]);

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    await load(page + 1, true);
    setLoadingMore(false);
  };

  const renderItem = ({ item }: { item: Announcement }) => (
    <View style={styles.card}>
      {item.imageUrl && (
        <Image source={{ uri: item.imageUrl }} style={styles.cardImg} resizeMode="cover" />
      )}
      <View style={styles.cardBody}>
        <Text style={styles.cardDate}>{formatDate(item.createdAt)}</Text>
        <Text style={styles.cardTitle}>{item.title}</Text>
        {!!item.description && <Text style={styles.cardBody2}>{item.description}</Text>}
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
          <Text style={styles.headerSub}>МЕНЮ</Text>
          <Text style={styles.headerTitle}>Акции и новости</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={GREEN} style={{ marginTop: 60 }} />
      ) : items.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="megaphone-outline" size={48} color="rgba(255,255,255,0.15)" />
          <Text style={styles.emptyTxt}>Акций пока нет</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={a => a.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={renderItem}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
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

  list: { paddingHorizontal: 20, paddingTop: 4, gap: 16 },

  empty:    { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyTxt: { color: 'rgba(255,255,255,0.4)', fontSize: 16, fontWeight: '600' },

  card: {
    backgroundColor: CARD,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  cardImg:   { width: '100%', height: 180 },
  cardBody:  { padding: 16, gap: 6 },
  cardDate:  { color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: '600' },
  cardTitle: { color: '#fff', fontSize: 17, fontWeight: '800', lineHeight: 23 },
  cardBody2: { color: 'rgba(255,255,255,0.6)', fontSize: 14, lineHeight: 20 },
});

