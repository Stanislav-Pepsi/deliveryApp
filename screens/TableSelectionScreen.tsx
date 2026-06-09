import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Text from '../components/Text';
import { ApiTable, BanquetOrderItem, TableSection, createReservation, fetchSections } from '../api/reservations';

const GREEN      = '#8DBB00';
const GREEN_DARK = '#4a6600';
const BG         = '#0c0f0a';
const CARD       = 'rgba(255,255,255,0.06)';
const BORDER     = 'rgba(255,255,255,0.1)';
const CELL_SZ    = 62;

const MONTHS_SHORT = ['ЯНВ','ФЕВ','МАР','АПР','МАЙ','ИЮН','ИЮЛ','АВГ','СЕН','ОКТ','НОЯ','ДЕК'];

interface Props {
  date: string;
  time: string;
  guests: number;
  bookType: 'table' | 'banquet';
  banquetItems: BanquetOrderItem[];
  banquetTotal?: number;
  serviceChargePercent?: number;
  phone: string;
  tableId: string | null;
  onTableChange: (id: string | null) => void;
  onBack: () => void;
  onBanquetMenu?: () => void;
  onConfirm: (result: { reservationId: string; tableName: string; tableNumber?: number; sectionName?: string; guests: number; comment?: string }) => void;
  authToken: string | null;
  isDemoMode?: boolean;
}

function formatDate(s: string) {
  const p = s.split('.');
  if (p.length !== 3) return s;
  return `${p[0]} ${MONTHS_SHORT[parseInt(p[1], 10) - 1] ?? ''}`;
}

export default function TableSelectionScreen({
  date, time, guests, bookType, banquetItems, banquetTotal, serviceChargePercent, phone,
  tableId, onTableChange, onBack, onBanquetMenu, onConfirm, authToken, isDemoMode,
}: Props) {
  const [sections, setSections] = useState<TableSection[]>([]);
  const [sectionId, setSectionId] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState('');
  const [localGuests, setLocalGuests] = useState(guests);
  const [comment, setComment] = useState('');
  const [selectedSectionName, setSelectedSectionName] = useState<string | undefined>(undefined);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { onBack(); return true; });
    return () => sub.remove();
  }, [onBack]);

  useEffect(() => {
    if (isDemoMode) {
      const mockSection: TableSection = {
        id: 'demo-section-1',
        name: 'Основной зал',
        tables: [
          { id: 'demo-t1', number: 1, name: '1', capacity: 4, isAvailable: true } as any,
          { id: 'demo-t2', number: 2, name: '2', capacity: 2, isAvailable: true } as any,
          { id: 'demo-t3', number: 3, name: '3', capacity: 6, isAvailable: true } as any,
          { id: 'demo-t4', number: 4, name: '4', capacity: 4, isAvailable: false } as any,
        ],
      };
      setSections([mockSection]);
      setSectionId(mockSection.id);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError('');
    const [d, m, y] = date.split('.');
    fetchSections({
      date: `${y}-${m}-${d}`,
      time,
      duration: bookType === 'banquet' ? 180 : 120,
    })
      .then(data => {
        setSections(data);
        if (data.length > 0) setSectionId(data[0].id);
      })
      .catch(e => setLoadError(e.message || 'Ошибка загрузки залов'))
      .finally(() => setLoading(false));
  }, [isDemoMode]);

  const currentSection = sections.find(s => s.id === sectionId);
  const allTables: ApiTable[] = sections.flatMap(s => s.tables);
  const selTable = tableId ? allTables.find(t => t.id === tableId) ?? null : null;
  const canConfirm = !!selTable;
  const guestWord  = guests === 1 ? 'ГОСТЬ' : guests < 5 ? 'ГОСТЯ' : 'ГОСТЕЙ';

  const handleConfirm = async () => {
    if (!selTable) return;
    if (isDemoMode) {
      onConfirm({ reservationId: 'demo-res-new', tableName: selTable.name, tableNumber: selTable.number || undefined, sectionName: sections.find(s => s.id === sectionId)?.name, guests: localGuests, comment: comment.trim() || undefined });
      return;
    }
    if (!authToken) return;
    setConfirmError('');
    setConfirming(true);
    try {
      const [d, m, y] = date.split('.');
      const estimatedStartTime = `${y}-${m}-${d} ${time}:00`;
      const isBanquet = bookType === 'banquet';
      const data = await createReservation(
        {
          type: isBanquet ? 'BANQUET' : 'TABLE',
          tableIds: [selTable.id],
          estimatedStartTime,
          durationInMinutes: isBanquet ? 180 : 120,
          guestsCount: localGuests,
          phone,
          comment: comment.trim() || undefined,
          items: isBanquet && banquetItems.length > 0 ? banquetItems : undefined,
        },
        authToken,
      );
      const section = sections.find(s => s.tables.some(t => t.id === selTable.id));
      onConfirm({ reservationId: data.reservationId ?? data.id, tableName: selTable.name, tableNumber: selTable.number || undefined, sectionName: selectedSectionName || section?.name, guests: localGuests, comment: comment.trim() || undefined });
    } catch (e: any) {
      const msg = e.message || 'Ошибка создания резерва';
      setConfirmError(msg);
      if (e.status === 409 || msg.includes('уже забронирован')) {
        onTableChange(null);
        setSelectedSectionName(undefined);
      }
    } finally {
      setConfirming(false);
    }
  };

  const rows: ApiTable[][] = [];
  if (currentSection) {
    for (let i = 0; i < currentSection.tables.length; i += 4) {
      rows.push(currentSection.tables.slice(i, i + 4));
    }
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.8}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerSub}>
            {formatDate(date)} · {time} · {guests} {guestWord}
          </Text>
          <Text style={styles.headerTitle}>Выбор стола</Text>
        </View>
        <View style={{ width: 42 }} />
      </View>

      {sections.length > 1 && (
        <View style={styles.tabs}>
          {sections.map(s => (
            <TouchableOpacity
              key={s.id}
              style={[styles.tab, sectionId === s.id && styles.tabActive]}
              onPress={() => setSectionId(s.id)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabTxt, sectionId === s.id && styles.tabTxtActive]}>
                {s.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={GREEN} size="large" />
          </View>
        ) : loadError ? (
          <View style={styles.centered}>
            <Text style={styles.errorTxt}>{loadError}</Text>
          </View>
        ) : (
          <View style={styles.planCard}>
            {rows.map((row, ri) => (
              <View key={ri} style={styles.gridRow}>
                {row.map((table) => {
                  const isSel      = table.id === tableId;
                  const unavailable = table.isAvailable === false;
                  return (
                    <TouchableOpacity
                      key={table.id}
                      style={[styles.cell, isSel && styles.cellSel, unavailable && styles.cellUnavailable]}
                      onPress={() => {
                        if (unavailable) return;
                        if (isSel) { onTableChange(null); setSelectedSectionName(undefined); }
                        else { onTableChange(table.id); setLocalGuests(g => Math.min(g, table.seatingCapacity)); setSelectedSectionName(currentSection?.name); }
                      }}
                      activeOpacity={unavailable ? 1 : 0.7}
                    >
                      <Text style={[styles.cellNum, isSel && styles.cellNumSel, unavailable && styles.cellNumUnavailable]}>
                        {table.number > 0 ? table.number : table.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 160 }} />
      </ScrollView>

      <View style={styles.bottomBar}>
        {selTable ? (
          <View style={styles.selCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.selLabel}>{selTable.name}</Text>
              <Text style={styles.selFurn}>{selTable.seatingCapacity} мест</Text>
            </View>
            <View style={styles.guestsControl}>
              <TouchableOpacity
                style={[styles.qtyBtn, localGuests <= 1 && styles.qtyBtnOff]}
                onPress={() => setLocalGuests(g => Math.max(1, g - 1))}
                activeOpacity={0.7}
              >
                <Text style={styles.qtyBtnTxt}>−</Text>
              </TouchableOpacity>
              <View style={{ alignItems: 'center' }}>
                <Text style={styles.guestsHint}>ГОСТЕЙ</Text>
                <Text style={styles.selBigNum}>{localGuests}</Text>
              </View>
              <TouchableOpacity
                style={[styles.qtyBtn, localGuests >= selTable.seatingCapacity && styles.qtyBtnOff]}
                onPress={() => setLocalGuests(g => Math.min(selTable.seatingCapacity, g + 1))}
                activeOpacity={0.7}
              >
                <Text style={styles.qtyBtnTxt}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <Text style={styles.selHint}>Нажмите на стол, чтобы выбрать</Text>
        )}


        <TextInput
          style={styles.commentInput}
          placeholder="Комментарий (необязательно)"
          placeholderTextColor="rgba(255,255,255,0.25)"
          value={comment}
          onChangeText={setComment}
          multiline
          maxLength={200}
        />

        {bookType === 'banquet' && (
          <TouchableOpacity
            style={styles.banquetMenuBtn}
            activeOpacity={0.8}
            onPress={onBanquetMenu}
          >
            <Ionicons name="clipboard-outline" size={16} color={GREEN} />
            <Text style={styles.banquetMenuTxt}>
              {'Банкетное меню'}
            </Text>
            {banquetItems.length > 0 && (() => {
              const charge = banquetTotal && serviceChargePercent ? Math.round(banquetTotal * serviceChargePercent / 100) : 0;
              const total = (banquetTotal ?? 0) + charge;
              return (
                <Text style={styles.banquetMenuSub}>
                  {banquetItems.reduce((s, i) => s + i.amount, 0)} поз.{total > 0 ? ` · ${total.toLocaleString('ru-RU')} ₸` : ''}
                </Text>
              );
            })()}
            <Ionicons name="chevron-forward" size={16} color={GREEN} />
          </TouchableOpacity>
        )}

        {!!confirmError && <Text style={styles.errorTxt}>{confirmError}</Text>}

        <TouchableOpacity
          style={[styles.confirmBtn, (!canConfirm || confirming) && styles.confirmBtnOff]}
          activeOpacity={0.85}
          disabled={!canConfirm || confirming}
          onPress={handleConfirm}
        >
          {confirming
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.confirmTxt}>{canConfirm ? 'Зарезервировать' : 'Выберите стол'}</Text>
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
  headerSub:     { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '600', letterSpacing: 1, marginBottom: 3 },
  headerTitle:   { color: '#fff', fontSize: 18, fontWeight: '700' },

  tabs: {
    flexDirection: 'row', marginHorizontal: 20,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 14, padding: 4, marginBottom: 4,
  },
  tab:          { flex: 1, paddingVertical: 11, alignItems: 'center', borderRadius: 11 },
  tabActive:    { backgroundColor: GREEN_DARK },
  tabTxt:       { color: 'rgba(255,255,255,0.45)', fontWeight: '600', fontSize: 13 },
  tabTxtActive: { color: '#fff' },

  scroll:        { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 12 },

  centered:  { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  errorTxt:  { color: '#e05252', fontSize: 13, fontWeight: '500', textAlign: 'center' },

  planCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 20, borderWidth: 1, borderColor: BORDER,
    padding: 16, marginBottom: 8,
  },
  gridRow:   { flexDirection: 'row', justifyContent: 'center', marginBottom: 8 },
  cell: {
    width: CELL_SZ, height: CELL_SZ, margin: 4,
    backgroundColor: 'rgba(255,255,255,0.09)',
    borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  cellSel:          { backgroundColor: GREEN, borderColor: GREEN },
  cellUnavailable:  { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.06)', opacity: 0.4 },
  cellNum:          { color: 'rgba(255,255,255,0.75)', fontSize: 14, fontWeight: '700', textAlign: 'center' },
  cellNumSel:       { color: '#fff' },
  cellNumUnavailable: { color: 'rgba(255,255,255,0.3)' },

  bottomBar: {
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 46,
    backgroundColor: 'rgba(12,15,10,0.97)',
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)',
    gap: 10,
  },
  selCard:        { flexDirection: 'row', alignItems: 'center', padding: 14 },
  selLabel:       { color: '#fff', fontSize: 15, fontWeight: '600', marginBottom: 2 },
  selFurn:        { color: 'rgba(255,255,255,0.45)', fontSize: 12 },
  selBigNum:      { color: GREEN, fontSize: 38, fontWeight: '800', minWidth: 44, textAlign: 'center' },
  guestsControl:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  guestsHint:     { color: 'rgba(255,255,255,0.35)', fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  qtyBtn:         { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  qtyBtnOff:      { opacity: 0.3 },
  qtyBtnTxt:      { color: '#fff', fontSize: 20, fontWeight: '400', lineHeight: 24 },
  selHint:     { color: 'rgba(255,255,255,0.25)', fontSize: 13, textAlign: 'center', paddingVertical: 6 },

  commentInput: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    color: '#fff', fontSize: 14, paddingHorizontal: 14, paddingVertical: 12,
    minHeight: 44, textAlignVertical: 'top',
  },
  confirmBtn:    { backgroundColor: GREEN, borderRadius: 30, paddingVertical: 18, alignItems: 'center' },
  confirmBtnOff: { opacity: 0.4 },
  confirmTxt:    { color: '#fff', fontSize: 17, fontWeight: '700' },

  banquetMenuBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(141,187,0,0.08)', borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  banquetMenuTxt: { flex: 1, color: GREEN, fontSize: 14, fontWeight: '600', marginHorizontal: 10 },
  banquetMenuSub: { color: 'rgba(141,187,0,0.7)', fontSize: 12, marginRight: 6 },
});
