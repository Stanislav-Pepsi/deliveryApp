import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useState } from 'react';
import {
  ActivityIndicator,
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
import { AddressInput } from '../api/addresses';

const GREEN      = '#8DBB00';
const GREEN_DARK = '#4a6600';
const BG         = '#0c0f0a';
const CARD       = 'rgba(255,255,255,0.07)';
const BORDER     = 'rgba(255,255,255,0.1)';

interface Props {
  initialAddress?: string;
  initialLabel?: string;
  onSave: (input: AddressInput, display: string) => void;
  onBack: () => void;
}

export default function AddressPickerScreen({ initialAddress, initialLabel, onSave, onBack }: Props) {
  const [address,   setAddress]   = useState(initialAddress ?? '');
  const [label,     setLabel]     = useState(initialLabel ?? '');
  const [entrance,  setEntrance]  = useState('');
  const [apartment, setApartment] = useState('');
  const [floor,     setFloor]     = useState('');
  const [locating,  setLocating]  = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [rawStreet, setRawStreet] = useState('');
  const [rawHouse,  setRawHouse]  = useState('');
  const [city,      setCity]      = useState('');

  const reverseGeocode = async (lat: number, lon: number) => {
    try {
      const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
      if (results.length > 0) {
        const r = results[0];
        setRawStreet(r.street ?? '');
        setRawHouse(r.streetNumber ?? '');
        setCity(r.city ?? '');
        const parts = [r.street, r.streetNumber, r.city].filter(Boolean);
        if (parts.length > 0) setAddress(parts.join(', '));
      }
    } catch {}
  };

  const useMyLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      await reverseGeocode(loc.coords.latitude, loc.coords.longitude);
    } catch {} finally {
      setLocating(false);
    }
  };

  const findByAddress = async () => {
    const trimmed = address.trim();
    if (!trimmed) return;
    const biased = city && !trimmed.toLowerCase().includes(city.toLowerCase())
      ? `${trimmed}, ${city}`
      : trimmed;
    setGeocoding(true);
    try {
      const results = await Location.geocodeAsync(biased);
      if (results.length > 0) {
        await reverseGeocode(results[0].latitude, results[0].longitude);
      }
    } catch {} finally {
      setGeocoding(false);
    }
  };

  const handleSave = () => {
    if (!address.trim()) return;
    const trimmed = address.trim();
    const street = rawStreet || trimmed.split(',')[0].trim();
    const house  = rawHouse  || (() => {
      const i = trimmed.lastIndexOf(' ');
      return i === -1 ? '' : trimmed.substring(i + 1);
    })();

    const details = [
      entrance.trim()  ? `под. ${entrance.trim()}`  : '',
      floor.trim()     ? `этаж ${floor.trim()}`     : '',
      apartment.trim() ? `кв. ${apartment.trim()}`  : '',
    ].filter(Boolean).join(', ');
    const display = details ? `${trimmed}, ${details}` : trimmed;

    onSave(
      {
        street,
        house: house.trim() || rawHouse,
        apartment: apartment.trim() || undefined,
        entrance:  entrance.trim()  || undefined,
        floor:     floor.trim()     || undefined,
        label:     label.trim()     || undefined,
      } as any,
      display,
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.8}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.headerSub}>ДОСТАВКА</Text>
          <Text style={styles.headerTitle}>Адрес доставки</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* My location */}
          <TouchableOpacity style={styles.locBtn} onPress={useMyLocation} activeOpacity={0.8} disabled={locating}>
            {locating
              ? <ActivityIndicator size="small" color={GREEN} />
              : <Ionicons name="locate-outline" size={18} color={GREEN} />
            }
            <Text style={styles.locBtnTxt}>Определить моё местоположение</Text>
          </TouchableOpacity>

          <Text style={styles.sectionLabel}>НАЗВАНИЕ АДРЕСА</Text>
          <View style={styles.inputBox}>
            <TextInput
              style={styles.input}
              value={label}
              onChangeText={setLabel}
              placeholder="Дом, Работа..."
              placeholderTextColor="rgba(255,255,255,0.25)"
              returnKeyType="next"
              selectionColor={GREEN}
            />
          </View>

          <Text style={styles.sectionLabel}>УЛИЦА И ДОМ</Text>
          <View style={[styles.inputBox, styles.inputBoxRow]}>
            <Ionicons name="location-outline" size={18} color={GREEN} style={{ marginRight: 8 }} />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={address}
              onChangeText={setAddress}
              placeholder="Введите адрес"
              placeholderTextColor="rgba(255,255,255,0.25)"
              returnKeyType="search"
              onSubmitEditing={findByAddress}
              selectionColor={GREEN}
            />
            {geocoding
              ? <ActivityIndicator size="small" color={GREEN} style={{ marginLeft: 8 }} />
              : (
                <TouchableOpacity
                  style={[styles.findBtn, !address.trim() && { opacity: 0.4 }]}
                  onPress={findByAddress}
                  disabled={!address.trim()}
                  activeOpacity={0.8}
                >
                  <Text style={styles.findBtnTxt}>Найти</Text>
                </TouchableOpacity>
              )
            }
          </View>

          <Text style={styles.sectionLabel}>ДЕТАЛИ</Text>
          <View style={styles.detailsRow}>
            <View style={[styles.detailBox, { flex: 1 }]}>
              <Text style={styles.detailLabel}>Подъезд</Text>
              <TextInput
                style={styles.detailInput}
                value={entrance}
                onChangeText={setEntrance}
                placeholder="—"
                placeholderTextColor="rgba(255,255,255,0.2)"
                keyboardType="numeric"
                selectionColor={GREEN}
                textAlign="center"
              />
            </View>
            <View style={[styles.detailBox, { flex: 1 }]}>
              <Text style={styles.detailLabel}>Этаж</Text>
              <TextInput
                style={styles.detailInput}
                value={floor}
                onChangeText={setFloor}
                placeholder="—"
                placeholderTextColor="rgba(255,255,255,0.2)"
                keyboardType="numeric"
                selectionColor={GREEN}
                textAlign="center"
              />
            </View>
            <View style={[styles.detailBox, { flex: 1 }]}>
              <Text style={styles.detailLabel}>Квартира</Text>
              <TextInput
                style={styles.detailInput}
                value={apartment}
                onChangeText={setApartment}
                placeholder="—"
                placeholderTextColor="rgba(255,255,255,0.2)"
                keyboardType="numeric"
                selectionColor={GREEN}
                textAlign="center"
              />
            </View>
          </View>

          <View style={{ height: 24 }} />
        </ScrollView>

        <View style={styles.bottom}>
          <TouchableOpacity
            style={[styles.saveBtn, !address.trim() && styles.saveBtnDisabled]}
            onPress={handleSave}
            activeOpacity={0.85}
            disabled={!address.trim()}
          >
            <Text style={styles.saveBtnTxt}>Сохранить адрес</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

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

  scroll: { paddingHorizontal: 20, paddingTop: 4 },

  locBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(141,187,0,0.1)',
    borderWidth: 1, borderColor: GREEN_DARK,
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
    marginBottom: 24,
  },
  locBtnTxt: { color: GREEN, fontSize: 14, fontWeight: '600' },

  sectionLabel: {
    color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: '700',
    letterSpacing: 1.5, marginBottom: 10,
  },

  inputBox: {
    backgroundColor: CARD, borderRadius: 14,
    borderWidth: 1, borderColor: BORDER,
    paddingHorizontal: 16, paddingVertical: 2,
    marginBottom: 20,
  },
  inputBoxRow: {
    flexDirection: 'row', alignItems: 'center',
  },
  input: { color: '#fff', fontSize: 15, paddingVertical: 14 },

  findBtn: {
    backgroundColor: 'rgba(141,187,0,0.12)',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8,
    marginLeft: 8,
  },
  findBtnTxt: { color: GREEN, fontSize: 13, fontWeight: '700' },

  detailsRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  detailBox: {
    backgroundColor: CARD, borderRadius: 14,
    borderWidth: 1, borderColor: BORDER,
    paddingHorizontal: 8, paddingTop: 10, paddingBottom: 8,
    alignItems: 'center',
  },
  detailLabel: {
    color: 'rgba(255,255,255,0.35)', fontSize: 10,
    fontWeight: '700', letterSpacing: 0.8, marginBottom: 4,
  },
  detailInput: { color: '#fff', fontSize: 16, paddingVertical: 4, width: '100%' },

  bottom: {
    paddingHorizontal: 20, paddingBottom: Platform.OS === 'android' ? 32 : 24, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: BORDER,
    backgroundColor: BG,
  },
  saveBtn:         { backgroundColor: GREEN, borderRadius: 30, paddingVertical: 18, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnTxt:      { color: '#fff', fontSize: 17, fontWeight: '700' },
});
