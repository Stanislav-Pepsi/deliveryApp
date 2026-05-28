import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  BackHandler,
  Dimensions,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { CartItem, DishData } from '../App';
import { CATEGORIES, DISHES } from '../data/dishes';

const { width: W } = Dimensions.get('window');
const GREEN      = '#8DBB00';
const GREEN_DARK = '#4a6600';
const BG         = '#0c0f0a';
const CARD       = 'rgba(255,255,255,0.07)';
const BORDER     = 'rgba(255,255,255,0.1)';
const H_PAD      = 16;
const COL_GAP    = 12;
const CARD_W     = (W - H_PAD * 2 - COL_GAP) / 2;

interface Props {
  items: CartItem[];
  onBack: () => void;
  onDishPress: (dish: DishData) => void;
  onDone: () => void;
}

export default function BanquetMenuScreen({ items, onBack, onDishPress, onDone }: Props) {
  const [activeCat, setActiveCat] = useState('all');

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { onBack(); return true; });
    return () => sub.remove();
  }, [onBack]);

  const filtered = activeCat === 'all' ? DISHES : DISHES.filter(d => d.category === activeCat);

  const totalQty = items.reduce((s, i) => s + i.qty, 0);
  const totalPrice = items.reduce((s, i) => {
    const base = parseInt(i.dish.price.replace(/\D/g, ''), 10);
    const delta = i.size === 's' ? -300 : i.size === 'l' ? 600 : 0;
    return s + (base + delta) * i.qty;
  }, 0);

  const qtyForDish = (id: string) =>
    items.filter(i => i.dish.id === id).reduce((s, i) => s + i.qty, 0);

  const qtyWord = (n: number) => n === 1 ? 'блюдо' : n < 5 ? 'блюда' : 'блюд';

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.8}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerSub}>БАНКЕТ · ЗАЛ «БАЗИЛИК»</Text>
          <Text style={styles.headerTitle}>Меню</Text>
        </View>
        {totalQty > 0 ? (
          <TouchableOpacity style={styles.doneSmall} onPress={onDone} activeOpacity={0.8}>
            <Text style={styles.doneSmallTxt}>Готово</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 60 }} />
        )}
      </View>

      {/* Category chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.catScroll}
        contentContainerStyle={styles.catContent}
      >
        {CATEGORIES.map(c => (
          <TouchableOpacity
            key={c.id}
            style={[styles.catChip, activeCat === c.id && styles.catChipActive]}
            onPress={() => setActiveCat(c.id)}
            activeOpacity={0.7}
          >
            <Text style={[styles.catTxt, activeCat === c.id && styles.catTxtActive]}>
              {c.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.grid}>
          {filtered.map(d => {
            const qty = qtyForDish(d.id);
            return (
              <TouchableOpacity
                key={d.id}
                style={styles.dishCard}
                onPress={() => onDishPress(d)}
                activeOpacity={0.85}
              >
                <View style={styles.imgWrap}>
                  <Image source={d.img} style={styles.dishImg} resizeMode="cover" />
                  {qty > 0 && (
                    <View style={styles.qtyBadge}>
                      <Text style={styles.qtyBadgeTxt}>{qty}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.dishInfo}>
                  <Text style={styles.dishName} numberOfLines={2}>{d.name}</Text>
                  <Text style={styles.dishWeight}>{d.weight}</Text>
                  <View style={styles.priceRow}>
                    <Text style={styles.priceText}>{d.price}</Text>
                    <View style={styles.addIcon}>
                      <Ionicons name="add" size={14} color="#fff" />
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ height: totalQty > 0 ? 130 : 40 }} />
      </ScrollView>

      {/* Bottom bar */}
      {totalQty > 0 && (
        <View style={styles.bottomBar}>
          <View style={styles.totalRow}>
            <Text style={styles.totalQtyTxt}>{totalQty} {qtyWord(totalQty)}</Text>
            <Text style={styles.totalPriceTxt}>{totalPrice.toLocaleString('ru-RU')} ₸</Text>
          </View>
          <TouchableOpacity style={styles.doneBtn} onPress={onDone} activeOpacity={0.85}>
            <Text style={styles.doneBtnTxt}>
              Готово · {totalQty} {qtyWord(totalQty)}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingBottom: 14, paddingHorizontal: 20,
  },
  backBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter:  { flex: 1, alignItems: 'center' },
  headerSub:     { color: 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: '700', letterSpacing: 1.2, marginBottom: 3 },
  headerTitle:   { color: '#fff', fontSize: 18, fontWeight: '700' },
  doneSmall:     { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: GREEN_DARK, borderRadius: 20, borderWidth: 1, borderColor: GREEN },
  doneSmallTxt:  { color: '#fff', fontSize: 13, fontWeight: '700' },

  catScroll:     { flexGrow: 0 },
  catContent:    { paddingHorizontal: H_PAD, paddingBottom: 12, gap: 8 },
  catChip:       { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  catChipActive: { backgroundColor: GREEN_DARK, borderColor: GREEN },
  catTxt:        { color: 'rgba(255,255,255,0.45)', fontSize: 14, fontWeight: '600' },
  catTxtActive:  { color: '#fff' },

  scroll:        { flex: 1 },
  scrollContent: { paddingHorizontal: H_PAD, paddingTop: 4 },

  grid:     { flexDirection: 'row', flexWrap: 'wrap', gap: COL_GAP },
  dishCard: {
    width: CARD_W,
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1, borderColor: BORDER,
    overflow: 'hidden',
    marginBottom: 0,
  },
  imgWrap:     { position: 'relative' },
  dishImg:     { width: CARD_W, height: CARD_W * 0.68 },
  qtyBadge:    {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: GREEN, borderRadius: 12,
    minWidth: 24, height: 24,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 6,
  },
  qtyBadgeTxt: { color: '#fff', fontSize: 12, fontWeight: '800' },
  dishInfo:    { padding: 11 },
  dishName:    { color: '#fff', fontSize: 13, fontWeight: '700', marginBottom: 3, lineHeight: 18 },
  dishWeight:  { color: 'rgba(255,255,255,0.3)', fontSize: 11, marginBottom: 9 },
  priceRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  priceText:   { color: GREEN, fontSize: 13, fontWeight: '700' },
  addIcon:     {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: GREEN_DARK,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: GREEN,
  },

  bottomBar:     { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 46, backgroundColor: 'rgba(12,15,10,0.97)', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)', gap: 10 },
  totalRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalQtyTxt:   { color: 'rgba(255,255,255,0.5)', fontSize: 13 },
  totalPriceTxt: { color: '#fff', fontSize: 16, fontWeight: '800' },
  doneBtn:       { backgroundColor: GREEN_DARK, borderRadius: 30, paddingVertical: 18, alignItems: 'center', borderWidth: 1, borderColor: GREEN },
  doneBtnTxt:    { color: '#fff', fontSize: 17, fontWeight: '700' },
});
