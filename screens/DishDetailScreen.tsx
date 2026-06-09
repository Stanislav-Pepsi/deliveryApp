import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  BackHandler,
  Dimensions,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import Text from '../components/Text';
import { CartItem, DishData, SelectedExtra } from '../App';

const { width: W, height: H } = Dimensions.get('window');
const GREEN = '#8DBB00';
const GREEN_DARK = '#5a7a00';
const BG = '#0c0f0a';
const SHEET_H = 420;
const BOTTOM_BAR_H = 100;

interface Props {
  dish: DishData;
  onBack: () => void;
  onAddToCart: (item: CartItem) => void;
}

export default function DishDetailScreen({ dish, onBack, onAddToCart }: Props) {
  const defaultIdx = Math.max(0, dish.sizes.findIndex(s => s.isDefault));
  const [selectedSizeIdx, setSelectedSizeIdx] = useState(defaultIdx);
  const [selectedModifiers, setSelectedModifiers] = useState<Record<string, boolean>>({});
  const [qty, setQty] = useState(1);

  const sheetY = useRef(new Animated.Value(SHEET_H)).current;
  const sheetVisible = useRef(false);

  const showSheet = () => {
    if (sheetVisible.current) return;
    sheetVisible.current = true;
    Animated.spring(sheetY, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
  };

  const hideSheet = () => {
    if (!sheetVisible.current) return;
    sheetVisible.current = false;
    Animated.timing(sheetY, { toValue: SHEET_H, duration: 240, useNativeDriver: true }).start();
  };

  const touchStartY = useRef(0);
  const onTouchStart = (e: any) => { touchStartY.current = e.nativeEvent.pageY; };
  const onTouchEnd = (e: any) => {
    const dy = e.nativeEvent.pageY - touchStartY.current;
    if (dy < -30) showSheet();
    else if (dy > 30) hideSheet();
  };

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (sheetVisible.current) { hideSheet(); return true; }
      onBack();
      return true;
    });
    return () => sub.remove();
  }, [onBack]);

  const hasMultipleSizes = dish.sizes.length > 1;
  const currentSize = dish.sizes[selectedSizeIdx] ?? dish.sizes[0];
  const modifierGroups = currentSize?.modifierGroups ?? [];
  const hasModifiers = modifierGroups.some(g => g.modifiers.length > 0);
  const hasRequired = modifierGroups.some(g => g.minQuantity > 0);

  const toggleModifier = (groupIdx: number, id: string) => {
    const group = modifierGroups[groupIdx];
    const isRadio = group.maxQuantity === 1;
    setSelectedModifiers(prev => {
      const next = { ...prev };
      if (isRadio) {
        // снимаем все в группе, выбираем нажатый (если уже выбран — снимаем только если необязательная)
        const wasSelected = !!prev[id];
        group.modifiers.forEach(m => { next[m.id] = false; });
        if (!wasSelected || group.minQuantity === 0) next[id] = !wasSelected;
        else next[id] = true; // обязательный radio нельзя деселектить
      } else {
        const selectedCount = group.modifiers.filter(m => next[m.id]).length;
        if (!next[id] && selectedCount >= group.maxQuantity) return prev; // лимит
        next[id] = !next[id];
      }
      return next;
    });
  };

  const dishAvailable = dish.isAvailable !== false;
  const canAddToCart = dishAvailable && modifierGroups.every(group => {
    const selectedCount = group.modifiers.filter(m => selectedModifiers[m.id]).length;
    return selectedCount >= group.minQuantity;
  });

  const selectedExtrasList: SelectedExtra[] = modifierGroups
    .flatMap(g => g.modifiers.map(m => ({ ...m, groupId: g.groupId })))
    .filter(m => selectedModifiers[m.id])
    .map(m => ({ id: m.id, name: m.name, price: m.price, groupId: m.groupId }));

  const modifiersPrice = selectedExtrasList.reduce((s, e) => s + e.price, 0);
  const unitPrice = (currentSize?.price ?? 0) + modifiersPrice;
  const total = unitPrice * qty;

  const handleAddToCart = () => {
    if (!canAddToCart) return;
    onAddToCart({
      dish,
      qty,
      size: currentSize?.sizeId ?? '',
      sizeName: hasMultipleSizes ? (currentSize?.sizeName ?? '') : '',
      unitPrice,
      extras: selectedExtrasList,
    });
  };

  return (
    <View style={styles.root} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Hero */}
      <View style={[styles.hero, { height: hasMultipleSizes ? H * 0.62 : H * 0.72 }]}>
        {dish.img
          ? <Image source={typeof dish.img === 'string' ? { uri: dish.img } : dish.img} style={styles.heroImg} resizeMode="cover" />
          : <View style={[styles.heroImg, { backgroundColor: '#1a2010' }]} />
        }
        <LinearGradient
          colors={[
            'rgba(12,15,10,0)',
            'rgba(12,15,10,0.05)',
            'rgba(12,15,10,0.15)',
            'rgba(12,15,10,0.35)',
            'rgba(12,15,10,0.65)',
            'rgba(12,15,10,0.88)',
            'rgba(12,15,10,1)',
          ]}
          locations={[0, 0.15, 0.3, 0.5, 0.7, 0.87, 1]}
          style={styles.heroGradient}
        />
        <TouchableOpacity style={styles.closeBtn} onPress={onBack} activeOpacity={0.8}>
          <Ionicons name="close" size={20} color="#fff" />
        </TouchableOpacity>

        <View style={styles.metaBadges}>
          {!!currentSize?.portionWeightGrams && (
            <View style={styles.badge}>
              <Text style={styles.badgeTxt}>{currentSize.portionWeightGrams} г</Text>
            </View>
          )}
          {!!currentSize?.energy && (
            <View style={styles.badge}>
              <Ionicons name="flash-outline" size={10} color="rgba(255,255,255,0.5)" />
              <Text style={styles.badgeTxt}> {currentSize.energy} ккал</Text>
            </View>
          )}
        </View>
      </View>

      {/* Fixed content */}
      <View style={styles.contentWrapper}>
        <View style={styles.content}>
          <Text style={styles.title}>{dish.name}</Text>
          {!!dish.desc && <Text style={styles.desc}>{dish.desc}</Text>}

          {hasMultipleSizes && (
            <>
              <Text style={styles.sectionLabel}>РАЗМЕР</Text>
              <View style={styles.sizes}>
                {dish.sizes.map((s, idx) => (
                  <TouchableOpacity
                    key={s.sizeId ?? idx}
                    style={[styles.sizeCard, selectedSizeIdx === idx && styles.sizeCardActive]}
                    onPress={() => { setSelectedSizeIdx(idx); setSelectedModifiers({}); }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.sizeSub, selectedSizeIdx === idx && styles.sizeSubActive]}>
                      {s.sizeName}
                    </Text>
                    <Text style={[styles.sizeDelta, selectedSizeIdx === idx && styles.sizeDeltaActive]}>
                      {Math.round(s.price).toLocaleString('ru-RU')} ₸
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </View>

        {hasModifiers && (() => {
          return (
            <View style={styles.swipeHint}>
              <Ionicons name="chevron-up" size={13} color={hasRequired ? '#e05252' : 'rgba(255,255,255,0.3)'} />
              <Text style={[styles.swipeHintTxt, hasRequired && { color: '#e05252' }]}>
                {hasRequired ? 'Выберите обязательные добавки' : 'Добавить к блюду'}
              </Text>
              <Ionicons name="chevron-up" size={13} color={hasRequired ? '#e05252' : 'rgba(255,255,255,0.3)'} />
            </View>
          );
        })()}
      </View>

      {/* Extras sheet */}
      {hasModifiers && (
        <Animated.View style={[styles.extrasSheet, { transform: [{ translateY: sheetY }] }]}>
          <View style={styles.sheetDragArea}>
            <View style={styles.sheetHandle} />
          </View>
          <Text style={styles.sheetTitle}>{hasRequired ? 'Выберите обязательные добавки' : 'Добавить к блюду'}</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {modifierGroups.map((group, gi) => {
              const isRadio = group.maxQuantity === 1;
              const isRequired = group.minQuantity > 0;
              const selectedCount = group.modifiers.filter(m => selectedModifiers[m.id]).length;
              const satisfied = selectedCount >= group.minQuantity;
              return (
                <View key={gi} style={gi > 0 ? { marginTop: 8 } : undefined}>
                  <View style={styles.groupHeader}>
                    <Text style={[styles.groupTitle, !satisfied && styles.groupTitleRequired]}>
                      {group.name}
                    </Text>
                    {isRequired && (
                      <View style={[styles.requiredBadge, satisfied && styles.requiredBadgeDone]}>
                        <Text style={[styles.requiredBadgeTxt, satisfied && styles.requiredBadgeTxtDone]}>{satisfied ? '✓' : 'ОБЯЗАТЕЛЬНО'}</Text>
                      </View>
                    )}
                  </View>
                  {group.modifiers.map(m => {
                    const checked = !!selectedModifiers[m.id];
                    return (
                      <TouchableOpacity
                        key={m.id}
                        style={styles.extraRow}
                        onPress={() => toggleModifier(gi, m.id)}
                        activeOpacity={0.7}
                      >
                        {isRadio ? (
                          <Ionicons
                            name={checked ? 'radio-button-on' : 'radio-button-off'}
                            size={20} color={checked ? GREEN : 'rgba(255,255,255,0.3)'}
                          />
                        ) : (
                          <View style={[styles.checkbox, checked && styles.checkboxActive]}>
                            {checked && <Ionicons name="checkmark" size={14} color="#fff" />}
                          </View>
                        )}
                        <Text style={styles.extraLabel}>{m.name}</Text>
                        {m.price > 0 && (
                          <Text style={styles.extraPrice}>+{Math.round(m.price).toLocaleString('ru-RU')} ₸</Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              );
            })}
          </ScrollView>
        </Animated.View>
      )}

      {/* Bottom bar */}
      <View style={styles.bottomBar}>
        <View style={[styles.qtyBox, !dishAvailable && { opacity: 0.3 }]}>
          <TouchableOpacity onPress={() => setQty(q => Math.max(1, q - 1))} style={styles.qtyBtn} disabled={!dishAvailable}>
            <Text style={styles.qtyBtnTxt}>−</Text>
          </TouchableOpacity>
          <Text style={styles.qtyNum}>{qty}</Text>
          <TouchableOpacity onPress={() => setQty(q => q + 1)} style={styles.qtyBtn} disabled={!dishAvailable}>
            <Text style={styles.qtyBtnTxt}>+</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={[styles.cartBtn, !canAddToCart && { opacity: 0.45 }]}
          activeOpacity={0.85}
          onPress={handleAddToCart}
          disabled={!canAddToCart}
        >
          <Text style={styles.cartBtnTxt}>
            {dishAvailable ? `В корзину · ${total.toLocaleString('ru-RU')} ₸` : 'Уже готовим'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  hero: { width: W },
  heroImg: { width: '100%', height: '100%' },
  heroGradient: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 260,
  },
  closeBtn: {
    position: 'absolute', top: 52, left: 20,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center',
  },

  contentWrapper: {
    flex: 1,
    backgroundColor: BG,
    justifyContent: 'flex-end',
    paddingBottom: 16,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 18,
  },

  title: {
    color: '#fff', fontSize: 22, fontWeight: '800',
    lineHeight: 28, marginBottom: 8, textAlign: 'center',
  },
  metaBadges: {
    position: 'absolute', top: 52, right: 20,
    flexDirection: 'row', gap: 6,
    height: 40, alignItems: 'center',
  },
  badge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.52)',
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5,
  },
  badgeTxt: { color: '#fff', fontSize: 11, fontWeight: '600' },

  desc: {
    color: 'rgba(255,255,255,0.5)', fontSize: 13,
    lineHeight: 19, marginBottom: 20, textAlign: 'center',
  },

  sectionLabel: {
    color: 'rgba(255,255,255,0.35)', fontSize: 11,
    fontWeight: '700', letterSpacing: 1.2, marginBottom: 10, textAlign: 'center',
  },

  sizes: { flexDirection: 'row', gap: 8, marginBottom: 20, justifyContent: 'center' },
  sizeCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 10, paddingVertical: 14, paddingHorizontal: 6,
    alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  sizeCardActive: { backgroundColor: GREEN_DARK, borderColor: GREEN },
  sizeSub: {
    color: 'rgba(255,255,255,0.55)', fontSize: 13,
    fontWeight: '600', marginBottom: 4, textAlign: 'center',
  },
  sizeSubActive: { color: '#fff' },
  sizeDelta: { color: 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: '500' },
  sizeDeltaActive: { color: 'rgba(255,255,255,0.85)' },

  swipeHint: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6,
  },
  swipeHintTxt: {
    color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '500', textAlign: 'center',
  },

  extrasSheet: {
    position: 'absolute',
    bottom: BOTTOM_BAR_H,
    left: 0, right: 0,
    height: SHEET_H,
    backgroundColor: '#161a13',
    borderTopLeftRadius: 22, borderTopRightRadius: 22,
    paddingHorizontal: 24, paddingBottom: 20,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
  },
  sheetDragArea: {
    alignItems: 'center', paddingBottom: 12,
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginTop: 12,
  },
  sheetTitle: {
    color: '#fff', fontSize: 17, fontWeight: '700', marginBottom: 14, textAlign: 'center',
  },
  groupHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, marginBottom: 4 },
  groupTitle: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  groupTitleRequired: { color: '#e05252' },
  requiredBadge:     { backgroundColor: 'rgba(224,82,82,0.15)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  requiredBadgeDone: { backgroundColor: 'rgba(141,187,0,0.15)' },
  requiredBadgeTxt:  { color: '#e05252', fontSize: 11, fontWeight: '700' },
  requiredBadgeTxtDone: { color: '#8DBB00' },
  extraRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)',
    gap: 14,
  },
  checkbox: {
    width: 24, height: 24, borderRadius: 7,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxActive: { backgroundColor: GREEN, borderColor: GREEN },
  extraLabel: { flex: 1, color: '#fff', fontSize: 15 },
  extraPrice: { color: GREEN, fontSize: 15, fontWeight: '600' },

  bottomBar: {
    flexDirection: 'row',
    paddingHorizontal: 20, paddingTop: 14, paddingBottom: 46,
    backgroundColor: '#0c0f0a',
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)',
    gap: 12, alignItems: 'center',
    elevation: 30,
  },
  qtyBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 30, paddingHorizontal: 6, paddingVertical: 6, gap: 10,
  },
  qtyBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  qtyBtnTxt: { color: '#fff', fontSize: 20, fontWeight: '400', lineHeight: 24 },
  qtyNum: { color: '#fff', fontSize: 17, fontWeight: '700', minWidth: 20, textAlign: 'center' },
  cartBtn: {
    flex: 1, backgroundColor: GREEN,
    borderRadius: 30, paddingVertical: 16, alignItems: 'center',
  },
  cartBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
