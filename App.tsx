import { useState } from 'react';
import { useFonts } from 'expo-font';
import { addAddress, deleteAddress, fetchAddresses } from './api/addresses';
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
import ReservationScreen from './screens/ReservationScreen';
import ReservesScreen from './screens/ReservesScreen';
import TableSelectionScreen from './screens/TableSelectionScreen';

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
  | 'reservation' | 'tableSelection' | 'banquetMenu' | 'banquetDish'
  | 'profile' | 'orders' | 'viewOrder' | 'reserves'
  | 'addressBook' | 'addressPicker';

interface OrderInfo {
  total: number;
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
  const [resDetails, setResDetails]   = useState<{ date: string; time: string; guests: number } | null>(null);
  const [profileName, setProfileName]     = useState('Алексей Морозов');
  const [banquetItems, setBanquetItems]   = useState<CartItem[]>([]);
  const [banquetDish, setBanquetDish]     = useState<DishData | null>(null);
  const [banquetTableId, setBanquetTableId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<OrderSummary | null>(null);
  const [addresses, setAddresses]         = useState<string[]>([]);
  const [activeAddress, setActiveAddress] = useState('');
  const [addrReturn, setAddrReturn]       = useState<Screen>('addressBook');
  const [authToken, setAuthToken]         = useState<string | null>(null);
  const [addressIdMap, setAddressIdMap]   = useState<Record<string, string>>({});
  const [userPhone, setUserPhone]         = useState('');
  const [dishes, setDishes]               = useState<DishData[]>([]);

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

  const addToBanquet = (item: CartItem) => {
    setBanquetItems(prev => {
      const idx = prev.findIndex(i => i.dish.id === item.dish.id && i.size === item.size);
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

  if (screen === 'dish' && selectedDish) {
    return (
      <DishDetailScreen
        dish={selectedDish}
        onBack={() => setScreen('home')}
        onAddToCart={(item) => { addToCart(item); setScreen('home'); }}
      />
    );
  }
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
        items={banquetItems}
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
        deliveryType={orderInfo.deliveryType}
        payment={orderInfo.payment}
        address={orderInfo.address}
        orderId={orderInfo.orderId}
        initialStatus={orderInfo.payment === 'kaspi' ? 'IN_PROGRESS' : 'CREATED'}
        orderItems={orderInfo.orderItems}
        authToken={authToken}
        onGoHome={() => { setOrderInfo(null); setScreen('home'); }}
      />
    );
  }
  if (screen === 'addressBook') {
    return (
      <AddressBookScreen
        addresses={addresses}
        activeAddress={activeAddress}
        onSelect={(addr) => { setActiveAddress(addr); setScreen('addressBook'); }}
        onDelete={(addr) => {
          const id = addressIdMap[addr];
          if (id && authToken) deleteAddress(id, authToken).catch(() => {});
          setAddresses(prev => prev.filter(a => a !== addr));
          setAddressIdMap(prev => { const n = { ...prev }; delete n[addr]; return n; });
          if (activeAddress === addr) setActiveAddress('');
        }}
        onAddNew={() => { setAddrReturn('addressBook'); setScreen('addressPicker'); }}
        onBack={() => setScreen('profile')}
      />
    );
  }
  if (screen === 'addressPicker') {
    return (
      <AddressPickerScreen
        initialAddress=""
        onSave={(addr) => {
          if (authToken) {
            addAddress(addr, authToken).then(saved => {
              setAddressIdMap(prev => ({ ...prev, [addr]: saved.id }));
            }).catch(() => {});
          }
          setAddresses(prev => prev.includes(addr) ? prev : [...prev, addr]);
          setActiveAddress(addr);
          setScreen(addrReturn);
        }}
        onBack={() => setScreen(addrReturn)}
      />
    );
  }
  if (screen === 'checkout') {
    const total = cart.reduce((s, i) => s + i.unitPrice * i.qty, 0) + 750;
    return (
      <CheckoutScreen
        total={total}
        address={activeAddress}
        authToken={authToken}
        phone={userPhone}
        cartItems={cart}
        onAddressPress={() => { setAddrReturn('checkout'); setScreen('addressBook'); }}
        onBack={() => setScreen('cart')}
        onSuccess={(deliveryType, payment, orderId) => {
          setOrderInfo({ total, deliveryType, payment, address: deliveryType === 'delivery' ? activeAddress : '', orderId, orderItems: cart.map(i => ({ name: i.dish.name, meta: [i.sizeName, ...i.extras.map(e => e.name)].filter(Boolean).join(' · ') || undefined, qty: i.qty, total: i.unitPrice * i.qty })) });
          setCart([]);
          setScreen('success');
        }}
      />
    );
  }
  if (screen === 'cart') {
    return (
      <CartScreen
        items={cart}
        onUpdateQty={updateCartQty}
        onBack={() => setScreen('home')}
        onCheckout={() => setScreen('checkout')}
      />
    );
  }
  if (screen === 'reservation') {
    return (
      <ReservationScreen
        onBack={() => setScreen('home')}
        onNext={(date, time, guests) => {
          setResDetails({ date, time, guests });
          setScreen('tableSelection');
        }}
      />
    );
  }
  if (screen === 'tableSelection' && resDetails) {
    return (
      <TableSelectionScreen
        date={resDetails.date}
        time={resDetails.time}
        guests={resDetails.guests}
        dishCount={banquetItems.reduce((s, i) => s + i.qty, 0)}
        tableId={banquetTableId}
        onTableChange={setBanquetTableId}
        onAddDishesPress={() => setScreen('banquetMenu')}
        onBack={() => setScreen('reservation')}
        onConfirm={() => { setBanquetItems([]); setBanquetTableId(null); setScreen('home'); }}
        authToken={authToken}
      />
    );
  }
  if (screen === 'viewOrder' && selectedOrder) {
    return (
      <OrderSuccessScreen
        total={selectedOrder.total}
        deliveryType={selectedOrder.deliveryType}
        payment={selectedOrder.payment}
        address={selectedOrder.address}
        orderId={selectedOrder.id}
        initialStatus={selectedOrder.status}
        iikoNumber={selectedOrder.iikoNumber}
        orderItems={selectedOrder.orderItems}
        authToken={authToken}
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
  if (screen === 'reserves') {
    return <ReservesScreen onBack={() => setScreen('profile')} authToken={authToken} />;
  }
  if (screen === 'profile') {
    return (
      <ProfileScreen
        name={profileName}
        onNameChange={setProfileName}
        cartCount={cart.reduce((s, i) => s + i.qty, 0)}
        onGoHome={() => setScreen('home')}
        onReservationPress={() => setScreen('reservation')}
        onCartPress={() => setScreen('cart')}
        onLogout={() => {
          setAuthToken(null);
          setAddresses([]);
          setAddressIdMap({});
          setActiveAddress('');
          setScreen('login');
        }}
        onOrdersPress={() => setScreen('orders')}
        onReservesPress={() => setScreen('reserves')}
        onAddressPress={() => setScreen('addressBook')}
        address={activeAddress}
      />
    );
  }
  if (screen === 'home') {
    return (
      <HomeScreen
        cartCount={cart.reduce((s, i) => s + i.qty, 0)}
        onDishPress={(dish) => { setSelectedDish(dish); setScreen('dish'); }}
        onCartPress={() => setScreen('cart')}
        onReservationPress={() => setScreen('reservation')}
        onProfilePress={() => setScreen('profile')}
        onOrderPress={(order) => { setSelectedOrder(order); setScreen('viewOrder'); }}
        address={activeAddress}
        authToken={authToken}
        onDishesLoaded={setDishes}
      />
    );
  }
  return <LoginScreen onSuccess={(name, token, phone) => {
    setProfileName(name);
    setAuthToken(token);
    setUserPhone(phone);
    fetchAddresses(token).then(addrs => {
      const texts = addrs.map(a => a.fullAddress);
      const map: Record<string, string> = {};
      addrs.forEach(a => { map[a.fullAddress] = a.id; });
      setAddresses(texts);
      setAddressIdMap(map);
      if (texts.length > 0) setActiveAddress(texts[0]);
    }).catch(() => {});
    setScreen('home');
  }} />;
}
