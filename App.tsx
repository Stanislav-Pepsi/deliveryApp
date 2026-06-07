import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useFonts } from 'expo-font';
import { addAddress, addressDisplay, deleteAddress, fetchAddresses, updateAddress } from './api/addresses';

const ADDR_KEY = 'basilic_addresses';
import { fetchLoyaltyBalance } from './api/loyalty';
import { RestaurantInfo, fetchRestaurantInfo } from './api/restaurant';
import AddressBookScreen from './screens/AddressBookScreen';
import AddressPickerScreen from './screens/AddressPickerScreen';
import BanquetMenuScreen from './screens/BanquetMenuScreen';
import ProfileScreen from './screens/ProfileScreen';
import CartScreen from './screens/CartScreen';
import CheckoutScreen from './screens/CheckoutScreen';
import DishDetailScreen from './screens/DishDetailScreen';
import HomeScreen from './screens/HomeScreen';
import LoginScreen from './screens/LoginScreen';
import OrderSuccessScreen from './screens/OrderSuccessScreen';
import OrdersScreen, { OrderSummary } from './screens/OrdersScreen';
import LoyaltyScreen from './screens/LoyaltyScreen';
import FavoritesScreen from './screens/FavoritesScreen';
import ReservationDetailScreen from './screens/ReservationDetailScreen';
import ReservationScreen from './screens/ReservationScreen';
import ReservationSuccessScreen, { ReservationResult } from './screens/ReservationSuccessScreen';
import ReservesScreen from './screens/ReservesScreen';
import { MappedReserve } from './screens/ReservesScreen';
import TableSelectionScreen from './screens/TableSelectionScreen';
import { fetchFavorites, addFavorite, removeFavorite } from './api/favorites';
import AnnouncementsScreen from './screens/AnnouncementsScreen';
import { usePushNotifications, NotifData } from './hooks/usePushNotifications';

export interface DishTag {
  key: string;
  label: string;
  imageUrl: string | null;
  image_url?: string | null;
}

export interface DishModifier {
  id: string;
  name: string;
  price: number;
}

export interface DishModifierGroup {
  name: string;
  groupId: string | null;
  minQuantity: number;
  maxQuantity: number;
  modifiers: DishModifier[];
}

export interface DishSize {
  sizeId: string | null;
  sizeName: string;
  isDefault: boolean;
  price: number;
  portionWeightGrams: number | null;
  energy: number;
  modifierGroups: DishModifierGroup[];
}

export interface DishData {
  id: string;
  name: string;
  weight: string;
  desc: string;
  price: string;
  img: any;
  category: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  time: string;
  sizeId?: string;
  sizes: DishSize[];
  tags?: DishTag[];
  isAvailable: boolean;
}

export interface OrderDisplayItem {
  name: string;
  meta?: string;
  qty: number;
  total: number;
}

export interface SelectedExtra {
  id: string;
  name: string;
  price: number;
  groupId: string | null;
}

export interface CartItem {
  dish: DishData;
  qty: number;
  size: string;
  sizeName: string;
  unitPrice: number;
  extras: SelectedExtra[];
}

type Screen =
  | 'login' | 'home' | 'dish' | 'cart' | 'checkout' | 'success'
  | 'reservation' | 'tableSelection' | 'reservationSuccess' | 'reservationDetail' | 'banquetMenu' | 'banquetDish'
  | 'profile' | 'orders' | 'viewOrder' | 'reserves' | 'loyalty'
  | 'addressBook' | 'addressPicker' | 'favorites' | 'announcements';

interface OrderInfo {
  total: number;
  bonusesSpent?: number;
  deliveryFee?: number;
  promoDiscount?: number;
  deliveryType: 'delivery' | 'pickup';
  payment: 'kaspi' | 'cash';
  address: string;
  orderId: string;
  orderItems: OrderDisplayItem[];
}

export default function App() {
  const [fontsLoaded] = useFonts({
    'Nunito': require('./assets/fonts/ofont.ru_Nunito.ttf'),
  });

  const [screen, setScreen]           = useState<Screen>('login');
  const [selectedDish, setSelectedDish] = useState<DishData | null>(null);
  const [cart, setCart]               = useState<CartItem[]>([]);
  const [orderInfo, setOrderInfo]     = useState<OrderInfo | null>(null);
  const [resDetails, setResDetails]         = useState<{ date: string; time: string; guests: number; bookType: 'table' | 'banquet' } | null>(null);
  const [reservationResult, setReservationResult]   = useState<ReservationResult | null>(null);
  const [selectedReserve, setSelectedReserve]       = useState<MappedReserve | null>(null);
  const [profileName, setProfileName]     = useState('Алексей Морозов');
  const [banquetItems, setBanquetItems]   = useState<CartItem[]>([]);
  const [banquetDish, setBanquetDish]     = useState<DishData | null>(null);
  const [banquetTableId, setBanquetTableId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<OrderSummary | null>(null);
  const [cartBonuses, setCartBonuses]         = useState(0);
  const [cartPromo, setCartPromo]             = useState<string | undefined>(undefined);
  const [cartPromoDiscount, setCartPromoDiscount] = useState(0);
  const [addresses, setAddresses]         = useState<string[]>([]);
  const [activeAddress, setActiveAddress] = useState('');
  const [addrReturn, setAddrReturn]       = useState<Screen>('addressBook');
  const [editingAddrDisplay, setEditingAddrDisplay] = useState<string | null>(null);
  const [authToken, setAuthToken]         = useState<string | null>(null);
  const [addressIdMap, setAddressIdMap]   = useState<Record<string, string>>({});
  const [addressLabelMap, setAddressLabelMap] = useState<Record<string, string>>({});
  const [userPhone, setUserPhone]         = useState('');
  const [dishes, setDishes]               = useState<DishData[]>([]);
  const [restaurantInfo, setRestaurantInfo] = useState<RestaurantInfo | null>(null);
  const [loyaltyBalance, setLoyaltyBalance] = useState<number | null>(null);
  const [favorites, setFavorites]         = useState<Set<string>>(new Set());

  const toggleFavorite = (id: string) => {
    if (!authToken) return;
    const isFav = favorites.has(id);
    setFavorites(prev => { const next = new Set(prev); isFav ? next.delete(id) : next.add(id); return next; });
    if (isFav) {
      removeFavorite(id, authToken).catch(() => {
        setFavorites(prev => { const next = new Set(prev); next.add(id); return next; });
      });
    } else {
      addFavorite(id, authToken).catch(() => {
        setFavorites(prev => { const next = new Set(prev); next.delete(id); return next; });
      });
    }
  };

  useEffect(() => {
    AsyncStorage.getItem(ADDR_KEY).then(raw => {
      if (!raw) return;
      try {
        const { addresses: a, addressIdMap: m, activeAddress: active } = JSON.parse(raw);
        if (Array.isArray(a) && a.length > 0) {
          setAddresses(a);
          setAddressIdMap(m ?? {});
          setActiveAddress(active ?? a[0]);
        }
      } catch {}
    });
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(ADDR_KEY, JSON.stringify({ addresses, addressIdMap, activeAddress }));
  }, [addresses, addressIdMap, activeAddress]);

  const refreshBalance = (token: string) => {
    setLoyaltyBalance(null);
    fetchLoyaltyBalance(token).then(b => setLoyaltyBalance(b.balance)).catch(() => {});
  };

  useEffect(() => {
    if (!authToken) return;
    refreshBalance(authToken);
  }, [authToken]);

  const handleNotifNavigate = (data: NotifData) => {
    switch (data.type) {
      case 'order':
      case 'new_order':
        setScreen('orders');
        break;
      case 'reservation':
        setScreen('reserves');
        break;
      case 'loyalty':
        setScreen('loyalty');
        break;
      case 'announcement':
        setScreen('announcements');
        break;
    }
  };

  const { unregisterToken } = usePushNotifications(authToken, handleNotifNavigate);

  const addToCart = (item: CartItem) => {
    setCart(prev => {
      const idx = prev.findIndex(i => i.dish.id === item.dish.id && i.size === item.size);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], qty: updated[idx].qty + item.qty };
        return updated;
      }
      return [...prev, item];
    });
  };

  const extrasKey = (extras: SelectedExtra[]) => extras.map(e => e.id).sort().join(',');
  const addToBanquet = (item: CartItem) => {
    setBanquetItems(prev => {
      const idx = prev.findIndex(i =>
        i.dish.id === item.dish.id &&
        i.size === item.size &&
        extrasKey(i.extras) === extrasKey(item.extras)
      );
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], qty: updated[idx].qty + item.qty };
        return updated;
      }
      return [...prev, item];
    });
  };

  const updateCartQty = (dishId: string, size: string, qty: number) => {
    setCart(prev =>
      qty <= 0
        ? prev.filter(i => !(i.dish.id === dishId && i.size === size))
        : prev.map(i => i.dish.id === dishId && i.size === size ? { ...i, qty } : i)
    );
  };

  if (!fontsLoaded) return null;

  if (screen === 'banquetDish' && banquetDish) {
    return (
      <DishDetailScreen
        dish={banquetDish}
        onBack={() => setScreen('banquetMenu')}
        onAddToCart={(item) => { addToBanquet(item); setScreen('banquetMenu'); }}
      />
    );
  }
  if (screen === 'banquetMenu') {
    return (
      <BanquetMenuScreen
        dishes={dishes}
        authToken={authToken}
        items={banquetItems}
        serviceChargePercent={restaurantInfo?.serviceChargePercent ?? 0}
        onUpdateQty={(index, qty) => {
          setBanquetItems(prev =>
            qty <= 0
              ? prev.filter((_, i) => i !== index)
              : prev.map((item, i) => i === index ? { ...item, qty } : item)
          );
        }}
        onBack={() => setScreen('tableSelection')}
        onDishPress={(dish) => { setBanquetDish(dish); setScreen('banquetDish'); }}
        onDone={() => setScreen('tableSelection')}
      />
    );
  }
  if (screen === 'success' && orderInfo) {
    return (
      <OrderSuccessScreen
        total={orderInfo.total}
        bonusesSpent={orderInfo.bonusesSpent}
        deliveryFee={orderInfo.deliveryFee}
        promoDiscount={orderInfo.promoDiscount}
        deliveryType={orderInfo.deliveryType}
        payment={orderInfo.payment}
        address={orderInfo.address}
        orderId={orderInfo.orderId}
        initialStatus="CREATED"
        orderItems={orderInfo.orderItems}
        authToken={authToken}
        restaurantInfo={restaurantInfo}
        onGoHome={() => { setOrderInfo(null); setScreen('home'); }}
      />
    );
  }
  if (screen === 'addressBook') {
    return (
      <AddressBookScreen
        addresses={addresses}
        activeAddress={activeAddress}
        labelMap={addressLabelMap}
        onSelect={(addr) => { setActiveAddress(addr); setScreen('addressBook'); }}
        onDelete={(addr) => {
          const id = addressIdMap[addr];
          if (id && authToken) deleteAddress(id, authToken).catch(() => {});
          setAddresses(prev => prev.filter(a => a !== addr));
          setAddressIdMap(prev => { const n = { ...prev }; delete n[addr]; return n; });
          if (activeAddress === addr) setActiveAddress('');
        }}
        onEdit={(addr) => { setEditingAddrDisplay(addr); setAddrReturn('addressBook'); setScreen('addressPicker'); }}
        onAddNew={() => { setEditingAddrDisplay(null); setAddrReturn('addressBook'); setScreen('addressPicker'); }}
        onBack={() => setScreen(addrReturn)}
      />
    );
  }
  if (screen === 'addressPicker') {
    const editId = editingAddrDisplay ? addressIdMap[editingAddrDisplay] : null;
    return (
      <AddressPickerScreen
        initialAddress={editingAddrDisplay ?? ''}
        initialLabel={editingAddrDisplay ? addressLabelMap[editingAddrDisplay] : undefined}
        onSave={(input, display) => {
          if (authToken) {
            if (editId) {
              updateAddress(editId, input, authToken).then(saved => {
                const newLabel = saved.label ?? undefined;
                setAddresses(prev => prev.map(a => a === editingAddrDisplay ? display : a));
                setAddressIdMap(prev => { const n = { ...prev }; delete n[editingAddrDisplay!]; n[display] = saved.id; return n; });
                setAddressLabelMap(prev => { const n = { ...prev }; delete n[editingAddrDisplay!]; if (newLabel) n[display] = newLabel; return n; });
                if (activeAddress === editingAddrDisplay) setActiveAddress(display);
              }).catch(() => {});
            } else {
              addAddress(input, authToken).then(saved => {
                setAddressIdMap(prev => ({ ...prev, [display]: saved.id }));
                if (saved.label) setAddressLabelMap(prev => ({ ...prev, [display]: saved.label! }));
              }).catch(() => {});
            }
          }
          if (!editId) {
            setAddresses(prev => prev.includes(display) ? prev : [...prev, display]);
            setActiveAddress(display);
          }
          setEditingAddrDisplay(null);
          setScreen(addrReturn);
        }}
        onBack={() => { setEditingAddrDisplay(null); setScreen(addrReturn); }}
      />
    );
  }
  if (screen === 'checkout') {
    const subtotal = cart.reduce((s, i) => s + i.unitPrice * i.qty, 0);
    return (
      <CheckoutScreen
        subtotal={subtotal}
        deliveryFeeAmount={restaurantInfo?.deliveryFeeAmount}
        address={activeAddress}
        addressId={addressIdMap[activeAddress]}
        authToken={authToken}
        phone={userPhone}
        cartItems={cart}
        onAddressPress={() => { setAddrReturn('checkout'); setScreen('addressBook'); }}
        initialBonuses={cartBonuses}
        promoCode={cartPromo}
        promoDiscount={cartPromoDiscount}
        cashbackPercent={restaurantInfo?.cashbackPercent}
        restaurantInfo={restaurantInfo}
        onBack={() => setScreen('cart')}
        onSuccess={(deliveryType, payment, orderId, bonusesSpent, deliveryFee, promoDiscount) => {
          const total = subtotal + deliveryFee;
          setOrderInfo({ total, bonusesSpent: bonusesSpent || 0, deliveryFee, promoDiscount: promoDiscount || 0, deliveryType, payment, address: deliveryType === 'delivery' ? activeAddress : '', orderId, orderItems: cart.map(i => ({ name: i.dish.name, meta: [i.sizeName, ...i.extras.map(e => e.name)].filter(Boolean).join(' · ') || undefined, qty: i.qty, total: i.unitPrice * i.qty })) });
          setCart([]);
          if (authToken) refreshBalance(authToken);
          setScreen('success');
        }}
      />
    );
  }
  if (screen === 'cart') {
    return (
      <CartScreen
        items={cart}
        dishes={dishes}
        onUpdateQty={updateCartQty}
        onBack={() => setScreen('home')}
        onCheckout={(bonuses, promo, discount) => { setCartBonuses(bonuses); setCartPromo(promo); setCartPromoDiscount(discount ?? 0); setScreen('checkout'); }}
        loyaltyBalance={loyaltyBalance}
        deliveryFeeAmount={restaurantInfo?.deliveryFeeAmount}
        authToken={authToken}
      />
    );
  }
  if (screen === 'reservation') {
    return (
      <ReservationScreen
        onBack={() => setScreen('home')}
        onNext={(date, time, guests, bookType) => {
          setResDetails({ date, time, guests, bookType });
          setScreen('tableSelection');
        }}
        restaurantInfo={restaurantInfo}
        initialDate={resDetails?.date}
        initialTime={resDetails?.time}
        initialBookType={resDetails?.bookType}
      />
    );
  }
  if (screen === 'tableSelection' && resDetails) {
    return (
      <TableSelectionScreen
        date={resDetails.date}
        time={resDetails.time}
        guests={resDetails.guests}
        bookType={resDetails.bookType}
        banquetItems={banquetItems.map(i => ({
          productId: i.dish.id,
          amount: i.qty,
          price: i.unitPrice,
          sizeId: i.size || undefined,
          modifiers: i.extras.length > 0 ? i.extras.map(e => ({
            productId: e.id,
            amount: 1,
            price: e.price > 0 ? e.price : undefined,
            productGroupId: e.groupId,
          })) : undefined,
        }))}
        banquetTotal={banquetItems.reduce((s, i) => s + i.unitPrice * i.qty, 0)}
        serviceChargePercent={restaurantInfo?.serviceChargePercent ?? 0}
        phone={userPhone}
        tableId={banquetTableId}
        onTableChange={setBanquetTableId}
        onBack={() => setScreen('reservation')}
        onBanquetMenu={() => setScreen('banquetMenu')}
        onConfirm={({ reservationId, tableName, tableNumber, sectionName, guests, comment }) => {
          setReservationResult({
            reservationId,
            tableName,
            tableNumber,
            sectionName,
            date: resDetails!.date,
            time: resDetails!.time,
            guests,
            bookType: resDetails!.bookType,
            comment,
            banquetItems: resDetails!.bookType === 'banquet' ? banquetItems.map(i => ({
              name: i.dish.name,
              sizeName: i.sizeName,
              extras: i.extras.map(e => e.name),
              unitPrice: i.unitPrice,
              qty: i.qty,
            })) : undefined,
          });
          setBanquetItems([]);
          setBanquetTableId(null);
          setScreen('reservationSuccess');
        }}
        authToken={authToken}
      />
    );
  }
  if (screen === 'reservationSuccess' && reservationResult) {
    return (
      <ReservationSuccessScreen
        result={reservationResult}
        authToken={authToken}
        restaurantInfo={restaurantInfo}
        onGoHome={() => { setReservationResult(null); setResDetails(null); setScreen('home'); }}
        onConfirmed={() => { setReservationResult(null); setResDetails(null); setScreen('reserves'); }}
      />
    );
  }
  if (screen === 'reservationDetail' && selectedReserve) {
    return (
      <ReservationDetailScreen
        reserve={selectedReserve}
        authToken={authToken}
        restaurantInfo={restaurantInfo}
        onBack={() => setScreen('reserves')}
        onCancelled={() => { setSelectedReserve(null); setScreen('reserves'); }}
      />
    );
  }
  if (screen === 'viewOrder' && selectedOrder) {
    return (
      <OrderSuccessScreen
        total={selectedOrder.total}
        bonusesSpent={selectedOrder.bonusesSpent}
        promoDiscount={selectedOrder.promoDiscount}
        deliveryFee={selectedOrder.deliveryFee}
        deliveryType={selectedOrder.deliveryType}
        payment={selectedOrder.payment}
        address={selectedOrder.address}
        orderId={selectedOrder.id}
        initialStatus={selectedOrder.status}
        iikoNumber={selectedOrder.iikoNumber}
        orderItems={selectedOrder.orderItems}
        createdAt={selectedOrder.createdAt}
        authToken={authToken}
        mode="view"
        restaurantInfo={restaurantInfo}
        onGoHome={() => setScreen('orders')}
      />
    );
  }
  if (screen === 'orders') {
    return (
      <OrdersScreen
        onBack={() => setScreen('profile')}
        onOrderPress={(order) => { setSelectedOrder(order); setScreen('viewOrder'); }}
        authToken={authToken}
        dishes={dishes}
      />
    );
  }
  if (screen === 'favorites') {
    return (
      <FavoritesScreen
        dishes={dishes}
        favorites={favorites}
        onDishPress={(dish) => { setSelectedDish(dish); setScreen('dish'); }}
        onToggleFavorite={toggleFavorite}
        onBack={() => setScreen('profile')}
      />
    );
  }
  if (screen === 'announcements') {
    return <AnnouncementsScreen onBack={() => setScreen('home')} />;
  }
  if (screen === 'loyalty') {
    return (
      <LoyaltyScreen
        onBack={() => setScreen('profile')}
        authToken={authToken}
      />
    );
  }
  if (screen === 'reserves') {
    return <ReservesScreen
      onBack={() => setScreen('profile')}
      authToken={authToken}
      onReservationPress={r => { setSelectedReserve(r); setScreen('reservationDetail'); }}
    />;
  }
  if (screen === 'profile') {
    return (
      <ProfileScreen
        name={profileName}
        onNameChange={setProfileName}
        onNameSave={async (name) => {
          if (!authToken) return;
          const { updateProfile } = await import('./api/auth');
          const res = await updateProfile(name, authToken);
          if (res.accessToken) setAuthToken(res.accessToken);
        }}
        authToken={authToken}
        cartCount={cart.reduce((s, i) => s + i.qty, 0)}
        onGoHome={() => setScreen('home')}
        onReservationPress={() => setScreen('reservation')}
        onCartPress={() => setScreen('cart')}
        phone={userPhone}
        loyaltyBalance={loyaltyBalance}
        onLoyaltyPress={() => setScreen('loyalty')}
        onFavoritesPress={() => setScreen('favorites')}
        onLogout={() => {
          unregisterToken();
          setAuthToken(null);
          setAddresses([]);
          setAddressIdMap({});
          setActiveAddress('');
          setRestaurantInfo(null);
          setLoyaltyBalance(null);
          setFavorites(new Set());
          AsyncStorage.removeItem(ADDR_KEY);
          setScreen('login');
        }}
        onOrdersPress={() => setScreen('orders')}
        onReservesPress={() => setScreen('reserves')}
        onAddressPress={() => { setAddrReturn('profile'); setScreen('addressBook'); }}
        address={activeAddress}
      />
    );
  }
  if (screen === 'home' || screen === 'dish') {
    return (
      <View style={{ flex: 1 }}>
        <HomeScreen
          cartCount={cart.reduce((s, i) => s + i.qty, 0)}
          onDishPress={(dish) => { setSelectedDish(dish); setScreen('dish'); }}
          onCartPress={() => setScreen('cart')}
          onReservationPress={() => setScreen('reservation')}
          onProfilePress={() => { if (authToken) refreshBalance(authToken); setScreen('profile'); }}
          onOrderPress={(order) => { setSelectedOrder(order); setScreen('viewOrder'); }}
          onAddressPress={() => { setAddrReturn('home'); setScreen('addressBook'); }}
          address={activeAddress}
          authToken={authToken}
          onDishesLoaded={setDishes}
          restaurantInfo={restaurantInfo}
          favorites={favorites}
          onToggleFavorite={toggleFavorite}
          onAnnouncementsPress={() => setScreen('announcements')}
        />
        {screen === 'dish' && selectedDish && (
          <View style={StyleSheet.absoluteFill}>
            <DishDetailScreen
              dish={selectedDish}
              onBack={() => setScreen('home')}
              onAddToCart={(item) => { addToCart(item); setScreen('home'); }}
            />
          </View>
        )}
      </View>
    );
  }
  return <LoginScreen onSuccess={(name, token, phone) => {
    setProfileName(name);
    setAuthToken(token);
    setUserPhone(phone);
    fetchAddresses(token).then(addrs => {
      const texts = addrs.map(a => addressDisplay(a));
      const map: Record<string, string> = {};
      const labelMap: Record<string, string> = {};
      addrs.forEach(a => {
        map[addressDisplay(a)] = a.id;
        if (a.label) labelMap[addressDisplay(a)] = a.label;
      });
      setAddresses(texts);
      setAddressIdMap(map);
      setAddressLabelMap(labelMap);
      if (texts.length > 0) setActiveAddress(texts[0]);
    }).catch(() => {});
    fetchRestaurantInfo(token).then(setRestaurantInfo).catch(() => {});
    fetchFavorites(token).then(setFavorites).catch(() => {});
    setScreen('home');
  }} />;
}
