import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import Text from '../components/Text';
import { CartItem, DishData } from '../App';
import { fetchMenu } from '../api/menu';

const { width: W } = Dimensions.get('window');
const TAG_COLORS: Record<string, string> = {
  tag_new:   '#E8242E',
  tag_hit:   '#7B2FBE',
  tag_spicy: '#E8242E',
};
const GREEN      = '#E8242E';
const GREEN_DARK = '#8B1520';
const BG         = '#0a0a0a';
const CARD       = 'rgba(255,255,255,0.07)';
const BORDER     = 'rgba(255,255,255,0.1)';
const H_PAD      = 16;
const COL_GAP    = 12;
const CARD_W     = (W - H_PAD * 2 - COL_GAP) / 2;

interface Props {
  dishes: DishData[];
  authToken: string | null;
  items: CartItem[];
  serviceChargePercent?: number;
  isDemoMode?: boolean;
  onBack: () => void;
  onDishPress: (dish: DishData) => void;
  onUpdateQty: (index: number, qty: number) => void;
  onDone: () => void;
}

export default function BanquetMenuScreen({ dishes: initialDishes, authToken, items, serviceChargePercent = 0, isDemoMode, onBack, onDishPress, onUpdateQty, onDone }: Props) {
  const [activeCat, setActiveCat] = useState('all');
  const [cartOpen, setCartOpen] = useState(false);
  const [dishes, setDishes] = useState<DishData[]>(initialDishes);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isDemoMode) { setLoading(false); return; }
    fetchMenu(authToken ?? '')
      .then(setDishes)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isDemoMode]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { onBack(); return true; });
    return () => sub.remove();
  }, [onBack]);

  const categories = ['all', ...Array.from(new Set(dishes.map(d => d.category).filter(Boolean)))];
  const filtered = activeCat === 'all' ? dishes : dishes.filter(d => d.category === activeCat);

  const totalQty = items.reduce((s, i) => s + i.qty, 0);
  const totalPrice = items.reduce((s, i) => s + i.unitPrice * i.qty, 0);
  const serviceCharge = serviceChargePercent > 0 ? Math.round(totalPrice * serviceChargePercent / 100) : 0;
  const grandTotal = totalPrice + serviceCharge;

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
          <Text style={styles.headerTitle}>Банкетное меню</Text>
        </View>
        <TouchableOpacity style={styles.cartBtn} onPress={() => setCartOpen(true)} activeOpacity={0.8}>
          <Ionicons name="bag-outline" size={22} color="#fff" />
          {totalQty > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeTxt}>{totalQty}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Category chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.catScroll}
        contentContainerStyle={styles.catContent}
      >
        {categories.map(c => (
          <TouchableOpacity
            key={c}
            style={[styles.catChip, activeCat === c && styles.catChipActive]}
            onPress={() => setActiveCat(c)}
            activeOpacity={0.7}
          >
            <Text style={[styles.catTxt, activeCat === c && styles.catTxtActive]}>
              {c === 'all' ? 'ВСЕ' : c}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading && <ActivityIndicator color={GREEN} style={{ marginTop: 40 }} />}
        <View style={styles.grid}>
          {!loading && filtered.map(d => {
            const qty = qtyForDish(d.id);
            const unavailable = d.isAvailable === false;
            return (
              <TouchableOpacity
                key={d.id}
                style={[styles.dishCard, unavailable && { opacity: 0.6 }]}
                onPress={() => { if (!unavailable) onDishPress(d); }}
                activeOpacity={unavailable ? 1 : 0.85}
              >
                <View>
                  {d.img
                    ? <Image source={d.img} style={[styles.dishImg, unavailable && { opacity: 0.35 }]} resizeMode="cover" />
                    : <View style={[styles.dishImg, { backgroundColor: 'rgba(255,255,255,0.04)' }]} />
                  }
                  {unavailable && (
                    <View style={styles.unavailableOverlay}>
                      <Text style={styles.unavailableOverlayTxt}>Нет в наличии</Text>
                    </View>
                  )}
                  {!unavailable && (d.tags ?? []).length > 0 && (
                    <View style={styles.tagRow}>
                      {(d.tags ?? []).map(tag => (
                        <View key={tag.key} style={[styles.tagBadge, { backgroundColor: TAG_COLORS[tag.key] ?? '#555' }]}>
                          <Text style={styles.tagTxt}>{tag.label.toUpperCase()}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  {qty > 0 && (
                    <View style={styles.qtyBadge}>
                      <Text style={styles.qtyBadgeTxt}>{qty}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.dishBody}>
                  <Text style={styles.dishName} numberOfLines={2}>{d.name}</Text>
                  <Text style={styles.dishWeight}>{d.weight}</Text>
                  <Text style={styles.dishDesc} numberOfLines={2}>{d.desc}</Text>
                  <View style={styles.priceRow}>
                    <View style={[styles.priceBtn, unavailable && { backgroundColor: 'rgba(255,255,255,0.07)' }]}>
                      <Text style={[styles.priceText, unavailable && { color: 'rgba(255,255,255,0.35)', fontSize: 12 }]}>
                        {unavailable ? 'Нет в наличии' : d.price}
                      </Text>
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
            <Text style={styles.totalPriceTxt}>{grandTotal.toLocaleString('ru-RU')} ₸</Text>
          </View>
          {serviceCharge > 0 && (
            <View style={styles.chargeRow}>
              <Text style={styles.chargeTxt}>Обслуживание ({serviceChargePercent}%)</Text>
              <Text style={styles.chargeTxt}>+{serviceCharge.toLocaleString('ru-RU')} ₸</Text>
            </View>
          )}
          <TouchableOpacity style={styles.doneBtn} onPress={onDone} activeOpacity={0.85}>
            <Text style={styles.doneBtnTxt}>Готово · {grandTotal.toLocaleString('ru-RU')} ₸</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Банкет-корзина */}
      <Modal visible={cartOpen} transparent animationType="slide" onRequestClose={() => setCartOpen(false)}>
        <TouchableOpacity style={styles.cartOverlay} activeOpacity={1} onPress={() => setCartOpen(false)} />
        <View style={styles.cartSheet}>
          <View style={styles.cartHandle} />
          <Text style={styles.cartTitle}>Банкетный заказ</Text>
          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
            {items.length === 0 ? (
              <Text style={styles.cartEmpty}>Блюда не добавлены</Text>
            ) : items.map((item, i) => (
              <View key={i} style={styles.cartRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cartItemName}>{item.dish.name}</Text>
                  {(item.sizeName || item.extras.length > 0) && (
                    <Text style={styles.cartItemExtras}>
                      {[item.sizeName, ...item.extras.map(e => e.name)].filter(Boolean).join(' · ')}
                    </Text>
                  )}
                  <Text style={styles.cartItemPrice}>{(item.unitPrice * item.qty).toLocaleString('ru-RU')} ₸</Text>
                </View>
                <View style={styles.qtyControl}>
                  <TouchableOpacity style={styles.qtyBtn} onPress={() => onUpdateQty(i, item.qty - 1)} activeOpacity={0.7}>
                    <Text style={styles.qtyBtnTxt}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.qtyNum}>{item.qty}</Text>
                  <TouchableOpacity style={styles.qtyBtn} onPress={() => onUpdateQty(i, item.qty + 1)} activeOpacity={0.7}>
                    <Text style={styles.qtyBtnTxt}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>
          {totalQty > 0 && (
            <View style={styles.cartFooter}>
              {serviceCharge > 0 && (
                <>
                  <View style={styles.cartSummaryRow}>
                    <Text style={styles.cartSummaryLabel}>Блюда</Text>
                    <Text style={styles.cartSummaryVal}>{totalPrice.toLocaleString('ru-RU')} ₸</Text>
                  </View>
                  <View style={styles.cartSummaryRow}>
                    <Text style={styles.cartSummaryLabel}>Обслуживание ({serviceChargePercent}%)</Text>
                    <Text style={styles.cartSummaryVal}>+{serviceCharge.toLocaleString('ru-RU')} ₸</Text>
                  </View>
                  <View style={styles.cartDivider} />
                </>
              )}
              <View style={styles.cartSummaryRow}>
                <Text style={styles.cartTotalLabel}>Итого</Text>
                <Text style={styles.cartTotalVal}>{grandTotal.toLocaleString('ru-RU')} ₸</Text>
              </View>
              <TouchableOpacity style={[styles.doneBtn, { marginTop: 12 }]} onPress={() => { setCartOpen(false); onDone(); }} activeOpacity={0.85}>
                <Text style={styles.doneBtnTxt}>Готово · {grandTotal.toLocaleString('ru-RU')} ₸</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
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
  headerTitle:   { color: '#fff', fontSize: 18, fontWeight: '700', textAlign: 'center' },
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
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#191414',
  },
  dishImg:     { width: '100%', height: 130 },
  qtyBadge:    {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: GREEN, borderRadius: 12,
    minWidth: 24, height: 24,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 6,
  },
  qtyBadgeTxt: { color: '#fff', fontSize: 12, fontWeight: '800' },
  tagRow:    { position: 'absolute', top: 8, left: 8, flexDirection: 'column', gap: 4 },
  tagBadge:  { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, alignSelf: 'flex-start' },
  tagTxt:    { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },
  unavailableOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  unavailableOverlayTxt: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  dishBody:    { padding: 12 },
  dishName:    { color: '#fff', fontWeight: '700', fontSize: 14, marginBottom: 2 },
  dishWeight:  { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginBottom: 6 },
  dishDesc:    { color: 'rgba(255,255,255,0.5)', fontSize: 12, lineHeight: 16, marginBottom: 10 },
  priceRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  priceBtn:    { backgroundColor: '#4b4141', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 12 },
  priceText:   { color: '#fff', fontWeight: '700', fontSize: 13 },
  addIcon:     {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: GREEN_DARK,
    alignItems: 'center', justifyContent: 'center',
  },

  bottomBar:     { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 46, backgroundColor: 'rgba(12,15,10,0.97)', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)', gap: 10 },
  totalRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalQtyTxt:   { color: 'rgba(255,255,255,0.5)', fontSize: 13 },
  totalPriceTxt: { color: '#fff', fontSize: 16, fontWeight: '800' },
  doneBtn:       { backgroundColor: GREEN, borderRadius: 30, paddingVertical: 18, alignItems: 'center' },
  doneBtnTxt:    { color: '#fff', fontSize: 17, fontWeight: '700' },

  cartBtn:      { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  cartBadge:    {
    position: 'absolute', top: 4, right: 4,
    backgroundColor: GREEN, borderRadius: 8,
    minWidth: 16, height: 16, paddingHorizontal: 3,
    alignItems: 'center', justifyContent: 'center',
  },
  cartBadgeTxt: { color: '#fff', fontSize: 10, fontWeight: '800' },

  chargeRow:   { flexDirection: 'row', justifyContent: 'space-between', marginTop: -4 },
  chargeTxt:   { color: 'rgba(255,255,255,0.4)', fontSize: 12 },

  cartFooter:       { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' },
  cartDivider:      { height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: 6 },
  cartSummaryRow:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  cartSummaryLabel: { color: 'rgba(255,255,255,0.45)', fontSize: 13 },
  cartSummaryVal:   { color: 'rgba(255,255,255,0.45)', fontSize: 13 },
  cartTotalLabel:   { color: '#fff', fontSize: 14, fontWeight: '700' },
  cartTotalVal:     { color: GREEN, fontSize: 16, fontWeight: '800' },

  cartOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  cartSheet: {
    backgroundColor: '#161a13', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 46,
    borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  cartHandle:    { width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  cartTitle:     { color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 16, textAlign: 'center' },
  cartEmpty:     { color: 'rgba(255,255,255,0.35)', fontSize: 14, textAlign: 'center', paddingVertical: 20 },
  cartRow:       { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  cartItemName:   { color: '#fff', fontSize: 14, fontWeight: '600', marginBottom: 2 },
  cartItemExtras: { color: 'rgba(255,255,255,0.35)', fontSize: 11, marginBottom: 2 },
  cartItemPrice:  { color: 'rgba(255,255,255,0.4)', fontSize: 12 },
  qtyControl:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  qtyBtn:        { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  qtyBtnTxt:     { color: '#fff', fontSize: 18, lineHeight: 22 },
  qtyNum:        { color: '#fff', fontSize: 15, fontWeight: '700', minWidth: 20, textAlign: 'center' },
});

