import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  ScrollView,
  StatusBar,
  StyleSheet,
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
  phone: string;
  tableId: string | null;
  onTableChange: (id: string | null) => void;
  onBack: () => void;
  onConfirm: () => void;
  authToken: string | null;
}

function formatDate(s: string) {
  const p = s.split('.');
  if (p.length !== 3) return s;
  return `${p[0]} ${MONTHS_SHORT[parseInt(p[1], 10) - 1] ?? ''}`;
}

export default function TableSelectionScreen({
  date, time, guests, bookType, banquetItems, phone,
  tableId, onTableChange, onBack, onConfirm, authToken,
}: Props) {
  const [sections, setSections] = useState<TableSection[]>([]);
  const [sectionId, setSectionId] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState('');

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { onBack(); return true; });
    return () => sub.remove();
  }, [onBack]);

  useEffect(() => {
    setLoading(true);
    setLoadError('');
    fetchSections()
      .then(data => {
        setSections(data);
        if (data.length > 0) setSectionId(data[0].id);
      })
      .catch(e => setLoadError(e.message || 'Ошибка загрузки залов'))
      .finally(() => setLoading(false));
  }, []);

  const currentSection = sections.find(s => s.id === sectionId);
  const allTables: ApiTable[] = sections.flatMap(s => s.tables);
  const selTable = tableId ? allTables.find(t => t.id === tableId) ?? null : null;
  const canConfirm = !!selTable;
  const guestWord  = guests === 1 ? 'ГОСТЬ' : guests < 5 ? 'ГОСТЯ' : 'ГОСТЕЙ';

  const handleConfirm = async () => {
    if (!selTable || !authToken) return;
    setConfirmError('');
    setConfirming(true);
    try {
      const [d, m, y] = date.split('.');
      const estimatedStartTime = `${y}-${m}-${d} ${time}:00`;
      const isBanquet = bookType === 'banquet';
      await createReservation(
        {
          type: isBanquet ? 'BANQUET' : 'TABLE',
          tableIds: [selTable.id],
          estimatedStartTime,
          durationInMinutes: isBanquet ? 180 : 120,
          guestsCount: guests,
          phone,
          items: isBanquet && banquetItems.length > 0 ? banquetItems : undefined,
        },
        authToken,
      );
      onConfirm();
    } catch (e: any) {
      setConfirmError(e.message || 'Ошибка создания резерва');
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
    <View style={styles.root}>
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
                {row.map((table, di) => {
                  const isSel = table.id === tableId;
                  return (
                    <TouchableOpacity
                      key={table.id}
                      style={[styles.cell, isSel && styles.cellSel]}
                      onPress={() => onTableChange(isSel ? null : table.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.cellNum, isSel && styles.cellNumSel]}>
                        {ri * 4 + di + 1}
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
            <Text style={styles.selBigNum}>{guests}</Text>
          </View>
        ) : (
          <Text style={styles.selHint}>Нажмите на стол, чтобы выбрать</Text>
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
  cellSel:     { backgroundColor: GREEN, borderColor: GREEN },
  cellNum:     { color: 'rgba(255,255,255,0.75)', fontSize: 14, fontWeight: '700', textAlign: 'center' },
  cellNumSel:  { color: '#fff' },

  bottomBar: {
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 46,
    backgroundColor: 'rgba(12,15,10,0.97)',
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)',
    gap: 10,
  },
  selCard:     { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: BORDER },
  selLabel:    { color: '#fff', fontSize: 15, fontWeight: '600', marginBottom: 2 },
  selFurn:     { color: 'rgba(255,255,255,0.45)', fontSize: 12 },
  selBigNum:   { color: GREEN, fontSize: 38, fontWeight: '800', marginLeft: 8 },
  selHint:     { color: 'rgba(255,255,255,0.25)', fontSize: 13, textAlign: 'center', paddingVertical: 6 },

  confirmBtn:    { backgroundColor: GREEN_DARK, borderRadius: 30, paddingVertical: 18, alignItems: 'center', borderWidth: 1, borderColor: GREEN },
  confirmBtnOff: { opacity: 0.4 },
  confirmTxt:    { color: '#fff', fontSize: 17, fontWeight: '700' },
});
