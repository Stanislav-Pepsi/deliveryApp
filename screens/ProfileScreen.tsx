import { AntDesign, Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useState } from 'react';
import {
  ActivityIndicator,
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
  { key: 'address',   icon: 'location-outline' as const, label: 'Адресная книга', sub: null },
  { key: 'favorites', icon: 'heart-outline'    as const, label: 'Избранное',      sub: null },
  { key: 'orders',    icon: 'receipt-outline'  as const, label: 'Мои заказы',     sub: null },
  { key: 'reserves',  icon: 'calendar-outline' as const, label: 'Мои резервы',    sub: null },
  { key: 'logout',    icon: 'log-out-outline'  as const, label: 'Выйти из аккаунта', sub: null },
];

const NAV = [
  { key: 'home', label: 'Главная', icon: 'home-outline'     as const, iconActive: 'home'     as const },
  { key: 'res',  label: 'Резервы', icon: 'calendar-outline' as const, iconActive: 'calendar' as const },
  { key: 'cart', label: 'Корзина', icon: 'cart-outline'     as const, iconActive: 'cart'     as const },
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
  onDeleteAccount?: () => Promise<void>;
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
  onDeleteAccount, onOrdersPress, onReservesPress, onAddressPress, onLoyaltyPress, onFavoritesPress,
  address, phone, loyaltyBalance,
}: Props) {
  const [editOpen,          setEditOpen]          = useState(false);
  const [draft,             setDraft]             = useState('');
  const [logoutConfirm,     setLogoutConfirm]     = useState(false);
  const [deleteConfirm,     setDeleteConfirm]     = useState(false);
  const [deletingAccount,   setDeletingAccount]   = useState(false);
  const [deleteError,       setDeleteError]       = useState('');

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
              <AntDesign name="edit" size={16} color="rgba(255,255,255,0.4)" style={{ marginLeft: 7, marginTop: 1 }} />
            </TouchableOpacity>
            {!!phone && <Text style={styles.profilePhone}>{phone.replace(/(\+\d)(\d{3})(\d{3})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5')}</Text>}
          </View>
        </View>

        {/* Loyalty balance card */}
        <TouchableOpacity style={styles.loyaltyCard} onPress={onLoyaltyPress} activeOpacity={0.8}>
          <View style={styles.loyaltyLeft}>
            <Ionicons name="star" size={22} color={GREEN} />
            <View style={{ marginLeft: 12 }}>
              <Text style={styles.loyaltyLabel}>Ваши бонусы</Text>
              {loyaltyBalance !== null
                ? <Text style={styles.loyaltyVal}>{String(loyaltyBalance)} бонусов</Text>
                : <Text style={[styles.loyaltyVal, { color: 'rgba(255,255,255,0.2)' }]}>— бонусов</Text>
              }
            </View>
          </View>
          <Ionicons name="chevron-forward" size={17} color="rgba(255,255,255,0.2)" />
        </TouchableOpacity>

        {/* Menu */}
        <View style={styles.menuCard}>
          {MENU.map((item, idx) => {
            const isLogout = item.key === 'logout';
            return (
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
                  if (item.key === 'logout')    { setLogoutConfirm(true); return; }
                }}
              >
                <View style={[styles.menuIconBox, isLogout && styles.menuIconBoxRed]}>
                  <Ionicons name={item.icon} size={19} color={isLogout ? RED : GREEN} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.menuLabel, isLogout && styles.menuLabelRed]}>{item.label}</Text>
                  {item.key === 'address' && address
                    ? <Text style={styles.menuSub} numberOfLines={1}>{address}</Text>
                    : item.sub
                    ? <Text style={styles.menuSub}>{item.sub}</Text>
                    : null}
                </View>
                {!isLogout && <Ionicons name="chevron-forward" size={17} color="rgba(255,255,255,0.2)" />}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Delete account */}
        <TouchableOpacity style={styles.deleteBtn} onPress={() => setDeleteConfirm(true)} activeOpacity={0.8}>
          <Ionicons name="trash-outline" size={20} color={RED} />
          <Text style={styles.deleteTxt}>Удалить аккаунт</Text>
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
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>Изменить имя</Text>
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

      {/* Logout confirm modal */}
      <Modal visible={logoutConfirm} transparent animationType="fade" onRequestClose={() => setLogoutConfirm(false)}>
        <View style={styles.backdrop}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setLogoutConfirm(false)} />
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <View style={styles.confirmIconWrap}>
              <Ionicons name="log-out-outline" size={32} color={RED} />
            </View>
            <Text style={styles.sheetTitle}>Выйти из аккаунта?</Text>
            <Text style={styles.sheetSub}>Вы сможете войти снова в любое время, введя номер телефона.</Text>
            <TouchableOpacity style={styles.confirmBtnRed} onPress={() => { setLogoutConfirm(false); onLogout(); }} activeOpacity={0.85}>
              <Text style={styles.confirmBtnTxt}>Выйти</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtnGhost} onPress={() => setLogoutConfirm(false)} activeOpacity={0.7}>
              <Text style={styles.confirmBtnGhostTxt}>Отмена</Text>
            </TouchableOpacity>
            <View style={{ height: 36 }} />
          </View>
        </View>
      </Modal>

      {/* Delete account confirm modal */}
      <Modal visible={deleteConfirm} transparent animationType="fade" onRequestClose={() => { if (!deletingAccount) setDeleteConfirm(false); }}>
        <View style={styles.backdrop}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => { if (!deletingAccount) setDeleteConfirm(false); }} />
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <View style={styles.confirmIconWrap}>
              <Ionicons name="trash-outline" size={32} color={RED} />
            </View>
            <Text style={styles.sheetTitle}>Удалить аккаунт?</Text>
            <Text style={styles.sheetSub}>Все данные профиля будут удалены. История заказов сохраняется.</Text>
            {!!deleteError && <Text style={styles.deleteErrorTxt}>{deleteError}</Text>}
            <TouchableOpacity
              style={[styles.confirmBtnRed, deletingAccount && { opacity: 0.6 }]}
              onPress={async () => {
                setDeletingAccount(true);
                setDeleteError('');
                try {
                  await onDeleteAccount?.();
                  setDeleteConfirm(false);
                } catch (e: any) {
                  setDeleteError(e.message ?? 'Ошибка удаления');
                } finally {
                  setDeletingAccount(false);
                }
              }}
              disabled={deletingAccount}
              activeOpacity={0.85}
            >
              {deletingAccount
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.confirmBtnTxt}>Удалить аккаунт</Text>
              }
            </TouchableOpacity>
            <TouchableOpacity style={[styles.confirmBtnGhost, deletingAccount && { opacity: 0.4 }]} onPress={() => { if (!deletingAccount) setDeleteConfirm(false); }} activeOpacity={0.7}>
              <Text style={styles.confirmBtnGhostTxt}>Отмена</Text>
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
  headerTitle: { color: '#fff', fontSize: 28, fontWeight: '800' },

  profileCard: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    backgroundColor: CARD, borderRadius: 20, padding: 18,
    marginBottom: 12,
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
    marginBottom: 12,
  },
  loyaltyLeft:  { flexDirection: 'row', alignItems: 'center' },
  loyaltyLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  loyaltyVal:   { color: '#fff', fontSize: 16, fontWeight: '700', marginTop: 2 },

  menuCard: {
    backgroundColor: CARD, borderRadius: 18,
    marginBottom: 12, overflow: 'hidden',
  },
  menuRow:        { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
  menuRowDivider: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)' },
  menuIconBox:    { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(141,187,0,0.12)', alignItems: 'center', justifyContent: 'center' },
  menuIconBoxRed: { backgroundColor: 'rgba(224,82,82,0.1)' },
  menuLabel:      { color: '#fff', fontSize: 15, fontWeight: '600', marginBottom: 1 },
  menuLabelRed:   { color: RED },
  menuSub:        { color: 'rgba(255,255,255,0.4)', fontSize: 12 },

  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(224,82,82,0.08)',
    borderRadius: 18, padding: 16,
  },
  deleteTxt: { color: RED, fontSize: 15, fontWeight: '600' },

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

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: SHEET_BG,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 24, paddingTop: 8,
  },
  handle:    { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'center', marginBottom: 20 },
  sheetTitle: { color: '#fff', fontSize: 18, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  sheetSub:   { color: 'rgba(255,255,255,0.45)', fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 24 },

  confirmIconWrap: { alignItems: 'center', marginBottom: 16 },

  editInput: { backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 16, color: '#fff', fontSize: 17, fontWeight: '500', marginBottom: 16 },
  saveBtn:    { backgroundColor: GREEN, borderRadius: 30, paddingVertical: 17, alignItems: 'center', marginBottom: 12 },
  saveBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },

  confirmBtnRed: {
    backgroundColor: RED, borderRadius: 30,
    paddingVertical: 17, alignItems: 'center', marginBottom: 10,
  },
  confirmBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },
  confirmBtnGhost: {
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 30,
    paddingVertical: 17, alignItems: 'center', marginBottom: 4,
  },
  confirmBtnGhostTxt: { color: 'rgba(255,255,255,0.55)', fontSize: 16, fontWeight: '600' },
  deleteErrorTxt: { color: RED, fontSize: 13, textAlign: 'center', marginBottom: 12, marginTop: -8 },
});
