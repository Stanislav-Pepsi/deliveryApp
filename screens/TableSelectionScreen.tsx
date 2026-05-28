import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  BackHandler,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const GREEN      = '#8DBB00';
const GREEN_DARK = '#4a6600';
const BG         = '#0c0f0a';
const CARD       = 'rgba(255,255,255,0.06)';
const BORDER     = 'rgba(255,255,255,0.1)';
const CELL_SZ    = 58;

const MONTHS_SHORT = ['ЯНВ','ФЕВ','МАР','АПР','МАЙ','ИЮН','ИЮЛ','АВГ','СЕН','ОКТ','НОЯ','ДЕК'];

type CellData = {
  id: number; seats: number; desc: string; furn: string;
  occupied?: boolean; mine?: boolean;
};
type Cell = CellData | 'occ' | null;
type FloorKey = 'floor2' | 'bar' | 'private';

const FLOORS: Record<FloorKey, { label: string; grid: Cell[][]; topLabel?: string; bottomLabel?: string }> = {
  floor2: {
    label: '2 этаж',
    bottomLabel: '↑ ВХОД',
    grid: [
      [
        { id: 11, seats: 2, desc: 'у стены',     furn: '2 стула' },
        { id: 12, seats: 4, desc: 'у окна',      furn: '4 стула', occupied: true },
        null,
        { id: 13, seats: 2, desc: 'у окна',      furn: '2 стула' },
        { id: 14, seats: 6, desc: 'угловой',     furn: 'диван + 2 стула' },
      ],
      [
        null,
        { id: 15, seats: 4, desc: 'центральный', furn: '4 стула' },
        { id: 16, seats: 4, desc: 'центральный', furn: '4 стула', occupied: true },
        { id: 17, seats: 2, desc: 'у стены',     furn: '2 стула' },
        null,
      ],
      [
        { id: 18, seats: 4, desc: 'у окна',      furn: '4 стула' },
        { id: 19, seats: 6, desc: 'угловой',     furn: 'диван + 4 стула' },
        null,
        { id: 20, seats: 2, desc: 'у стены',     furn: '2 стула', occupied: true },
        { id: 21, seats: 2, desc: 'у входа',     furn: '2 стула' },
      ],
    ],
  },
  bar: {
    label: 'Бар',
    topLabel: 'B A R',
    bottomLabel: '↑ ВХОД',
    grid: [
      [
        { id: 2, seats: 2, desc: 'у входа',     furn: '2 стула' },
        { id: 3, seats: 2, desc: 'у стены',     furn: '2 стула' },
        'occ',
        { id: 5, seats: 2, desc: 'у стойки',    furn: '2 стула' },
        { id: 6, seats: 6, desc: 'у бара',      furn: 'диван + 2 стула' },
      ],
      [
        { id: 4, seats: 4, desc: 'у стены',     furn: '4 стула' },
        'occ',
        { id: 7, seats: 6, desc: 'у окна',      furn: 'диван + 4 стула', occupied: true, mine: true },
        { id: 8, seats: 8, desc: 'центральный', furn: '8 стульев' },
        { id: 9, seats: 4, desc: 'у стены',     furn: '4 стула' },
      ],
    ],
  },
  private: {
    label: 'Кабинки',
    grid: [
      [
        { id: 31, seats: 6, desc: 'кабинка 1',  furn: 'диван + стул', occupied: true },
        { id: 32, seats: 6, desc: 'кабинка 2',  furn: 'диван + стул' },
        null, null, null,
      ],
      [
        { id: 33, seats: 8, desc: 'кабинка 3',  furn: 'диван + 4 стула' },
        { id: 34, seats: 8, desc: 'кабинка 4',  furn: 'диван + 4 стула', occupied: true },
        null, null, null,
      ],
    ],
  },
};

const MY_TABLE   = { tableId: 7, date: '18.03.2026', time: '19:30', guests: 4, desc: 'у окна', furn: 'диван + 4 стула', seats: 6 };
const MY_BANQUET = { date: '25.03.2026', time: '18:00', guests: 15, hall: 'Зал «Базилик»', deposit: '25 000 ₸' };

interface Props {
  date: string;
  time: string;
  guests: number;
  dishCount: number;
  tableId: number | null;
  onTableChange: (id: number | null) => void;
  onAddDishesPress: () => void;
  onBack: () => void;
  onConfirm: (tableId: number) => void;
}

function formatDate(s: string) {
  const p = s.split('.');
  if (p.length !== 3) return s;
  return `${p[0]} ${MONTHS_SHORT[parseInt(p[1], 10) - 1] ?? ''}`;
}

function findCell(id: number): CellData | null {
  for (const f of Object.values(FLOORS)) {
    for (const row of f.grid) {
      for (const c of row) {
        if (c && c !== 'occ' && c.id === id) return c;
      }
    }
  }
  return null;
}

export default function TableSelectionScreen({
  date, time, guests, dishCount, tableId, onTableChange, onAddDishesPress, onBack, onConfirm,
}: Props) {
  const [floor, setFloor] = useState<FloorKey>('bar');

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { onBack(); return true; });
    return () => sub.remove();
  }, [onBack]);

  const floorData  = FLOORS[floor];
  const selCell    = tableId !== null ? findCell(tableId) : null;
  const canConfirm = selCell !== null && !selCell.occupied && !selCell.mine;
  const guestWord  = guests === 1 ? 'ГОСТЬ' : guests < 5 ? 'ГОСТЯ' : 'ГОСТЕЙ';

  const handleCell = (cell: Cell) => {
    if (!cell || cell === 'occ') return;
    if (cell.occupied && !cell.mine) return;
    onTableChange(cell.id);
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Header */}
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

      {/* Floor tabs */}
      <View style={styles.tabs}>
        {(Object.keys(FLOORS) as FloorKey[]).map(k => (
          <TouchableOpacity
            key={k}
            style={[styles.tab, floor === k && styles.tabActive]}
            onPress={() => setFloor(k)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabTxt, floor === k && styles.tabTxtActive]}>
              {FLOORS[k].label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Floor plan */}
        <View style={styles.planCard}>
          {floorData.topLabel && <Text style={styles.areaLabel}>{floorData.topLabel}</Text>}

          {floorData.grid.map((row, ri) => (
            <View key={ri} style={styles.gridRow}>
              {row.map((cell, ci) => {
                if (cell === null) return <View key={ci} style={styles.cellEmpty} />;
                const isOcc  = cell === 'occ' || (cell !== 'occ' && !!cell.occupied && !cell.mine);
                const isMine = cell !== 'occ' && !!cell.mine;
                const isSel  = cell !== 'occ' && cell.id === tableId;
                const label  = cell !== 'occ' ? cell.id : null;
                return (
                  <TouchableOpacity
                    key={ci}
                    style={[styles.cell, isOcc && styles.cellOcc, isMine && styles.cellMine, isSel && !isMine && styles.cellSel]}
                    onPress={() => handleCell(cell)}
                    activeOpacity={isOcc ? 1 : 0.7}
                    disabled={isOcc}
                  >
                    {isOcc ? (
                      <Text style={styles.cellX}>✕</Text>
                    ) : (
                      <>
                        <Text style={[styles.cellNum, isMine && styles.cellNumMine, isSel && !isMine && styles.cellNumSel]}>
                          {label}
                        </Text>
                        {isMine && (
                          <View style={styles.mineBadge}>
                            <Ionicons name="bookmark" size={8} color="#fff" />
                          </View>
                        )}
                      </>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}

          {floorData.bottomLabel && <Text style={styles.entranceLabel}>{floorData.bottomLabel}</Text>}

          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: GREEN }]} />
              <Text style={styles.legendTxt}>выбран</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: GREEN_DARK, borderWidth: 1, borderColor: GREEN }]} />
              <Text style={styles.legendTxt}>моя бронь</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: 'rgba(255,255,255,0.1)' }]} />
              <Text style={styles.legendTxt}>занят</Text>
            </View>
          </View>
        </View>

        {/* My reservations */}
        <Text style={styles.sLabel}>МОИ БРОНИ</Text>

        <View style={styles.myCard}>
          <View style={styles.myCardIcon}>
            <Ionicons name="bookmark" size={18} color={GREEN} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.myCardTitle}>Стол №{MY_TABLE.tableId} · {MY_TABLE.desc}</Text>
            <Text style={styles.myCardSub}>
              {formatDate(MY_TABLE.date)} · {MY_TABLE.time} · {MY_TABLE.guests} гостя
            </Text>
            <Text style={styles.myCardFurn}>{MY_TABLE.seats} мест · {MY_TABLE.furn}</Text>
          </View>
          <Text style={styles.myCardNum}>{MY_TABLE.tableId}</Text>
        </View>

        <View style={[styles.myCard, styles.myCardBanq]}>
          <View style={styles.myCardIcon}>
            <Ionicons name="wine-outline" size={18} color={GREEN} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.myCardTitle}>{MY_BANQUET.hall}</Text>
            <Text style={styles.myCardSub}>
              {formatDate(MY_BANQUET.date)} · {MY_BANQUET.time} · {MY_BANQUET.guests} гостей
            </Text>
            <Text style={styles.myCardFurn}>Депозит {MY_BANQUET.deposit}</Text>
          </View>
          <Ionicons name="lock-closed-outline" size={16} color="rgba(255,255,255,0.25)" />
        </View>

        <View style={{ height: 160 }} />
      </ScrollView>

      {/* Bottom bar */}
      <View style={styles.bottomBar}>
        {tableId !== null ? (
          <View style={[styles.selCard, selCell?.mine && styles.selCardMine]}>
            {selCell?.mine ? (
              <>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.selLabel, { color: GREEN }]}>ВАША БРОНЬ</Text>
                  <Text style={styles.selDesc}>{selCell.desc}</Text>
                  <Text style={styles.selFurn}>{selCell.seats} мест · {selCell.furn}</Text>
                </View>
                <Ionicons name="bookmark" size={26} color={GREEN} />
              </>
            ) : selCell ? (
              <>
                <View style={{ flex: 1 }}>
                  <Text style={styles.selLabel}>СТОЛ №{selCell.id}</Text>
                  <Text style={styles.selDesc}>{selCell.desc}</Text>
                  <Text style={styles.selFurn}>{selCell.seats} мест · {selCell.furn}</Text>
                </View>
                <Text style={styles.selBigNum}>{selCell.id}</Text>
              </>
            ) : null}
          </View>
        ) : (
          <Text style={styles.selHint}>Нажмите на стол, чтобы выбрать</Text>
        )}

        {canConfirm && (
          <TouchableOpacity
            style={[styles.addDishBtn, dishCount > 0 && styles.addDishBtnActive]}
            onPress={onAddDishesPress}
            activeOpacity={0.8}
          >
            <Ionicons
              name="restaurant-outline"
              size={15}
              color={dishCount > 0 ? GREEN : 'rgba(255,255,255,0.5)'}
            />
            <Text style={[styles.addDishTxt, dishCount > 0 && styles.addDishTxtActive]}>
              {dishCount > 0 ? `Блюда к столу · ${dishCount} позиции` : 'Добавить блюда'}
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.confirmBtn, !canConfirm && styles.confirmBtnOff]}
          activeOpacity={0.85}
          disabled={!canConfirm}
          onPress={() => tableId !== null && onConfirm(tableId)}
        >
          <Text style={styles.confirmTxt}>
            {selCell?.mine ? 'Это ваша бронь' : canConfirm ? 'Зарезервировать' : 'Выберите стол'}
          </Text>
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

  planCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 20, borderWidth: 1, borderColor: BORDER,
    padding: 16, marginBottom: 8,
  },
  areaLabel: {
    color: 'rgba(255,255,255,0.18)', fontSize: 11, fontWeight: '700',
    letterSpacing: 3, textAlign: 'center', marginBottom: 14,
  },
  gridRow:   { flexDirection: 'row', justifyContent: 'center', marginBottom: 8 },
  cell: {
    width: CELL_SZ, height: CELL_SZ, margin: 4,
    backgroundColor: 'rgba(255,255,255,0.09)',
    borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    position: 'relative',
  },
  cellEmpty:   { width: CELL_SZ, height: CELL_SZ, margin: 4 },
  cellOcc:     { backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.05)' },
  cellMine:    { backgroundColor: 'rgba(74,102,0,0.4)', borderColor: GREEN, borderWidth: 1.5 },
  cellSel:     { backgroundColor: GREEN, borderColor: GREEN },
  cellNum:     { color: 'rgba(255,255,255,0.65)', fontSize: 17, fontWeight: '700' },
  cellNumMine: { color: GREEN },
  cellNumSel:  { color: '#fff' },
  cellX:       { color: 'rgba(255,255,255,0.18)', fontSize: 18, fontWeight: '300' },
  mineBadge: {
    position: 'absolute', top: 5, right: 5,
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center',
  },
  entranceLabel: {
    color: 'rgba(255,255,255,0.2)', fontSize: 10, fontWeight: '600',
    letterSpacing: 1.5, textAlign: 'center', marginTop: 2, marginBottom: 14,
  },
  legend:     { flexDirection: 'row', justifyContent: 'center', gap: 18 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot:  { width: 10, height: 10, borderRadius: 3 },
  legendTxt:  { color: 'rgba(255,255,255,0.3)', fontSize: 11 },

  sLabel: {
    color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: '700',
    letterSpacing: 1.2, marginBottom: 10, marginTop: 20,
  },
  myCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: CARD, borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: 'rgba(141,187,0,0.25)',
    marginBottom: 10, gap: 12,
  },
  myCardBanq:  { borderColor: 'rgba(141,187,0,0.35)', backgroundColor: 'rgba(141,187,0,0.05)' },
  myCardIcon:  { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(141,187,0,0.12)', alignItems: 'center', justifyContent: 'center' },
  myCardTitle: { color: '#fff', fontSize: 14, fontWeight: '700', marginBottom: 2 },
  myCardSub:   { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginBottom: 2 },
  myCardFurn:  { color: 'rgba(255,255,255,0.3)', fontSize: 11 },
  myCardNum:   { color: GREEN, fontSize: 32, fontWeight: '800' },

  bottomBar: {
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 46,
    backgroundColor: 'rgba(12,15,10,0.97)',
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)',
    gap: 10,
  },
  selCard:     { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: BORDER },
  selCardMine: { borderColor: 'rgba(141,187,0,0.4)', backgroundColor: 'rgba(141,187,0,0.07)' },
  selLabel:    { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 3 },
  selDesc:     { color: '#fff', fontSize: 15, fontWeight: '600', marginBottom: 2 },
  selFurn:     { color: 'rgba(255,255,255,0.45)', fontSize: 12 },
  selBigNum:   { color: GREEN, fontSize: 38, fontWeight: '800', marginLeft: 8 },
  selHint:     { color: 'rgba(255,255,255,0.25)', fontSize: 13, textAlign: 'center', paddingVertical: 6 },

  addDishBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 30, paddingVertical: 13,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  addDishBtnActive: { backgroundColor: 'rgba(141,187,0,0.1)', borderColor: 'rgba(141,187,0,0.3)' },
  addDishTxt:       { color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: '600' },
  addDishTxtActive: { color: GREEN },

  confirmBtn:    { backgroundColor: GREEN_DARK, borderRadius: 30, paddingVertical: 18, alignItems: 'center', borderWidth: 1, borderColor: GREEN },
  confirmBtnOff: { opacity: 0.4 },
  confirmTxt:    { color: '#fff', fontSize: 17, fontWeight: '700' },
});
