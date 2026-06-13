import { AntDesign, Ionicons, Octicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import {
  BackHandler,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import Text from '../components/Text';

const GREEN      = '#E8242E';
const GREEN_DARK = '#8B1520';
const BG         = '#0a0a0a';
const CARD       = 'rgba(255,255,255,0.06)';
const BORDER     = 'rgba(255,255,255,0.1)';
const RED        = '#e05252';

interface Props {
  addresses: string[];
  activeAddress: string;
  labelMap?: Record<string, string>;
  onSelect: (address: string) => void;
  onDelete: (address: string) => void;
  onEdit: (address: string) => void;
  onAddNew: () => void;
  onBack: () => void;
}

export default function AddressBookScreen({
  addresses, activeAddress, labelMap = {}, onSelect, onDelete, onEdit, onAddNew, onBack,
}: Props) {
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onBack();
      return true;
    });
    return () => sub.remove();
  }, [onBack]);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.8}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.headerSub}>ПРОФИЛЬ</Text>
          <Text style={styles.headerTitle}>Адресная книга</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {addresses.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="location-outline" size={48} color="rgba(255,255,255,0.15)" />
            <Text style={styles.emptyTxt}>Нет сохранённых адресов</Text>
            <Text style={styles.emptyHint}>Добавьте адрес, чтобы быстро{'\n'}оформлять доставку</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {addresses.map((addr, idx) => {
              const isActive = addr === activeAddress;
              return (
                <TouchableOpacity
                  key={idx}
                  style={[styles.addrCard, isActive && styles.addrCardActive]}
                  onPress={() => onSelect(addr)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.radioOuter, isActive && styles.radioOuterActive]}>
                    {isActive && <View style={styles.radioInner} />}
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={[styles.addrTxt, isActive && styles.addrTxtActive]} numberOfLines={1}>
                      {labelMap[addr] || addr}
                    </Text>
                    {labelMap[addr] && (
                      <Text style={styles.addrSub} numberOfLines={1}>{addr}</Text>
                    )}
                  </View>

                  <TouchableOpacity
                    style={styles.editBtn}
                    onPress={() => onEdit(addr)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <AntDesign name="edit" size={17} color="rgba(255,255,255,0.4)" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => onDelete(addr)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Octicons name="trash" size={17} color={RED} />
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Add new address button */}
      <View style={styles.bottom}>
        <TouchableOpacity style={styles.addBtn} onPress={onAddNew} activeOpacity={0.85}>
          <Text style={styles.addBtnTxt}>Добавить новый адрес</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: BG },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20,
  },
  backBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerSub:   { color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 3 },
  headerTitle: { color: '#fff', fontSize: 24, fontWeight: '800' },

  scroll: { paddingHorizontal: 20, paddingTop: 4, flexGrow: 1 },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 12 },
  emptyTxt:  { color: 'rgba(255,255,255,0.4)', fontSize: 16, fontWeight: '600' },
  emptyHint: { color: 'rgba(255,255,255,0.25)', fontSize: 13, textAlign: 'center', lineHeight: 20 },

  list: { gap: 10 },

  addrCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: CARD, borderRadius: 18,
    borderWidth: 1, borderColor: BORDER,
    padding: 16,
  },
  addrCardActive: { borderColor: GREEN, backgroundColor: 'rgba(232,36,46,0.07)' },

  radioOuter: {
    width: 20, height: 20, borderRadius: 4,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  radioOuterActive: { borderColor: GREEN },
  radioInner: { width: 10, height: 10, borderRadius: 2, backgroundColor: GREEN },

  addrIconBox: { width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },

  addrTxt:       { flex: 1, color: 'rgba(255,255,255,0.65)', fontSize: 14, lineHeight: 20 },
  addrTxtActive: { color: '#fff', fontWeight: '600' },
  addrSub:       { color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: 2 },

  editBtn:   { padding: 4, marginRight: 4 },
  deleteBtn: { padding: 4 },

  bottom: {
    paddingHorizontal: 20, paddingBottom: 48, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: BORDER,
    backgroundColor: BG,
  },
  addBtn: {
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#E8242E', borderRadius: 30,
    paddingVertical: 18,
  },
  addBtnTxt: { color: '#fff', fontSize: 17, fontWeight: '700' },
});

