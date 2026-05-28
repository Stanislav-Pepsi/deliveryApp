import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Image,
  ImageBackground,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const { width: W } = Dimensions.get('window');

const GREEN = '#8DBB00';
const PROMO_W = W - 40;
const PROMO_STEP = PROMO_W + 12;

const BORDER = 'rgba(255,255,255,0.0)';
const GLASS_BG = 'rgba(10,18,8,0.42)';

const PROMOS = [
  { id: '1', tag: 'ПОПРОБУЙТЕ НОВОЕ', title: 'Сет «Базилик»', sub: '–15% до 31 марта', blob: 'rgba(80,160,20,0.35)' },
  { id: '2', tag: 'ЗАВТРАКИ', title: 'Кофе на своё', sub: 'Каждый день с 8:00', blob: 'rgba(20,80,160,0.35)' },
];

const ORDER_STATUSES = [
  { label: 'Принят', done: true },
  { label: 'Готовится', done: true },
  { label: 'Готов', done: false },
  { label: 'Передан', done: false },
];

const CATEGORIES = [
  { id: 'all', label: 'Всё', count: 124 },
  { id: 'sets', label: 'Сеты', count: 18 },
  { id: 'bowls', label: 'Боулы', count: 14 },
  { id: 'pasta', label: 'Паста', count: 9 },
  { id: 'salads', label: 'Салаты', count: 11 },
];

import { DISHES } from '../data/dishes';

const NAV = [
  { key: 'home', label: 'Главная', icon: 'home-outline' as const, iconActive: 'home' as const },
  { key: 'res', label: 'Резервы', icon: 'calendar-outline' as const, iconActive: 'calendar' as const },
  { key: 'cart', label: 'Корзина', icon: 'bag-outline' as const, iconActive: 'bag' as const },
  { key: 'prof', label: 'Профиль', icon: 'person-outline' as const, iconActive: 'person' as const },
];

import { DishData } from '../App';

interface Props {
  onDishPress: (dish: DishData) => void;
  onCartPress: () => void;
  onReservationPress: () => void;
  onProfilePress: () => void;
  cartCount: number;
  address?: string;
}

export default function HomeScreen({ onDishPress, onCartPress, onReservationPress, onProfilePress, cartCount, address }: Props) {
  const [search, setSearch] = useState('');
  const [activeCat, setActiveCat] = useState('all');
  const [activeNav, setActiveNav] = useState('home');
  const [promoIdx, setPromoIdx] = useState(0);
  const promoRef = useRef<ScrollView>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setPromoIdx(prev => {
        const next = (prev + 1) % PROMOS.length;
        promoRef.current?.scrollTo({ x: next * PROMO_STEP, animated: true });
        return next;
      });
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  return (
    <ImageBackground
      source={require('../assets/pexels-batuhan-kocabas-123879152-23330916.jpg')}
      style={styles.root}
      resizeMode="cover"
    >
      <View style={styles.dim} />
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <BlurView intensity={100} tint="dark" style={styles.logoBox}>
              <Text style={styles.logoTxt}>ba</Text>
              <Text style={styles.logoGreen}>silic</Text>
            </BlurView>
            <View>
              <Text style={styles.restaurantName}>Базилик</Text>
              <Text style={styles.restaurantAddr}>ТВЕРСКАЯ, 12 · 0.4 КМ</Text>
            </View>
          </View>
          <BlurView intensity={100} tint="dark" style={styles.bellBtn}>
            <Ionicons name="notifications-outline" size={22} color="#fff" />
          </BlurView>
        </View>

        {/* Delivery address */}
        {!!address && (
          <BlurView intensity={100} tint="dark" style={styles.addrBar}>
            <Ionicons name="location-outline" size={14} color={GREEN} />
            <Text style={styles.addrTxt} numberOfLines={1}>{address}</Text>
          </BlurView>
        )}

        {/* Search */}
        <BlurView intensity={100} tint="dark" style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color="rgba(255,255,255,0.45)" />
          <TextInput
            style={styles.searchInput}
            placeholder="Найти блюдо или ингредиент"
            placeholderTextColor="rgba(255,255,255,0.4)"
            value={search}
            onChangeText={setSearch}
            underlineColorAndroid="transparent"
          />
        </BlurView>

        {/* Active order */}
        <BlurView intensity={100} tint="dark" style={styles.orderCard}>
          <View style={styles.orderHeader}>
            <Text style={styles.orderTitle}>Активный заказ</Text>
            <Text style={styles.orderNum}>#2847</Text>
          </View>
          <View style={styles.stepperRow}>
            {ORDER_STATUSES.map((s, i) => {
              const leftGreen = s.done;
              const rightGreen = i < ORDER_STATUSES.length - 1 && s.done && ORDER_STATUSES[i + 1].done;
              return (
                <View key={i} style={styles.stepCol}>
                  <View style={styles.dotRow}>
                    <View style={[styles.stepLine, leftGreen && styles.stepLineDone]} />
                    <View style={[styles.stepDot, s.done && styles.stepDotDone]} />
                    <View style={[styles.stepLine, rightGreen && styles.stepLineDone]} />
                  </View>
                  <Text style={[styles.stepLabel, s.done && styles.stepLabelDone]}>
                    {s.label}
                  </Text>
                </View>
              );
            })}
          </View>
        </BlurView>

        {/* Promo carousel */}
        <ScrollView
          ref={promoRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.promoContent}
          onMomentumScrollEnd={(e) => {
            setPromoIdx(Math.round(e.nativeEvent.contentOffset.x / PROMO_STEP));
          }}
        >
          {PROMOS.map((p) => (
            <BlurView key={p.id} intensity={100} tint="dark" style={styles.promoCard}>
              <View style={[styles.promoBlob, { backgroundColor: p.blob }]} />
              <Text style={styles.promoTag}>{p.tag}</Text>
              <Text style={styles.promoTitle}>{p.title}</Text>
              <Text style={styles.promoSub}>{p.sub}</Text>
            </BlurView>
          ))}
        </ScrollView>

        {/* Promo dots */}
        <View style={styles.promoDots}>
          {PROMOS.map((_, i) => (
            <View key={i} style={[styles.promoDot, i === promoIdx && styles.promoDotActive]} />
          ))}
        </View>

        {/* Categories */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catsContent}
        >
          {CATEGORIES.map(c => (
            <TouchableOpacity key={c.id} onPress={() => setActiveCat(c.id)} activeOpacity={0.75}>
              <BlurView
                intensity={activeCat === c.id ? 100 : 95}
                tint="dark"
                style={[styles.catChip, activeCat === c.id && styles.catChipActive]}
              >
                <Text style={[styles.catLabel, activeCat === c.id && styles.catLabelActive]}>
                  {c.label}
                </Text>
                <Text style={[styles.catCount, activeCat === c.id && styles.catCountActive]}>
                  {' '}{c.count}
                </Text>
              </BlurView>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Dish grid */}
        <View style={styles.grid}>
          {DISHES.map((d) => (
            <TouchableOpacity key={d.id} activeOpacity={0.85} onPress={() => onDishPress(d)}>
              <BlurView intensity={100} tint="dark" style={styles.dishCard}>
                <Image source={d.img} style={styles.dishImg} resizeMode="cover" />
                <View style={styles.dishBody}>
                  <Text style={styles.dishName}>{d.name}</Text>
                  <Text style={styles.dishWeight}>{d.weight}</Text>
                  <Text style={styles.dishDesc} numberOfLines={3}>{d.desc}</Text>
                  <View style={styles.priceBtn}>
                    <Text style={styles.priceTxt}>{d.price}</Text>
                  </View>
                </View>
              </BlurView>
            </TouchableOpacity>
          ))}
        </View>

      </ScrollView>

      {/* Bottom nav */}
      <BlurView intensity={100} tint="dark" style={styles.bottomNav}>
        {NAV.map(tab => {
          const active = activeNav === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.navTab}
              onPress={() => {
                if (tab.key === 'cart') { onCartPress(); return; }
                if (tab.key === 'res') { onReservationPress(); return; }
                if (tab.key === 'prof') { onProfilePress(); return; }
                setActiveNav(tab.key);
              }}
              activeOpacity={0.7}
            >
              <View>
                <Ionicons
                  name={active ? tab.iconActive : tab.icon}
                  size={24}
                  color={active ? GREEN : 'rgba(255,255,255,0.4)'}
                />
                {tab.key === 'cart' && cartCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeTxt}>{cartCount}</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.navLabel, active && styles.navLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </BlurView>

    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  dim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.78)' },
  scroll: { paddingBottom: 140 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoBox: {
    flexDirection: 'row',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: GLASS_BG,
  },
  logoTxt: { color: '#fff', fontWeight: '700', fontSize: 13 },
  logoGreen: { color: GREEN, fontWeight: '700', fontSize: 13 },
  restaurantName: { color: '#fff', fontWeight: '700', fontSize: 17 },
  restaurantAddr: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginTop: 1,
  },
  bellBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: GLASS_BG,
  },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: GLASS_BG,
  },
  searchInput: { flex: 1, color: '#fff', fontSize: 15 },

  addrBar: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 12, marginHorizontal: 20, marginBottom: 8,
    overflow: 'hidden',
  },
  addrTxt: { color: 'rgba(255,255,255,0.75)', fontSize: 12, flex: 1 },

  orderCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(141,187,0,0.25)',
    backgroundColor: GLASS_BG,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  orderTitle: { color: '#fff', fontWeight: '700', fontSize: 15 },
  orderNum: { color: GREEN, fontWeight: '600', fontSize: 14 },
  stepperRow: { flexDirection: 'row' },
  stepCol: { flex: 1, alignItems: 'center' },
  dotRow: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  stepDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.2)' },
  stepDotDone: { backgroundColor: GREEN },
  stepLine: { flex: 1, height: 2, backgroundColor: 'rgba(255,255,255,0.15)' },
  stepLineDone: { backgroundColor: GREEN },
  stepLabel: {
    textAlign: 'center', marginTop: 6,
    color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: '500',
  },
  stepLabelDone: { color: GREEN },

  promoContent: { paddingHorizontal: 20, gap: 12 },
  promoCard: {
    width: PROMO_W,
    height: 160,
    borderRadius: 20,
    padding: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: GLASS_BG,
  },
  promoBlob: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    right: -60,
    bottom: -60,
  },
  promoTag: { color: GREEN, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 14 },
  promoTitle: { color: '#fff', fontSize: 24, fontWeight: '800', marginBottom: 4 },
  promoSub: { color: 'rgba(255,255,255,0.7)', fontSize: 15, fontWeight: '500' },

  promoDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    marginBottom: 16,
  },
  promoDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.2)' },
  promoDotActive: { backgroundColor: GREEN, width: 18 },

  catsContent: { paddingHorizontal: 20, gap: 8, paddingBottom: 16 },
  catChip: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 30,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: GLASS_BG,
  },
  catChipActive: { borderColor: 'rgba(141,187,0,0.4)' },
  catLabel: { color: 'rgba(255,255,255,0.65)', fontWeight: '600', fontSize: 14 },
  catLabelActive: { color: '#fff' },
  catCount: { color: 'rgba(255,255,255,0.3)', fontWeight: '500', fontSize: 14 },
  catCountActive: { color: GREEN },

  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, gap: 12 },
  dishCard: {
    width: (W - 52) / 2,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: GLASS_BG,
  },
  dishImg: { width: '100%', height: 130 },
  dishBody: { padding: 12 },
  dishName: { color: '#fff', fontWeight: '700', fontSize: 14, marginBottom: 2 },
  dishWeight: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginBottom: 6 },
  dishDesc: { color: 'rgba(255,255,255,0.5)', fontSize: 12, lineHeight: 16, marginBottom: 10 },
  priceBtn: {
    backgroundColor: GREEN,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
  },
  priceTxt: { color: '#fff', fontWeight: '700', fontSize: 13 },

  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingBottom: 56,
    paddingTop: 12,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    overflow: 'hidden',
    backgroundColor: GLASS_BG,
  },
  navTab: { flex: 1, alignItems: 'center', gap: 4 },
  navLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 11 },
  navLabelActive: { color: GREEN },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: GREEN,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeTxt: { color: '#fff', fontSize: 10, fontWeight: '700' },
});
