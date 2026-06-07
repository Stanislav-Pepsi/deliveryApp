import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Keyboard,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Text from '../components/Text';

const { width: W } = Dimensions.get('window');

const GREEN = '#E8242E';
const PROMO_W = W - 40;
const PROMO_STEP = PROMO_W + 12;

const GLASS_BG = 'rgba(255,255,255,0.06)';

const TAG_COLORS: Record<string, string> = {
  tag_new:   '#8DBB00',
  tag_hit:   '#7B2FBE',
  tag_spicy: '#E8242E',
};


const ACTIVE_STATUSES = new Set(['CREATED', 'IN_PROGRESS', 'READY', 'ON_WAY']);
const STATUS_STEP: Record<string, number> = {
  CREATED: 0, IN_PROGRESS: 1, READY: 1, ON_WAY: 2, DELIVERED: 3,
};
const STEPS_DELIVERY = ['Принят', 'Готовится', 'Передан', 'Доставлен'];
const STEPS_PICKUP   = ['Принят', 'Готовится', 'Готов', 'Выдан'];

type StepIcon = { lib: 'ion'; name: string } | { lib: 'mci'; name: string };
const ICONS_DELIVERY: StepIcon[] = [
  { lib: 'ion', name: 'receipt-outline' },
  { lib: 'mci', name: 'pot-steam-outline' },
  { lib: 'ion', name: 'bicycle-outline' },
  { lib: 'ion', name: 'home-outline' },
];
const ICONS_PICKUP: StepIcon[] = [
  { lib: 'ion', name: 'receipt-outline' },
  { lib: 'mci', name: 'pot-steam-outline' },
  { lib: 'ion', name: 'bag-outline' },
  { lib: 'mci', name: 'food-outline' },
];

import { fetchMenu } from '../api/menu';
import { ApiOrder, fetchOrders } from '../api/orders';
import { Announcement, fetchAnnouncements } from '../api/announcements';
import { io } from 'socket.io-client';

const WS_URL = 'https://nonvirulently-nonpursuant-georgie.ngrok-free.dev';
import { OrderSummary } from './OrdersScreen';

const NAV = [
  { key: 'home', label: 'Главная', icon: 'home-outline' as const, iconActive: 'home' as const },
  { key: 'res', label: 'Резервы', icon: 'calendar-outline' as const, iconActive: 'calendar' as const },
  { key: 'cart', label: 'Корзина', icon: 'cart-outline' as const, iconActive: 'cart' as const },
  { key: 'prof', label: 'Профиль', icon: 'person-outline' as const, iconActive: 'person' as const },
];

import { DishData } from '../App';
import { RestaurantInfo, getNextOpenTime } from '../api/restaurant';

interface Props {
  onDishPress: (dish: DishData) => void;
  onCartPress: () => void;
  onReservationPress: () => void;
  onProfilePress: () => void;
  onOrderPress: (summary: OrderSummary) => void;
  onAddressPress: () => void;
  cartCount: number;
  address?: string;
  authToken?: string | null;
  onDishesLoaded?: (dishes: DishData[]) => void;
  restaurantInfo?: RestaurantInfo | null;
  isOpen?: boolean;
  favorites?: Set<string>;
  onToggleFavorite?: (id: string) => void;
}

export default function HomeScreen({ onDishPress, onCartPress, onReservationPress, onProfilePress, onOrderPress, onAddressPress, cartCount, address, authToken, onDishesLoaded, restaurantInfo, isOpen, favorites: favProp, onToggleFavorite: toggleFavProp }: Props) {
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeCat, setActiveCat] = useState('all');
  const [activeNav, setActiveNav] = useState('home');
  const [promoIdx, setPromoIdx] = useState(0);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [announcImgHeight, setAnnouncImgHeight] = useState(220);
  const promoRef = useRef<ScrollView>(null);
  const scrollPos = useRef(0);
  const { height: SCREEN_H } = Dimensions.get('window');
  const slideAnim = useRef(new Animated.Value(SCREEN_H)).current;
  const searchRef = useRef<TextInput>(null);

  const openSearch = () => {
    setSearchOpen(true);
    Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, bounciness: 4, speed: 14 }).start(() => {
      searchRef.current?.focus();
    });
  };

  const closeSearch = () => {
    Keyboard.dismiss();
    Animated.timing(slideAnim, { toValue: SCREEN_H, duration: 260, useNativeDriver: true }).start(() => {
      setSearchOpen(false);
      setSearch('');
    });
  };

  useEffect(() => {
    fetchAnnouncements().then(r => setAnnouncements(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedAnnouncement?.imageUrl) return;
    Image.getSize(selectedAnnouncement.imageUrl, (w, h) => {
      setAnnouncImgHeight(Math.round((W - 40) * h / w));
    }, () => {});
  }, [selectedAnnouncement?.imageUrl]);

  useEffect(() => {
    if (announcements.length < 2) return;
    const interval = setInterval(() => {
      const next = scrollPos.current + 1;
      promoRef.current?.scrollTo({ x: next * PROMO_STEP, animated: true });
      scrollPos.current = next;
      setPromoIdx(next % announcements.length);
      if (next >= announcements.length) {
        setTimeout(() => {
          promoRef.current?.scrollTo({ x: 0, animated: false });
          scrollPos.current = 0;
        }, 350);
      }
    }, 7000);
    return () => clearInterval(interval);
  }, [announcements.length]);

  const [dishes, setDishes] = useState<DishData[]>([]);
  const [dishLoading, setDishLoading] = useState(true);
  const [activeOrders, setActiveOrders] = useState<ApiOrder[]>([]);
  const favorites = favProp ?? new Set<string>();
  const toggleFavorite = toggleFavProp ?? (() => {});

  useEffect(() => {
    if (!authToken) return;
    fetchMenu(authToken)
      .then(data => { setDishes(data); onDishesLoaded?.(data); })
      .catch(() => {})
      .finally(() => setDishLoading(false));
  }, [authToken]);

  useEffect(() => {
    if (!authToken) return;
    fetchOrders(authToken, 1, 50)
      .then(res => setActiveOrders(res.data.filter(o => ACTIVE_STATUSES.has(o.status))))
      .catch(() => {});
  }, [authToken]);

  useEffect(() => {
    if (!authToken) return;
    const interval = setInterval(() => {
      fetchOrders(authToken, 1, 50)
        .then(res => setActiveOrders(res.data.filter(o => ACTIVE_STATUSES.has(o.status))))
        .catch(() => {});
    }, 15000);
    return () => clearInterval(interval);
  }, [authToken]);

  useEffect(() => {
    if (!authToken) return;
    const socket = io(`${WS_URL}/client`, {
      auth: { token: `Bearer ${authToken}` },
      transports: ['websocket'],
    });
    socket.on('order:status_changed', (payload: { orderId: string; status: string }) => {
      setActiveOrders(prev => {
        const updated = prev.map(o => o.id === payload.orderId ? { ...o, status: payload.status } : o);
        return updated.filter(o => ACTIVE_STATUSES.has(o.status));
      });
    });
    socket.on('stop_list_updated', (payload: { items: { productId: string; balance: number | null }[] }) => {
      const stoppedIds = new Set(payload.items.filter(i => i.balance === 0 || i.balance === null).map(i => i.productId));
      const restoredIds = new Set(payload.items.filter(i => i.balance !== 0 && i.balance !== null).map(i => i.productId));
      setDishes(prev => {
        const updated = prev.map(d => {
          if (stoppedIds.has(d.id)) return { ...d, isAvailable: false };
          if (restoredIds.has(d.id)) return { ...d, isAvailable: true };
          return d;
        });
        onDishesLoaded?.(updated);
        return updated;
      });
    });
    return () => { socket.disconnect(); };
  }, [authToken]);

  const uniqueDishes = dishes.filter((d, i, arr) => arr.findIndex(x => x.id === d.id) === i);
  const catIds = ['all', ...Array.from(new Set(uniqueDishes.map(d => d.category).filter(Boolean)))];
  const dynCats = catIds.map(id => ({
    id,
    label: id === 'all' ? 'ВСЕ' : id,
    count: id === 'all' ? uniqueDishes.length : uniqueDishes.filter(d => d.category === id).length,
  }));
  const filtered = uniqueDishes
    .filter(d => {
      const q = search.toLowerCase().trim();
      if (q && !d.name.toLowerCase().includes(q) && !d.desc.toLowerCase().includes(q)) return false;
      if (activeCat !== 'all' && d.category !== activeCat) return false;
      return true;
    })
    .sort((a, b) => {
      const aAvail = a.isAvailable !== false ? 0 : 1;
      const bAvail = b.isAvailable !== false ? 0 : 1;
      if (aAvail !== bAvail) return aAvail - bAvail;
      return (favorites.has(b.id) ? 1 : 0) - (favorites.has(a.id) ? 1 : 0);
    });

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            {restaurantInfo?.name ? (
              <Text style={styles.restaurantName}>{restaurantInfo.name}</Text>
            ) : null}
            <TouchableOpacity style={styles.addrRow} onPress={onAddressPress} activeOpacity={0.7}>
              <Ionicons name="location-outline" size={13} color={GREEN} />
              <Text style={styles.addrTxt} numberOfLines={1}>
                {address || 'Укажите адрес доставки'}
              </Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.searchBtn} onPress={openSearch} activeOpacity={0.75}>
            <Ionicons name="search-outline" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Temporarily closed banner */}
        {(isOpen === false || !!restaurantInfo?.isTemporarilyClosed) && (
          <View style={styles.closedBanner}>
            <Ionicons name="time-outline" size={18} color="#fff" style={{ marginRight: 10, flexShrink: 0 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.closedBannerTxt}>
                Ресторан сейчас не принимает заказы. Бронирование столиков доступно.
              </Text>
              {(() => {
                const nextOpen = getNextOpenTime(restaurantInfo?.workingHours, restaurantInfo?.timezone);
                return nextOpen ? (
                  <Text style={styles.closedBannerSub}>Откроется в {nextOpen}</Text>
                ) : null;
              })()}
            </View>
          </View>
        )}

        {/* Active orders */}
        {activeOrders.map(o => {
          const isDelivery = o.orderType === 'DELIVERY';
          const steps = isDelivery ? STEPS_DELIVERY : STEPS_PICKUP;
          const icons = isDelivery ? ICONS_DELIVERY : ICONS_PICKUP;
          const currentStep = (!isDelivery && o.status === 'READY')
            ? 2
            : (STATUS_STEP[o.status] ?? 0);
          let addressText = '';
          if (o.deliveryAddress) {
            try { const p = JSON.parse(o.deliveryAddress); addressText = [p.streetName, p.house].filter(Boolean).join(', '); }
            catch { addressText = o.deliveryAddress; }
          }
          const total = parseFloat(o.totalAmount) || 0;
          const summary: OrderSummary = {
            id: o.id,
            iikoNumber: o.iikoNumber,
            status: o.status,
            total,
            bonusesSpent: o.bonusesSpent ? parseFloat(o.bonusesSpent) : null,
            deliveryFee: o.deliveryFee ? parseFloat(o.deliveryFee) : null,
            promoDiscount: o.promoDiscount ? parseFloat(o.promoDiscount) : null,
            deliveryType: isDelivery ? 'delivery' : 'pickup',
            payment: o.paymentType === 'SCASH' ? 'cash' : 'kaspi',
            address: addressText,
            orderItems: (o.items ?? []).map(i => ({ name: (i as any).name || 'Позиция', qty: i.amount, total: i.price * i.amount })),
          };
          return (
            <TouchableOpacity key={o.id} activeOpacity={0.85} onPress={() => onOrderPress(summary)} style={styles.orderCardWrap}>
              <View style={styles.orderCard}>
                <View style={styles.orderHeader}>
                  <Text style={styles.orderTitle}>Активный заказ</Text>
                  <Text style={styles.orderNum}>
                    {o.iikoNumber != null ? `#${o.iikoNumber}` : '#...'}
                  </Text>
                </View>
                <View style={styles.stepperRow}>
                  {steps.map((step, i) => {
                    const done = i <= currentStep;
                    const isFirst = i === 0;
                    const isLast = i === steps.length - 1;
                    return (
                      <View key={step} style={styles.stepCol}>
                        <View style={styles.dotRow}>
                          <View style={[styles.stepLine, isFirst && styles.stepLineInvisible, done && !isFirst && styles.stepLineDone]} />
                          <View style={[styles.stepDot, done && styles.stepDotDone]}>
                            {icons[i].lib === 'mci'
                              ? <MaterialCommunityIcons name={icons[i].name as any} size={10} color={done ? '#fff' : 'rgba(255,255,255,0.3)'} />
                              : <Ionicons name={icons[i].name as any} size={10} color={done ? '#fff' : 'rgba(255,255,255,0.3)'} />
                            }
                          </View>
                          <View style={[styles.stepLine, isLast && styles.stepLineInvisible, i < currentStep && styles.stepLineDone]} />
                        </View>
                        <Text style={[styles.stepLabel, done && styles.stepLabelDone]}>{step}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Promo carousel */}
        {announcements.length > 0 && (
          <>
            <ScrollView
              ref={promoRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.promoContent}
              style={{ marginBottom: 12 }}
              onMomentumScrollEnd={(e) => {
                const rawIdx = Math.round(e.nativeEvent.contentOffset.x / PROMO_STEP);
                scrollPos.current = rawIdx;
                setPromoIdx(rawIdx % announcements.length);
                if (rawIdx >= announcements.length) {
                  setTimeout(() => {
                    promoRef.current?.scrollTo({ x: 0, animated: false });
                    scrollPos.current = 0;
                  }, 350);
                }
              }}
            >
              {(announcements.length > 1 ? [...announcements, announcements[0]] : announcements).map((a, idx) => (
                <TouchableOpacity
                  key={idx}
                  activeOpacity={0.88}
                  style={styles.promoCard}
                  onPress={() => setSelectedAnnouncement(a)}
                >
                  {a.imageUrl
                    ? <Image source={{ uri: a.imageUrl }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                    : <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(255,255,255,0.04)' }]} />
                  }
                </TouchableOpacity>
              ))}
            </ScrollView>

            {announcements.length > 1 && (
              <View style={styles.promoDots}>
                {announcements.map((_, i) => (
                  <View key={i} style={[styles.promoDot, i === promoIdx && styles.promoDotActive]} />
                ))}
              </View>
            )}
          </>
        )}

        {/* Categories */}
        {!dishLoading && dishes.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.catsContent}
          >
            {dynCats.map(c => (
              <TouchableOpacity key={c.id} onPress={() => setActiveCat(c.id)} activeOpacity={0.75}>
                <View style={[styles.catChip, activeCat === c.id && styles.catChipActive]}>
                  <Text style={[styles.catLabel, activeCat === c.id && styles.catLabelActive]}>
                    {c.label}
                  </Text>
                  <Text style={[styles.catCount, activeCat === c.id && styles.catCountActive]}>
                    {' '}{c.count}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Dish grid */}
        {dishLoading ? (
          <ActivityIndicator color={GREEN} size="large" style={{ marginTop: 40 }} />
        ) : (
          <View style={styles.grid}>
            {filtered.map((d) => {
              const isFav = favorites.has(d.id);
              const unavailable = d.isAvailable === false;
              return (
                <TouchableOpacity key={d.id} activeOpacity={unavailable ? 1 : 0.85} onPress={() => { if (!unavailable) onDishPress(d); }}>
                  <View style={[styles.dishCard, unavailable && styles.dishCardUnavailable]}>
                    <View>
                      {d.img
                        ? <Image source={d.img} style={[styles.dishImg, unavailable && { opacity: 0.35 }]} resizeMode="cover" />
                        : <View style={[styles.dishImg, { backgroundColor: 'rgba(255,255,255,0.04)' }, unavailable && { opacity: 0.35 }]} />
                      }
                      {unavailable && (
                        <View style={styles.unavailableOverlay}>
                          <Text style={styles.unavailableOverlayTxt}>Нет в наличии</Text>
                        </View>
                      )}
                      {!unavailable && (d.tags ?? []).length > 0 && (
                        <View style={styles.tagRow}>
                          {(d.tags ?? []).map(tag => {
                            const color = TAG_COLORS[tag.key] ?? '#555';
                            return (
                              <View key={tag.key} style={[styles.tagBadge, { backgroundColor: color }]}>
                                <Text style={styles.tagTxt}>{tag.label.toUpperCase()}</Text>
                              </View>
                            );
                          })}
                        </View>
                      )}
                      {!unavailable && (
                        <TouchableOpacity
                          style={styles.heartBtn}
                          onPress={() => toggleFavorite(d.id)}
                          activeOpacity={0.75}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons
                            name={isFav ? 'heart' : 'heart-outline'}
                            size={22}
                            color={isFav ? '#e05252' : 'rgba(255,255,255,0.6)'}
                          />
                        </TouchableOpacity>
                      )}
                    </View>
                    <View style={styles.dishBody}>
                      <Text style={[styles.dishName, unavailable && { opacity: 0.45 }]}>{d.name}</Text>
                      <Text style={[styles.dishWeight, unavailable && { opacity: 0.3 }]}>{d.weight}</Text>
                      <Text style={[styles.dishDesc, unavailable && { opacity: 0.25 }]} numberOfLines={3}>{d.desc}</Text>
                      <View style={[styles.priceBtn, unavailable && styles.priceBtnUnavailable]}>
                        <Text style={[styles.priceTxt, unavailable && styles.priceTxtUnavailable]}>
                          {unavailable ? 'Уже готовим' : d.price}
                        </Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

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

      {/* Announcement bottom sheet */}
      <Modal
        visible={!!selectedAnnouncement}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedAnnouncement(null)}
      >
        <TouchableOpacity
          style={styles.announcBackdrop}
          activeOpacity={1}
          onPress={() => setSelectedAnnouncement(null)}
        />
        {selectedAnnouncement && (
          <View style={styles.announcSheet}>
            <View style={styles.announcHandle} />
            {selectedAnnouncement.imageUrl && (
              <View style={[styles.announcImgWrap, { height: announcImgHeight }]}>
                <Image
                  source={{ uri: selectedAnnouncement.imageUrl }}
                  style={styles.announcImg}
                  resizeMode="cover"
                />
              </View>
            )}
            <View style={styles.announcBody}>
              <Text style={styles.announcTitle}>{selectedAnnouncement.title}</Text>
              {!!selectedAnnouncement.description && (
                <Text style={styles.announcText}>{selectedAnnouncement.description}</Text>
              )}
            </View>
          </View>
        )}
      </Modal>

      {/* Search sheet */}
      {searchOpen && (
        <Animated.View style={[styles.searchSheet, { transform: [{ translateY: slideAnim }] }]}>
          <StatusBar barStyle="light-content" />
          <View style={styles.sheetHeader}>
            <View style={styles.sheetInputRow}>
              <Ionicons name="search-outline" size={16} color="rgba(255,255,255,0.45)" style={{ marginRight: 8 }} />
              <TextInput
                ref={searchRef}
                style={styles.sheetInput}
                placeholder="Блюдо или ингредиент"
                placeholderTextColor="rgba(255,255,255,0.35)"
                value={search}
                onChangeText={setSearch}
                underlineColorAndroid="transparent"
                returnKeyType="search"
                autoFocus
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')} activeOpacity={0.7}>
                  <Ionicons name="close-circle" size={16} color="rgba(0,0,0,0.3)" />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity style={styles.sheetCancelBtn} onPress={closeSearch} activeOpacity={0.7}>
              <Text style={styles.sheetCancelTxt}>Отмена</Text>
            </TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.sheetResults}>
            {filtered.length === 0 && search.length > 0 && (
              <Text style={styles.sheetEmpty}>Ничего не найдено</Text>
            )}
            {filtered.map(dish => {
              const dishUnavailable = dish.isAvailable === false;
              return (
                <TouchableOpacity
                  key={dish.id}
                  style={styles.sheetDishRow}
                  activeOpacity={dishUnavailable ? 1 : 0.75}
                  onPress={() => { if (!dishUnavailable) { closeSearch(); onDishPress(dish); } }}
                >
                  {dish.img
                    ? <Image source={dish.img} style={[styles.sheetDishImg, dishUnavailable && { opacity: 0.4 }]} resizeMode="cover" />
                    : <View style={[styles.sheetDishImg, { backgroundColor: 'rgba(255,255,255,0.08)' }, dishUnavailable && { opacity: 0.4 }]} />
                  }
                  <View style={styles.sheetDishInfo}>
                    <Text style={[styles.sheetDishName, dishUnavailable && { opacity: 0.5 }]} numberOfLines={1}>{dish.name}</Text>
                    <Text style={[styles.sheetDishMeta, dishUnavailable && { opacity: 0.4 }]}>{dish.weight} · {dish.price}</Text>
                  </View>
                  {dishUnavailable
                    ? <View style={styles.sheetUnavailableBadge}><Text style={styles.sheetUnavailableTxt}>Нет в наличии</Text></View>
                    : <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.5)" />
                  }
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Animated.View>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f0707' },
  scroll: { paddingBottom: 140 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
  },
  restaurantName: { color: '#FFFFFF', fontWeight: '800', fontSize: 22 },
  addrRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4,
  },
  addrTxt: {
    color: 'rgba(255,255,255,0.6)', fontSize: 12,
    fontWeight: '500', flex: 1,
  },
  bellBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: GLASS_BG,
  },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 14,
    paddingVertical: 9,
    gap: 10,
    overflow: 'hidden',
    backgroundColor: GLASS_BG,
  },
  searchInput: { flex: 1, color: '#FFFFFF', fontSize: 15 },


  orderCardWrap: { marginHorizontal: 20, marginBottom: 16 },
  orderCard: {
    borderRadius: 16,
    padding: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(232,36,46,0.06)',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  orderTitle: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  orderNum: { color: GREEN, fontWeight: '600', fontSize: 14, fontStyle: 'italic' },
  stepperRow: { flexDirection: 'row' },
  stepCol: { flex: 1, alignItems: 'center' },
  dotRow: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  stepDot: { width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  stepDotDone: { backgroundColor: GREEN },
  stepLine: { flex: 1, height: 2, backgroundColor: 'rgba(255,255,255,0.12)' },
  stepLineInvisible: { backgroundColor: 'transparent' },
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
  promoTextWrap: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: 'rgba(0,0,0,0.45)' },
  promoTag: { color: GREEN, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 14 },
  promoTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', marginBottom: 4 },
  promoSub: { color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '500' },

  promoDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 4,
    marginBottom: 16,
  },
  promoDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.12)' },
  promoDotActive: { backgroundColor: GREEN, width: 18 },

  catsContent: { paddingHorizontal: 20, gap: 8, paddingBottom: 16 },
  catChip: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  catChipActive: { backgroundColor: '#4b4141' },
  catLabel: { color: 'rgba(255,255,255,0.6)', fontWeight: '600', fontSize: 13 },
  catLabelActive: { color: '#FFFFFF' },
  catCount: { color: 'rgba(255,255,255,0.3)', fontWeight: '500', fontSize: 13 },
  catCountActive: { color: 'rgba(255,255,255,0.7)' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, gap: 12 },
  dishCard: {
    width: (W - 52) / 2,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#191414',
  },
  dishImg: { width: '100%', height: 130 },
  tagRow: {
    position: 'absolute', top: 8, left: 8,
    flexDirection: 'column', gap: 4,
  },
  tagBadge: {
    borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  tagTxt: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },
  heartBtn: {
    position: 'absolute', top: 8, right: 8,
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center',
  },
  dishBody: { padding: 12 },
  dishName: { color: '#FFFFFF', fontWeight: '700', fontSize: 14, marginBottom: 2 },
  dishWeight: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginBottom: 6 },
  dishDesc: { color: 'rgba(255,255,255,0.5)', fontSize: 12, lineHeight: 16, marginBottom: 10 },
  priceBtn: {
    backgroundColor: '#4b4141',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
  },
  priceTxt: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  dishCardUnavailable: { opacity: 0.75 },
  priceBtnUnavailable: { backgroundColor: 'rgba(255,255,255,0.07)' },
  priceTxtUnavailable: { color: 'rgba(255,255,255,0.35)', fontWeight: '600', fontSize: 12 },
  unavailableOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
  },
  unavailableOverlayTxt: {
    color: '#fff', fontSize: 13, fontWeight: '700',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },

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
    overflow: 'hidden',
    backgroundColor: '#191414',
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
  badgeTxt: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },

  searchBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center', justifyContent: 'center',
  },

  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 10,
  },

  searchSheet: {
    position: 'absolute',
    top: 0, bottom: 0, left: 0, right: 0,
    backgroundColor: '#0D0D0D',
    zIndex: 11,
  },

  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 12,
  },

  sheetHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.15)',
    alignSelf: 'center',
    marginBottom: 16,
  },

  sheetInputRow: {
    flex: 1,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#161616',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },

  sheetInput: {
    flex: 1, fontSize: 14, color: '#FFFFFF',
  },

  sheetCancelBtn: {
    paddingVertical: 8,
  },

  sheetCancelTxt: {
    color: GREEN, fontSize: 15, fontWeight: '600',
  },

  sheetResults: { paddingHorizontal: 20, paddingBottom: 40 },

  sheetEmpty: {
    color: 'rgba(0,0,0,0.35)', fontSize: 14,
    textAlign: 'center', marginTop: 40,
  },

  sheetDishRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#161616',
    borderRadius: 14, padding: 10,
    marginBottom: 8, gap: 12,
  },

  sheetDishImg: {
    width: 52, height: 52, borderRadius: 10,
  },

  sheetDishInfo: { flex: 1 },

  sheetDishName: { color: '#FFFFFF', fontSize: 14, fontWeight: '600', marginBottom: 3 },
  sheetDishMeta: { color: 'rgba(255,255,255,0.45)', fontSize: 12 },
  sheetUnavailableBadge: {
    backgroundColor: 'rgba(224,82,82,0.15)',
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
  },
  sheetUnavailableTxt: { color: '#e05252', fontSize: 11, fontWeight: '700' },

  closedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: 'rgba(232,36,46,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(232,36,46,0.35)',
  },
  closedBannerTxt: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  closedBannerSub: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    marginTop: 3,
  },

  announcBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  announcSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#1a1d18',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    overflow: 'hidden',
    paddingBottom: 40,
  },
  announcHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center', marginTop: 12, marginBottom: 16,
  },
  announcImgWrap: { marginHorizontal: 20, borderRadius: 16, overflow: 'hidden' },
  announcImg:   { width: '100%', height: '100%' },
  announcBody:  { padding: 20, gap: 10 },
  announcTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },
  announcText:  { color: 'rgba(255,255,255,0.65)', fontSize: 15, lineHeight: 22 },
});
