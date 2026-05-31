import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useState } from 'react';
import {
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Text from '../components/Text';

const GREEN      = '#8DBB00';
const GREEN_DARK = '#4a6600';
const BG         = '#0c0f0a';
const CARD       = 'rgba(255,255,255,0.06)';
const BORDER     = 'rgba(255,255,255,0.1)';
const SHEET_BG   = '#161a13';
const RED        = '#e05252';

const MENU = [
  { key: 'address',   icon: 'location-outline' as const, label: 'Адрес',        sub: null },
  { key: 'orders',    icon: 'receipt-outline'  as const, label: 'Мои заказы',   sub: null },
  { key: 'favorites', icon: 'heart-outline'    as const, label: 'Избранное',    sub: null },
  { key: 'reserves',  icon: 'calendar-outline' as const, label: 'Мои резервы',  sub: null },
];

const NAV = [
  { key: 'home', label: 'Главная', icon: 'home-outline'     as const, iconActive: 'home'     as const },
  { key: 'res',  label: 'Резервы', icon: 'calendar-outline' as const, iconActive: 'calendar' as const },
  { key: 'cart', label: 'Корзина', icon: 'bag-outline'      as const, iconActive: 'bag'      as const },
  { key: 'prof', label: 'Профиль', icon: 'person-outline'   as const, iconActive: 'person'   as const },
];

interface Props {
  name: string;
  onNameChange: (n: string) => void;
  onNameSave?: (n: string) => Promise<void>;
  authToken?: string | null;
  cartCount: number;
  onGoHome: () => void;
  onReservationPress: () => void;
  onCartPress: () => void;
  onLogout: () => void;
  onOrdersPress: () => void;
  onReservesPress: () => void;
  onAddressPress: () => void;
  onLoyaltyPress: () => void;
  onFavoritesPress: () => void;
  address?: string;
  phone?: string;
  loyaltyBalance?: number | null;
}

export default function ProfileScreen({
  name, onNameChange, onNameSave, cartCount, authToken, onGoHome, onReservationPress, onCartPress, onLogout,
  onOrdersPress, onReservesPress, onAddressPress, onLoyaltyPress, onFavoritesPress, address, phone, loyaltyBalance,
}: Props) {
  const [editOpen, setEditOpen] = useState(false);
  const [draft, setDraft]       = useState('');

  const openEdit = () => { setDraft(name); setEditOpen(true); };
  const saveName = () => {
    if (!draft.trim()) return;
    onNameChange(draft.trim());
    onNameSave?.(draft.trim()).catch(() => {});
    setEditOpen(false);
  };

  const initial = name.trim().charAt(0).toUpperCase();

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerSub}>АККАУНТ</Text>
          <Text style={styles.headerTitle}>Профиль</Text>
        </View>

        {/* Profile card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarTxt}>{initial}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <TouchableOpacity style={styles.nameRow} onPress={openEdit} activeOpacity={0.7}>
              <Text style={styles.profileName} numberOfLines={1}>{name}</Text>
              <Ionicons name="pencil-outline" size={14} color="rgba(255,255,255,0.3)" style={{ marginLeft: 7, marginTop: 2 }} />
            </TouchableOpacity>
            {!!phone && <Text style={styles.profilePhone}>{phone}</Text>}
          </View>
        </View>

        {/* Loyalty balance card */}
        {loyaltyBalance !== null && (
          <TouchableOpacity style={styles.loyaltyCard} onPress={onLoyaltyPress} activeOpacity={0.8}>
            <View style={styles.loyaltyLeft}>
              <Ionicons name="star" size={22} color={GREEN} />
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.loyaltyLabel}>Ваши бонусы</Text>
                <Text style={styles.loyaltyVal}>{String(loyaltyBalance)} бонусов</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={17} color="rgba(255,255,255,0.2)" />
          </TouchableOpacity>
        )}

        {/* Menu */}
        <View style={styles.menuCard}>
          {MENU.map((item, idx) => (
            <TouchableOpacity
              key={item.key}
              style={[styles.menuRow, idx < MENU.length - 1 && styles.menuRowDivider]}
              activeOpacity={0.7}
              onPress={() => {
                if (item.key === 'address')   { onAddressPress(); return; }
                if (item.key === 'orders')    { onOrdersPress(); return; }
                if (item.key === 'loyalty')   { onLoyaltyPress(); return; }
                if (item.key === 'favorites') { onFavoritesPress(); return; }
                if (item.key === 'reserves')  { onReservesPress(); return; }
              }}
            >
              <View style={styles.menuIconBox}>
                <Ionicons name={item.icon} size={19} color={GREEN} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuLabel}>{item.label}</Text>
                {item.key === 'address' && address
                  ? <Text style={styles.menuSub} numberOfLines={1}>{address}</Text>
                  : item.sub
                  ? <Text style={styles.menuSub}>{item.sub}</Text>
                  : null}
              </View>
              <Ionicons name="chevron-forward" size={17} color="rgba(255,255,255,0.2)" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={20} color={RED} />
          <Text style={styles.logoutTxt}>Выйти из аккаунта</Text>
        </TouchableOpacity>

        <View style={{ height: 110 }} />
      </ScrollView>

      {/* Bottom nav */}
      <BlurView intensity={100} tint="dark" style={styles.bottomNav}>
        {NAV.map(tab => {
          const active = tab.key === 'prof';
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.navTab}
              activeOpacity={0.7}
              onPress={() => {
                if (tab.key === 'home') { onGoHome(); return; }
                if (tab.key === 'res')  { onReservationPress(); return; }
                if (tab.key === 'cart') { onCartPress(); return; }
              }}
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
              <Text style={[styles.navLabel, active && styles.navLabelActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </BlurView>

      {/* Edit name modal */}
      <Modal visible={editOpen} transparent animationType="fade" onRequestClose={() => setEditOpen(false)}>
        <View style={styles.backdrop}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setEditOpen(false)} />
          <View style={styles.editSheet}>
            <View style={styles.handle} />
            <Text style={styles.editTitle}>Изменить имя</Text>
            <TextInput
              style={styles.editInput}
              value={draft}
              onChangeText={setDraft}
              placeholder="Введите имя"
              placeholderTextColor="rgba(255,255,255,0.25)"
              autoFocus
              returnKeyType="done"
              onSubmitEditing={saveName}
              selectionColor={GREEN}
            />
            <TouchableOpacity style={styles.saveBtn} onPress={saveName} activeOpacity={0.85}>
              <Text style={styles.saveBtnTxt}>Сохранить</Text>
            </TouchableOpacity>
            <View style={{ height: 36 }} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: BG },
  scroll: { paddingTop: 64, paddingHorizontal: 20 },

  header:      { marginBottom: 22 },
  headerSub:   { color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 5 },
  headerTitle: { color: '#fff', fontSize: 28, fontWeight: '800' },

  profileCard: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    backgroundColor: CARD, borderRadius: 20, padding: 18,
    borderWidth: 1, borderColor: BORDER, marginBottom: 12,
  },
  avatar:    { width: 56, height: 56, borderRadius: 28, backgroundColor: GREEN_DARK, borderWidth: 2, borderColor: GREEN, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { color: '#fff', fontSize: 22, fontWeight: '800' },
  nameRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  profileName:  { color: '#fff', fontSize: 18, fontWeight: '700', flexShrink: 1 },
  profilePhone: { color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 2 },

  loyaltyCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(141,187,0,0.08)',
    borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: GREEN_DARK, marginBottom: 12,
  },
  loyaltyLeft:  { flexDirection: 'row', alignItems: 'center' },
  loyaltyLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  loyaltyVal:   { color: '#fff', fontSize: 16, fontWeight: '700', marginTop: 2 },

  menuCard: {
    backgroundColor: CARD, borderRadius: 18,
    borderWidth: 1, borderColor: BORDER,
    marginBottom: 12, overflow: 'hidden',
  },
  menuRow:        { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
  menuRowDivider: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)' },
  menuIconBox:    { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(141,187,0,0.12)', alignItems: 'center', justifyContent: 'center' },
  menuLabel:      { color: '#fff', fontSize: 15, fontWeight: '600', marginBottom: 1 },
  menuSub:        { color: 'rgba(255,255,255,0.4)', fontSize: 12 },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(224,82,82,0.08)',
    borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: 'rgba(224,82,82,0.2)',
  },
  logoutTxt: { color: RED, fontSize: 15, fontWeight: '600' },

  bottomNav: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row',
    paddingBottom: 56, paddingTop: 12,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderTopWidth: 1, borderTopColor: BORDER,
    overflow: 'hidden',
    backgroundColor: 'rgba(10,18,8,0.42)',
  },
  navTab:         { flex: 1, alignItems: 'center', gap: 4 },
  navLabel:       { color: 'rgba(255,255,255,0.4)', fontSize: 11 },
  navLabelActive: { color: GREEN },
  badge:    { position: 'absolute', top: -4, right: -8, backgroundColor: GREEN, borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  badgeTxt: { color: '#fff', fontSize: 10, fontWeight: '800' },

  backdrop:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  editSheet: { backgroundColor: SHEET_BG, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingTop: 8 },
  handle:    { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'center', marginBottom: 20 },
  editTitle: { color: '#fff', fontSize: 17, fontWeight: '700', textAlign: 'center', marginBottom: 20 },
  editInput: { backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 16, color: '#fff', fontSize: 17, fontWeight: '500', marginBottom: 16 },
  saveBtn:    { backgroundColor: GREEN_DARK, borderRadius: 30, paddingVertical: 17, alignItems: 'center', borderWidth: 1, borderColor: GREEN },
  saveBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
