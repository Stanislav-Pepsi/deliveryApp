import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import {
  BackHandler,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import Text from '../components/Text';
import { RestaurantInfo, getHoursForDay } from '../api/restaurant';

const GREEN      = '#8DBB00';
const GREEN_DARK = '#4a6600';
const BG         = '#0c0f0a';
const SHEET_BG   = '#161a13';
const CARD       = 'rgba(255,255,255,0.06)';
const BORDER     = 'rgba(255,255,255,0.1)';

const MONTHS_RU = [
  'Январь','Февраль','Март','Апрель','Май','Июнь',
  'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь',
];
const DAYS_SHORT = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
const COPIES  = 3;
const MID_M   = MINUTES.length;
const MINUTES_INF = Array.from({ length: MINUTES.length * COPIES }, (_, i) => MINUTES[i % MINUTES.length]);

const ITEM_H  = 54;
const VISIBLE = 5;
const WHEEL_H = ITEM_H * VISIBLE;
const PAD     = ITEM_H * Math.floor(VISIBLE / 2);

function buildGrid(year: number, month: number) {
  const first  = new Date(year, month, 1).getDay();
  const offset = first === 0 ? 6 : first - 1;
  const dim     = new Date(year, month + 1, 0).getDate();
  const prevDim = new Date(year, month, 0).getDate();
  const cells: { day: number; type: 'prev' | 'curr' | 'next' }[] = [];
  for (let i = 0; i < offset; i++)
    cells.push({ day: prevDim - offset + 1 + i, type: 'prev' });
  for (let d = 1; d <= dim; d++)
    cells.push({ day: d, type: 'curr' });
  let next = 1;
  while (cells.length < 42) cells.push({ day: next++, type: 'next' });
  return cells;
}

const TYPES = [
  { key: 'table',  icon: 'restaurant-outline' as const, label: 'Стол',   sub: 'забронировать место' },
  { key: 'banquet', icon: 'wine-outline'        as const, label: 'Банкет', sub: 'с меню от шефа' },
];

interface Props {
  onBack: () => void;
  onNext: (date: string, time: string, guests: number, bookType: 'table' | 'banquet') => void;
  restaurantInfo?: RestaurantInfo | null;
  initialDate?: string;
  initialTime?: string;
  initialBookType?: 'table' | 'banquet';
}

export default function ReservationScreen({ onBack, onNext, restaurantInfo, initialDate, initialTime, initialBookType }: Props) {
  const now = new Date();
  const isToday = (d: number, m: number, y: number) =>
    d === now.getDate() && m === now.getMonth() && y === now.getFullYear();

  const [bookType, setBookType] = useState(initialBookType ?? 'table');
  const [guests, setGuests]     = useState(2);

  // Calendar
  const initDate = (() => {
    if (!initialDate) return null;
    const p = initialDate.split('.');
    if (p.length !== 3) return null;
    return { d: Number(p[0]), m: Number(p[1]) - 1, y: Number(p[2]) };
  })();
  const [calOpen, setCalOpen]   = useState(false);
  const [calYear, setCalYear]   = useState(initDate?.y ?? now.getFullYear());
  const [calMonth, setCalMonth] = useState(initDate?.m ?? now.getMonth());
  const [selDate, setSelDate]   = useState<{ d: number; m: number; y: number } | null>(initDate);

  const selDateIsToday = selDate ? isToday(selDate.d, selDate.m, selDate.y) : false;
  const wheelIsToday   = !selDate || selDateIsToday;
  const minMinutesFromNow     = 30;
  const minMinutesBeforeClose = 120;

  // Часы работы для колеса времени: выбранная дата, а если она ещё не выбрана — сегодня
  const wheelDate     = selDate ? new Date(selDate.y, selDate.m, selDate.d) : now;
  const wheelDayHours = getHoursForDay(restaurantInfo?.workingHours, wheelDate);
  const openHour      = wheelDayHours ? Math.floor(wheelDayHours.openMin / 60)  : 6;
  const closeHour     = wheelDayHours ? Math.floor(wheelDayHours.closeMin / 60) : 23;

  // Колесо показывает только часы, на которые реально можно забронировать: не раньше
  // чем через minMinutesFromNow от текущего момента (если бронь на сегодня) и не позже
  // чем за minMinutesBeforeClose до закрытия
  const earliestBookableMin = wheelIsToday ? now.getHours() * 60 + now.getMinutes() + minMinutesFromNow : -Infinity;
  const latestBookableMin   = wheelDayHours ? wheelDayHours.closeMin - minMinutesBeforeClose : Infinity;

  const HOURS_ALL = Array.from({ length: Math.max(closeHour - openHour + 1, 1) }, (_, i) => i + openHour);
  const HOURS_BOOKABLE = HOURS_ALL.filter(h =>
    MINUTES.some(m => { const t = h * 60 + m; return t >= earliestBookableMin && t <= latestBookableMin; })
  );
  const HOURS     = HOURS_BOOKABLE.length > 0 ? HOURS_BOOKABLE : HOURS_ALL;
  const HOURS_INF = Array.from({ length: HOURS.length * COPIES }, (_, i) => HOURS[i % HOURS.length]);
  const MID_H     = HOURS.length;

  // Time wheel
  const [timeOpen, setTimeOpen] = useState(false);
  const defaultHour = HOURS.find(h => h >= 12) ?? HOURS[HOURS.length - 1];
  const initHour = initialTime ? parseInt(initialTime.split(':')[0], 10) : defaultHour;
  const initMin  = initialTime ? parseInt(initialTime.split(':')[1], 10) : 0;
  const [selHour, setSelHour]   = useState(initHour);
  const [selMin, setSelMin]     = useState(initMin);
  const [pendH, setPendH]       = useState(initHour);
  const [pendM, setPendM]       = useState(initMin);
  const hourRef = useRef<ScrollView>(null);
  const minRef  = useRef<ScrollView>(null);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { onBack(); return true; });
    return () => sub.remove();
  }, [onBack]);

  // Если выбранный час выпал из доступного диапазона (сменилась дата/часы работы) — подставляем ближайший доступный
  useEffect(() => {
    if (HOURS.includes(selHour)) return;
    const fallback = HOURS.find(h => h >= selHour) ?? HOURS[HOURS.length - 1];
    setSelHour(fallback);
    setPendH(fallback);
  }, [selDate, HOURS.join(',')]);

  const openTime = () => { setPendH(selHour); setPendM(selMin); setTimeOpen(true); };

  useEffect(() => {
    if (!timeOpen) return;
    const hi = MID_H + HOURS.indexOf(pendH);
    const mi = MID_M + MINUTES.indexOf(pendM);
    const t = setTimeout(() => {
      hourRef.current?.scrollTo({ y: hi * ITEM_H, animated: false });
      minRef.current?.scrollTo({ y: mi * ITEM_H, animated: false });
    }, 80);
    return () => clearTimeout(t);
  }, [timeOpen]);

  const prevMonth = () =>
    calMonth === 0 ? (setCalYear(y => y - 1), setCalMonth(11)) : setCalMonth(m => m - 1);
  const nextMonth = () =>
    calMonth === 11 ? (setCalYear(y => y + 1), setCalMonth(0)) : setCalMonth(m => m + 1);

  const grid = buildGrid(calYear, calMonth);
  const rows = Array.from({ length: 6 }, (_, i) => grid.slice(i * 7, i * 7 + 7));

  const dateStr = selDate
    ? `${String(selDate.d).padStart(2, '0')}.${String(selDate.m + 1).padStart(2, '0')}.${selDate.y}`
    : null;
  const timeStr = `${String(selHour % 24).padStart(2, '0')}:${String(selMin).padStart(2, '0')}`;

  const isSelected = (d: number, m: number, y: number) =>
    selDate?.d === d && selDate?.m === m && selDate?.y === y;
  const isPast     = (d: number, m: number, y: number) =>
    new Date(y, m, d) < new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const maxDate    = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
  const isTooFar   = (d: number, m: number, y: number) =>
    new Date(y, m, d) > maxDate;

  const timeInPast = selDateIsToday && (() => {
    const selected = new Date(now.getFullYear(), now.getMonth(), now.getDate(), selHour % 24, selMin);
    const limit    = new Date(now.getTime() + minMinutesFromNow * 60 * 1000);
    return selected < limit;
  })();

  const tooCloseToClosing = !!selDate && !!wheelDayHours
    && (wheelDayHours.closeMin - (selHour * 60 + selMin)) < minMinutesBeforeClose;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.8}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Забронировать</Text>
        <View style={{ width: 42 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Type */}
        <Text style={styles.sLabel}>ТИП БРОНИ</Text>
        <View style={styles.typeRow}>
          {TYPES.map(t => (
            <TouchableOpacity
              key={t.key}
              style={[styles.typeCard, bookType === t.key && styles.typeCardActive]}
              onPress={() => setBookType(t.key)}
              activeOpacity={0.8}
            >

              <Ionicons
                name={t.icon}
                size={28}
                color={bookType === t.key ? '#fff' : 'rgba(255,255,255,0.45)'}
                style={{ marginBottom: 10 }}
              />
              <Text style={[styles.typeLabel, bookType === t.key && styles.typeLabelActive]}>{t.label}</Text>
              <Text style={[styles.typeSub,   bookType === t.key && styles.typeSubActive]}>{t.sub}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Location */}
        <Text style={styles.sLabel}>ТОЧКА</Text>
        <TouchableOpacity style={styles.locationCard} activeOpacity={0.8}>
          <View style={styles.locIcon}><Ionicons name="location-outline" size={18} color={GREEN} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.locName}>{restaurantInfo?.name ?? 'Ресторан'}</Text>
            <Text style={styles.locSub}>{restaurantInfo?.address ?? ''}</Text>
          </View>
        </TouchableOpacity>

        {/* Date + Time */}
        <Text style={styles.sLabel}>ДАТА И ВРЕМЯ</Text>
        <View style={styles.twoCol}>
          <TouchableOpacity
            style={[styles.inputCard, selDate && styles.inputCardDone]}
            onPress={() => setCalOpen(true)}
            activeOpacity={0.8}
          >
            <View style={styles.inputHeader}>
              <Ionicons name="calendar-outline" size={15} color={selDate ? GREEN : 'rgba(255,255,255,0.4)'} />
              <Text style={[styles.inputLabel, selDate && styles.inputLabelDone]}>ДАТА</Text>
            </View>
            <Text style={[styles.inputValue, !selDate && styles.inputEmpty]}>
              {dateStr ?? 'Выбрать'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.inputCard, styles.inputCardDone]}
            onPress={openTime}
            activeOpacity={0.8}
          >
            <View style={styles.inputHeader}>
              <Ionicons name="time-outline" size={15} color={GREEN} />
              <Text style={[styles.inputLabel, styles.inputLabelDone]}>ВРЕМЯ</Text>
            </View>
            <Text style={styles.inputValue}>{timeStr}</Text>
          </TouchableOpacity>
        </View>


        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Submit */}
      <View style={styles.bottomBar}>
        {timeInPast && (
          <Text style={styles.timeError}>
            Выберите время минимум через {minMinutesFromNow} мин от текущего
          </Text>
        )}
        {!timeInPast && tooCloseToClosing && (
          <Text style={styles.timeError}>
            Бронирование недоступно позднее чем за 2 часа до закрытия ресторана
          </Text>
        )}
        <TouchableOpacity
          style={[styles.submitBtn, (!selDate || timeInPast || tooCloseToClosing) && styles.submitBtnOff]}
          activeOpacity={0.85}
          disabled={!selDate || timeInPast || tooCloseToClosing}
          onPress={() => selDate && !timeInPast && !tooCloseToClosing && onNext(dateStr!, timeStr, guests, bookType as 'table' | 'banquet')}
        >
          <Text style={styles.submitTxt}>Далее</Text>
        </TouchableOpacity>
      </View>

      {/* ── Calendar modal ── */}
      <Modal visible={calOpen} transparent animationType="fade" onRequestClose={() => setCalOpen(false)}>
        <View style={styles.backdrop}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setCalOpen(false)} />
          <View style={styles.calSheet}>
            <View style={styles.handle} />

            {/* Month nav */}
            <View style={styles.monthNav}>
              <TouchableOpacity onPress={prevMonth} style={styles.navArrow}>
                <Ionicons name="chevron-back" size={20} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.monthTitle}>{MONTHS_RU[calMonth]} {calYear}</Text>
              <TouchableOpacity onPress={nextMonth} style={styles.navArrow}>
                <Ionicons name="chevron-forward" size={20} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Day-of-week headers */}
            <View style={styles.daysHeaderRow}>
              {DAYS_SHORT.map((d, i) => (
                <Text key={d} style={[styles.dayHeader, i >= 5 && styles.dayHeaderWknd]}>{d}</Text>
              ))}
            </View>

            {/* Weeks */}
            {rows.map((week, wi) => (
              <View key={wi} style={styles.weekRow}>
                {week.map((cell, di) => {
                  const isCurr    = cell.type === 'curr';
                  const isTod     = isCurr && isToday(cell.day, calMonth, calYear);
                  const isSel     = isCurr && isSelected(cell.day, calMonth, calYear);
                  const isWknd    = di >= 5;
                  const isDisabled = !isCurr || isPast(cell.day, calMonth, calYear) || isTooFar(cell.day, calMonth, calYear);
                  return (
                    <TouchableOpacity
                      key={di}
                      style={[
                        styles.dayCell,
                        isTod && !isSel && styles.dayCellToday,
                        isSel && styles.dayCellSel,
                      ]}
                      onPress={() => {
                        if (isDisabled) return;
                        setSelDate({ d: cell.day, m: calMonth, y: calYear });
                        setCalOpen(false);
                      }}
                      activeOpacity={isDisabled ? 1 : 0.7}
                    >
                      <Text style={[
                        styles.dayNum,
                        isDisabled && styles.dayNumFaded,
                        isWknd && !isDisabled && !isSel && styles.dayNumWknd,
                        isTod  && !isSel && styles.dayNumToday,
                        isSel  && styles.dayNumSel,
                      ]}>
                        {cell.day}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
            <View style={{ height: 24 }} />
          </View>
        </View>
      </Modal>

      {/* ── Time wheel modal ── */}
      <Modal visible={timeOpen} transparent animationType="fade" onRequestClose={() => setTimeOpen(false)}>
        <View style={styles.backdrop}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setTimeOpen(false)} />
          <View style={styles.timeSheet}>
            <View style={styles.handle} />
            <Text style={styles.timeTitle}>Выберите время</Text>

            <View style={styles.wheelsRow}>
              {/* Hours wheel */}
              <View style={styles.wheelWrap}>
                <ScrollView
                  ref={hourRef}
                  style={styles.wheel}
                  snapToInterval={ITEM_H}
                  decelerationRate="fast"
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingVertical: PAD }}
                  onMomentumScrollEnd={e => {
                    const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_H);
                    const clamped = Math.max(0, Math.min(idx, HOURS_INF.length - 1));
                    setPendH(HOURS_INF[clamped]);
                    const midIdx = MID_H + (clamped % HOURS.length);
                    if (midIdx !== clamped)
                      setTimeout(() => hourRef.current?.scrollTo({ y: midIdx * ITEM_H, animated: false }), 30);
                  }}
                  onScrollEndDrag={e => {
                    const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_H);
                    const clamped = Math.max(0, Math.min(idx, HOURS_INF.length - 1));
                    setPendH(HOURS_INF[clamped]);
                    const midIdx = MID_H + (clamped % HOURS.length);
                    if (midIdx !== clamped)
                      setTimeout(() => hourRef.current?.scrollTo({ y: midIdx * ITEM_H, animated: false }), 30);
                  }}
                >
                  {HOURS_INF.map((h, i) => (
                    <View key={i} style={styles.wheelItem}>
                      <Text style={[styles.wheelTxt, h === pendH && styles.wheelTxtActive]}>
                        {String(h % 24).padStart(2, '0')}
                      </Text>
                    </View>
                  ))}
                </ScrollView>
                <View style={[StyleSheet.absoluteFillObject, { justifyContent: 'center' }]} pointerEvents="none">
                  <View style={styles.wheelSelector} />
                </View>
                <LinearGradient colors={[SHEET_BG, 'transparent']} style={styles.wheelFadeTop} pointerEvents="none" />
                <LinearGradient colors={['transparent', SHEET_BG]} style={styles.wheelFadeBot} pointerEvents="none" />
              </View>

              <View style={styles.timeSepWrap}>
                <Text style={styles.timeSep}>:</Text>
              </View>

              {/* Minutes wheel */}
              <View style={styles.wheelWrap}>
                <ScrollView
                  ref={minRef}
                  style={styles.wheel}
                  snapToInterval={ITEM_H}
                  decelerationRate="fast"
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingVertical: PAD }}
                  onMomentumScrollEnd={e => {
                    const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_H);
                    const clamped = Math.max(0, Math.min(idx, MINUTES_INF.length - 1));
                    setPendM(MINUTES_INF[clamped]);
                    const midIdx = MID_M + (clamped % MINUTES.length);
                    if (midIdx !== clamped)
                      setTimeout(() => minRef.current?.scrollTo({ y: midIdx * ITEM_H, animated: false }), 30);
                  }}
                  onScrollEndDrag={e => {
                    const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_H);
                    const clamped = Math.max(0, Math.min(idx, MINUTES_INF.length - 1));
                    setPendM(MINUTES_INF[clamped]);
                    const midIdx = MID_M + (clamped % MINUTES.length);
                    if (midIdx !== clamped)
                      setTimeout(() => minRef.current?.scrollTo({ y: midIdx * ITEM_H, animated: false }), 30);
                  }}
                >
                  {MINUTES_INF.map((m, i) => (
                    <View key={i} style={styles.wheelItem}>
                      <Text style={[styles.wheelTxt, m === pendM && styles.wheelTxtActive]}>
                        {String(m).padStart(2, '0')}
                      </Text>
                    </View>
                  ))}
                </ScrollView>
                <View style={[StyleSheet.absoluteFillObject, { justifyContent: 'center' }]} pointerEvents="none">
                  <View style={styles.wheelSelector} />
                </View>
                <LinearGradient colors={[SHEET_BG, 'transparent']} style={styles.wheelFadeTop} pointerEvents="none" />
                <LinearGradient colors={['transparent', SHEET_BG]} style={styles.wheelFadeBot} pointerEvents="none" />
              </View>
            </View>

            <TouchableOpacity
              style={styles.confirmBtn}
              activeOpacity={0.85}
              onPress={() => { setSelHour(pendH); setSelMin(pendM); setTimeOpen(false); }}
            >
              <Text style={styles.confirmTxt}>
                Выбрать · {String(pendH % 24).padStart(2, '0')}:{String(pendM).padStart(2, '0')}
              </Text>
            </TouchableOpacity>
            <View style={{ height: 36 }} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20,
  },
  backBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 4 },

  sLabel: {
    color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: '700',
    letterSpacing: 1.2, marginBottom: 10, marginTop: 20,
  },

  typeRow: { flexDirection: 'row', gap: 12 },
  typeCard: {
    flex: 1, backgroundColor: CARD, borderRadius: 16, padding: 16,
    borderWidth: 1.5, borderColor: BORDER, position: 'relative',
    alignItems: 'center',
  },
  typeCardActive: { borderColor: GREEN, backgroundColor: 'rgba(141,187,0,0.08)' },
  typeCheck: {
    position: 'absolute', top: 10, right: 10,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center',
  },
  typeLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 16, fontWeight: '700', marginBottom: 3, textAlign: 'center' },
  typeLabelActive: { color: '#fff' },
  typeSub: { color: 'rgba(255,255,255,0.3)', fontSize: 12, textAlign: 'center' },
  typeSubActive: { color: 'rgba(255,255,255,0.55)' },

  locationCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: CARD, borderRadius: 14,
    padding: 14, borderWidth: 1, borderColor: BORDER, gap: 12,
  },
  locIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(141,187,0,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  locName: { color: '#fff', fontSize: 15, fontWeight: '600', marginBottom: 2 },
  locSub:  { color: 'rgba(255,255,255,0.4)', fontSize: 12 },

  twoCol: { flexDirection: 'row', gap: 12 },
  inputCard: {
    flex: 1, backgroundColor: CARD, borderRadius: 14, padding: 14,
    borderWidth: 1.5, borderColor: BORDER,
  },
  inputCardDone: { borderColor: 'rgba(141,187,0,0.45)' },
  inputHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  inputLabel: { color: 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  inputLabelDone: { color: GREEN },
  inputValue: { color: '#fff', fontSize: 20, fontWeight: '700', letterSpacing: 0.5 },
  inputEmpty: { color: 'rgba(255,255,255,0.25)', fontWeight: '400', fontSize: 16 },

  guestsCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: CARD, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: BORDER,
  },
  guestsLabel: { color: '#fff', fontSize: 15, fontWeight: '600', marginBottom: 3 },
  guestsSub:   { color: 'rgba(255,255,255,0.35)', fontSize: 12 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  qtyBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  qtyBtnOff:  { opacity: 0.3 },
  qtyBtnTxt:  { color: '#fff', fontSize: 20, fontWeight: '400', lineHeight: 24 },
  qtyNum:     { color: '#fff', fontSize: 20, fontWeight: '700', minWidth: 24, textAlign: 'center' },

  bottomBar: {
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 46,
    backgroundColor: 'rgba(12,15,10,0.97)',
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)',
  },
  submitBtn: {
    backgroundColor: GREEN, borderRadius: 30, paddingVertical: 18,
    alignItems: 'center',
  },
  submitBtnOff: { opacity: 0.4 },
  submitTxt:    { color: '#fff', fontSize: 17, fontWeight: '700' },
  timeError:    { color: '#e05252', fontSize: 12, fontWeight: '600', textAlign: 'center', marginBottom: 8 },

  // ── Modals ──
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },

  calSheet: {
    backgroundColor: SHEET_BG,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 8,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center', marginBottom: 16,
  },
  monthNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 20,
  },
  navArrow: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  monthTitle: { color: '#fff', fontSize: 17, fontWeight: '700' },

  daysHeaderRow: { flexDirection: 'row', marginBottom: 6 },
  dayHeader:     { flex: 1, textAlign: 'center', color: 'rgba(255,255,255,0.35)', fontSize: 12, fontWeight: '600', paddingVertical: 4 },
  dayHeaderWknd: { color: 'rgba(255,100,100,0.6)' },

  weekRow:  { flexDirection: 'row', marginBottom: 2 },
  dayCell:  { flex: 1, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22 },
  dayCellToday: { backgroundColor: 'rgba(141,187,0,0.15)' },
  dayCellSel:   { backgroundColor: GREEN },
  dayNum:       { color: 'rgba(255,255,255,0.75)', fontSize: 15 },
  dayNumFaded:  { color: 'rgba(255,255,255,0.18)' },
  dayNumWknd:   { color: 'rgba(255,120,100,0.85)' },
  dayNumToday:  { color: GREEN, fontWeight: '700' },
  dayNumSel:    { color: '#fff', fontWeight: '700' },

  // ── Time wheel ──
  timeSheet: {
    backgroundColor: SHEET_BG,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 24, paddingTop: 8,
  },
  timeTitle: { color: '#fff', fontSize: 17, fontWeight: '700', textAlign: 'center', marginBottom: 20 },

  wheelsRow:  { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', marginBottom: 24 },
  timeSepWrap: { height: ITEM_H, marginTop: ITEM_H * 2, marginHorizontal: 12, justifyContent: 'center', alignItems: 'center' },
  wheelWrap:  { width: 100, height: WHEEL_H, overflow: 'hidden', position: 'relative' },
  wheel:      { height: WHEEL_H },
  wheelItem:  { height: ITEM_H, alignItems: 'center', justifyContent: 'center' },
  wheelTxt:   { color: 'rgba(255,255,255,0.28)', fontSize: 30, fontWeight: '300' },
  wheelTxtActive: { color: '#fff', fontWeight: '700' },
  wheelSelector: {
    height: ITEM_H,
    borderTopWidth: 1, borderBottomWidth: 1,
    borderColor: 'rgba(141,187,0,0.45)',
    backgroundColor: 'rgba(141,187,0,0.07)',
  },
  wheelFadeTop: { position: 'absolute', top: 0, left: 0, right: 0, height: ITEM_H * 2 },
  wheelFadeBot: { position: 'absolute', bottom: 0, left: 0, right: 0, height: ITEM_H * 2 },
  timeSep: { color: '#fff', fontSize: 34, fontWeight: '700' },

  confirmBtn: {
    backgroundColor: GREEN, borderRadius: 30, paddingVertical: 17,
    alignItems: 'center', marginHorizontal: 0,
  },
  confirmTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
