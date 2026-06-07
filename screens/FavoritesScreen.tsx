import { Ionicons } from '@expo/vector-icons';
import {
  Dimensions,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import Text from '../components/Text';
import { DishData } from '../App';

const { width: W } = Dimensions.get('window');
const GREEN = '#8DBB00';
const BG    = '#0c0f0a';
const CARD  = 'rgba(255,255,255,0.06)';

interface Props {
  dishes: DishData[];
  favorites: Set<string>;
  onDishPress: (dish: DishData) => void;
  onToggleFavorite: (id: string) => void;
  onBack: () => void;
}

export default function FavoritesScreen({ dishes, favorites, onDishPress, onToggleFavorite, onBack }: Props) {
  const favDishes = dishes.filter((d, i, arr) => favorites.has(d.id) && arr.findIndex(x => x.id === d.id) === i);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.8}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.headerSub}>ПРОФИЛЬ</Text>
          <Text style={styles.headerTitle}>Избранное</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {favDishes.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="heart-outline" size={56} color="rgba(255,255,255,0.12)" />
            <Text style={styles.emptyTxt}>Нет избранных блюд</Text>
            <Text style={styles.emptyHint}>Нажмите на сердечко на карточке{'\n'}блюда, чтобы добавить в избранное</Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {favDishes.map(d => (
              <TouchableOpacity key={d.id} activeOpacity={0.85} onPress={() => onDishPress(d)}>
                <View style={styles.dishCard}>
                  <View>
                    {d.img
                      ? <Image source={d.img} style={styles.dishImg} resizeMode="cover" />
                      : <View style={[styles.dishImg, { backgroundColor: 'rgba(255,255,255,0.04)' }]} />
                    }
                    <TouchableOpacity
                      style={styles.heartBtn}
                      onPress={() => onToggleFavorite(d.id)}
                      activeOpacity={0.75}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="heart" size={22} color="#e05252" />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.dishBody}>
                    <Text style={styles.dishName}>{d.name}</Text>
                    <Text style={styles.dishWeight}>{d.weight}</Text>
                    <Text style={styles.dishDesc} numberOfLines={3}>{d.desc}</Text>
                    <View style={styles.priceBtn}>
                      <Text style={styles.priceTxt}>{d.price}</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
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

  scroll: { paddingHorizontal: 20, paddingTop: 4, flexGrow: 1 },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 12 },
  emptyTxt:  { color: 'rgba(255,255,255,0.4)', fontSize: 16, fontWeight: '600' },
  emptyHint: { color: 'rgba(255,255,255,0.25)', fontSize: 13, textAlign: 'center', lineHeight: 20 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  dishCard: {
    width: (W - 52) / 2,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: CARD,
  },
  dishImg: { width: '100%', height: 130 },
  heartBtn: {
    position: 'absolute', top: 8, right: 8,
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center',
  },
  dishBody: { padding: 12 },
  dishName:   { color: '#fff', fontWeight: '700', fontSize: 14, marginBottom: 2 },
  dishWeight: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginBottom: 6 },
  dishDesc:   { color: 'rgba(255,255,255,0.5)', fontSize: 12, lineHeight: 16, marginBottom: 10 },
  priceBtn: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20, paddingVertical: 8, paddingHorizontal: 12,
    alignSelf: 'flex-start',
  },
  priceTxt: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
