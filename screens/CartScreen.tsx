import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  BackHandler,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Text from '../components/Text';
import { useEffect } from 'react';
import { CartItem } from '../App';

const GREEN = '#8DBB00';
const BG = '#0c0f0a';
const CARD = 'rgba(255,255,255,0.06)';

interface Props {
  items: CartItem[];
  onUpdateQty: (dishId: string, size: string, qty: number) => void;
  onBack: () => void;
  onCheckout: () => void;
}


export default function CartScreen({ items, onUpdateQty, onBack, onCheckout }: Props) {
  const [promo, setPromo] = useState('');

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onBack();
      return true;
    });
    return () => sub.remove();
  }, [onBack]);

  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.qty, 0);
  const delivery = items.length > 0 ? 750 : 0;
  const total = subtotal + delivery;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Hero header */}
      <View style={styles.hero}>
        <Image
          source={require('../assets/pexels-batuhan-kocabas-123879152-23330916.jpg')}
          style={styles.heroImg}
          resizeMode="cover"
        />
        <View style={styles.heroDim} />
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.8}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.stepText}>ШАГ 1 ИЗ 2</Text>
            <Text style={styles.headerTitle}>Корзина</Text>
          </View>
          <View style={{ width: 42 }} />
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {items.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>🛒</Text>
            <Text style={styles.emptyText}>Корзина пуста</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={onBack} activeOpacity={0.85}>
              <Text style={styles.emptyBtnTxt}>Перейти в меню</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Items */}
            {items.map(item => {
              return (
                <View key={`${item.dish.id}-${item.size}`} style={styles.itemCard}>
                  {item.dish.img
                    ? <Image source={item.dish.img} style={styles.itemImg} resizeMode="cover" />
                    : <View style={[styles.itemImg, { backgroundColor: '#1a2010' }]} />
                  }
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{item.dish.name}</Text>
                    <Text style={styles.itemMeta}>
                      {item.dish.category}{item.sizeName ? ` · ${item.sizeName}` : ''}
                    </Text>
                    <Text style={styles.itemPrice}>{(item.unitPrice * item.qty).toLocaleString('ru-RU')} ₸</Text>
                  </View>
                  <View style={styles.qtyRow}>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => onUpdateQty(item.dish.id, item.size, item.qty - 1)}
                    >
                      <Text style={styles.qtyBtnTxt}>−</Text>
                    </TouchableOpacity>
                    <Text style={styles.qtyNum}>{item.qty}</Text>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => onUpdateQty(item.dish.id, item.size, item.qty + 1)}
                    >
                      <Text style={styles.qtyBtnTxt}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}

            {/* Promo */}
            <View style={styles.promoRow}>
              <Ionicons name="gift-outline" size={20} color="rgba(255,255,255,0.4)" style={{ marginRight: 10 }} />
              <TextInput
                style={styles.promoInput}
                placeholder="Введите промокод"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={promo}
                onChangeText={setPromo}
                underlineColorAndroid="transparent"
              />
              <TouchableOpacity style={styles.promoBtn} activeOpacity={0.85}>
                <Text style={styles.promoBtnTxt}>Применить</Text>
              </TouchableOpacity>
            </View>

            {/* Summary */}
            <View style={styles.summary}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Сумма</Text>
                <Text style={styles.summaryVal}>{subtotal.toLocaleString('ru-RU')} ₸</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Доставка</Text>
                <Text style={styles.summaryVal}>{delivery.toLocaleString('ru-RU')} ₸</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.summaryRow}>
                <Text style={styles.totalLabel}>Итого</Text>
                <Text style={styles.totalVal}>{total.toLocaleString('ru-RU')} ₸</Text>
              </View>
            </View>
          </>
        )}

        <View style={{ height: 110 }} />
      </ScrollView>

      {/* Checkout button */}
      {items.length > 0 && (
        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.checkoutBtn} activeOpacity={0.85} onPress={onCheckout}>
            <Text style={styles.checkoutTxt}>Оформить заказ</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  hero: { height: 120, position: 'relative' },
  heroImg: { width: '100%', height: '100%' },
  heroDim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.65)' },
  headerRow: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  stepText: { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '600', letterSpacing: 1 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginTop: 2 },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8 },

  emptyBox: { alignItems: 'center', paddingTop: 80, gap: 16 },
  emptyIcon: { fontSize: 56 },
  emptyText: { color: 'rgba(255,255,255,0.4)', fontSize: 16 },
  emptyBtn: {
    backgroundColor: GREEN,
    borderRadius: 30,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginTop: 8,
  },
  emptyBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },

  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 16,
    marginBottom: 12,
    padding: 12,
    gap: 12,
  },
  itemImg: { width: 64, height: 64, borderRadius: 12 },
  itemInfo: { flex: 1 },
  itemName: { color: '#fff', fontWeight: '700', fontSize: 15, marginBottom: 3 },
  itemMeta: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginBottom: 5 },
  itemPrice: { color: '#fff', fontWeight: '700', fontSize: 15 },

  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  qtyBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnTxt: { color: '#fff', fontSize: 18, lineHeight: 22 },
  qtyNum: { color: '#fff', fontSize: 15, fontWeight: '700', minWidth: 16, textAlign: 'center' },

  promoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginTop: 4,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  promoInput: { flex: 1, color: '#fff', fontSize: 14, paddingVertical: 12 },
  promoBtn: {
    backgroundColor: GREEN,
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 14,
  },
  promoBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 13 },

  summary: {
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { color: 'rgba(255,255,255,0.45)', fontSize: 14 },
  summaryVal: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: 4 },
  totalLabel: { color: '#fff', fontSize: 16, fontWeight: '700' },
  totalVal: { color: '#fff', fontSize: 18, fontWeight: '800' },

  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 46,
    backgroundColor: 'rgba(12,15,10,0.97)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  checkoutBtn: {
    backgroundColor: GREEN,
    borderRadius: 30,
    paddingVertical: 18,
    alignItems: 'center',
  },
  checkoutTxt: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
