import { useState } from 'react';
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
}

export interface CartItem {
  dish: DishData;
  qty: number;
  size: 's' | 'm' | 'l';
  extras: string[];
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
}

export default function App() {
  const [screen, setScreen]           = useState<Screen>('login');
  const [selectedDish, setSelectedDish] = useState<DishData | null>(null);
  const [cart, setCart]               = useState<CartItem[]>([]);
  const [orderInfo, setOrderInfo]     = useState<OrderInfo | null>(null);
  const [resDetails, setResDetails]   = useState<{ date: string; time: string; guests: number } | null>(null);
  const [profileName, setProfileName]     = useState('Алексей Морозов');
  const [banquetItems, setBanquetItems]   = useState<CartItem[]>([]);
  const [banquetDish, setBanquetDish]     = useState<DishData | null>(null);
  const [banquetTableId, setBanquetTableId] = useState<number | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<OrderSummary | null>(null);
  const [addresses, setAddresses]         = useState<string[]>([]);
  const [activeAddress, setActiveAddress] = useState('');
  const [addrReturn, setAddrReturn]       = useState<Screen>('addressBook');

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
          setAddresses(prev => prev.filter(a => a !== addr));
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
          setAddresses(prev => prev.includes(addr) ? prev : [...prev, addr]);
          setActiveAddress(addr);
          setScreen(addrReturn);
        }}
        onBack={() => setScreen(addrReturn)}
      />
    );
  }
  if (screen === 'checkout') {
    const total = cart.reduce((s, i) => {
      const base = parseInt(i.dish.price.replace(/\D/g, ''), 10);
      const delta = i.size === 's' ? -300 : i.size === 'l' ? 600 : 0;
      return s + (base + delta) * i.qty;
    }, 0) + 750;
    return (
      <CheckoutScreen
        total={total}
        address={activeAddress}
        onAddressPress={() => { setAddrReturn('checkout'); setScreen('addressBook'); }}
        onBack={() => setScreen('cart')}
        onSuccess={(deliveryType, payment) => {
          setOrderInfo({ total, deliveryType, payment });
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
      />
    );
  }
  if (screen === 'viewOrder' && selectedOrder) {
    return (
      <OrderSuccessScreen
        total={selectedOrder.total}
        deliveryType={selectedOrder.deliveryType}
        payment={selectedOrder.payment}
        onGoHome={() => setScreen('orders')}
      />
    );
  }
  if (screen === 'orders') {
    return (
      <OrdersScreen
        onBack={() => setScreen('profile')}
        onOrderPress={(order) => { setSelectedOrder(order); setScreen('viewOrder'); }}
      />
    );
  }
  if (screen === 'reserves') {
    return <ReservesScreen onBack={() => setScreen('profile')} />;
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
        onLogout={() => setScreen('login')}
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
        address={activeAddress}
      />
    );
  }
  return <LoginScreen onSuccess={(name) => { setProfileName(name); setScreen('home'); }} />;
}
