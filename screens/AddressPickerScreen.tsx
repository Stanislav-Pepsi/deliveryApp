import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Keyboard,
  PanResponder,
  Platform,
  StatusBar,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Region } from 'react-native-maps';
import Text from '../components/Text';
import { AddressInput } from '../api/addresses';

const MAPS_API_KEY  = 'AIzaSyC9C0sZBO1AhV_puFFPr062_qDYGOJSe-8';
const ANDROID_PKG   = 'starten.demo';
const ANDROID_CERT  = 'ADA81C4AB37ACC0E5859F96054A6665636CDB407';
const PLACE_HEADERS = { 'X-Android-Package': ANDROID_PKG, 'X-Android-Cert': ANDROID_CERT };

const GREEN  = '#E8242E';
const BG     = '#0a0a0a';
const CARD   = 'rgba(255,255,255,0.08)';
const BORDER = 'rgba(255,255,255,0.12)';

const DEFAULT_REGION: Region = {
  latitude: 42.9,
  longitude: 71.36,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};

interface Suggestion {
  place_id: string;
  description: string;
  main_text: string;
  secondary_text: string;
}

interface Props {
  initialAddress?: string;
  initialLabel?: string;
  onSave: (input: AddressInput, display: string) => void;
  onBack: () => void;
}

export default function AddressPickerScreen({ initialAddress, initialLabel, onSave, onBack }: Props) {
  const mapRef    = useRef<MapView>(null);
  const searchRef = useRef<TextInput>(null);

  const [region,      setRegion]      = useState<Region>(DEFAULT_REGION);
  const [searchText,  setSearchText]  = useState(initialAddress ?? '');
  const [label,       setLabel]       = useState(initialLabel ?? '');
  const [address,     setAddress]     = useState(initialAddress ?? '');
  const [entrance,    setEntrance]    = useState('');
  const [apartment,   setApartment]   = useState('');
  const [floor,       setFloor]       = useState('');
  const [geocoding,   setGeocoding]   = useState(false);
  const [dragging,    setDragging]    = useState(false);
  const [permDenied,  setPermDenied]  = useState(false);
  const [collapsed,   setCollapsed]   = useState(false);
  const [rawStreet,   setRawStreet]   = useState('');
  const [rawHouse,    setRawHouse]    = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  const sheetBottom = useRef(new Animated.Value(0)).current;
  const expandAnim  = useRef(new Animated.Value(1)).current;
  const [contentHeight, setContentHeight] = useState<number | null>(null);
  const collapsedRef = useRef(collapsed);
  useEffect(() => { collapsedRef.current = collapsed; }, [collapsed]);

  const toggleCollapsed = (next: boolean) => {
    setCollapsed(next);
    Animated.timing(expandAnim, { toValue: next ? 0 : 1, duration: 280, useNativeDriver: false }).start();
  };

  const sheetPanResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 12 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderRelease: (_, g) => {
        if (g.dy > 30 && !collapsedRef.current) toggleCollapsed(true);
        else if (g.dy < -30 && collapsedRef.current) toggleCollapsed(false);
      },
    })
  ).current;

  useEffect(() => {
    const showEv = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEv = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const onShow = Keyboard.addListener(showEv, e => {
      Animated.timing(sheetBottom, { toValue: e.endCoordinates.height, duration: 180, useNativeDriver: false }).start();
    });
    const onHide = Keyboard.addListener(hideEv, () => {
      Animated.timing(sheetBottom, { toValue: 0, duration: 180, useNativeDriver: false }).start();
    });
    return () => { onShow.remove(); onHide.remove(); };
  }, []);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setPermDenied(true); return; }
      try {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const r: Region = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          latitudeDelta: 0.008,
          longitudeDelta: 0.008,
        };
        setRegion(r);
        mapRef.current?.animateToRegion(r, 600);
        reverseGeocode(loc.coords.latitude, loc.coords.longitude);
      } catch {
        reverseGeocode(DEFAULT_REGION.latitude, DEFAULT_REGION.longitude);
      }
    })();
  }, []);

  const reverseGeocode = async (lat: number, lon: number) => {
    setGeocoding(true);
    try {
      const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
      if (results.length > 0) {
        const r = results[0];
        setRawStreet(r.street ?? '');
        setRawHouse(r.streetNumber ?? '');
        const parts = [r.street, r.streetNumber, r.city].filter(Boolean);
        const addr = parts.join(', ');
        if (addr) {
          setAddress(addr);
          setSearchText(addr);
          setSuggestions([]);
        }
      }
    } catch {} finally {
      setGeocoding(false);
    }
  };

  const goToMyLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const r: Region = {
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      latitudeDelta: 0.008,
      longitudeDelta: 0.008,
    };
    setRegion(r);
    mapRef.current?.animateToRegion(r, 500);
    reverseGeocode(loc.coords.latitude, loc.coords.longitude);
  };

  const handleRegionChangeComplete = (r: Region) => {
    setRegion(r);
    setDragging(false);
    reverseGeocode(r.latitude, r.longitude);
  };

  // Places Autocomplete API — возвращает подсказки по тексту
  const fetchSuggestions = async (text: string) => {
    if (text.trim().length < 2) { setSuggestions([]); return; }
    try {
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json`
        + `?input=${encodeURIComponent(text)}`
        + `&key=${MAPS_API_KEY}`
        + `&language=ru`
        + `&components=country:kz`
        + `&location=${region.latitude},${region.longitude}`
        + `&radius=30000`
        + `&strictbounds=true`;
      const resp = await fetch(url, { headers: PLACE_HEADERS });
      const data = await resp.json();
      if (data.predictions) {
        setSuggestions(
          data.predictions.slice(0, 3).map((p: any) => ({
            place_id:       p.place_id,
            description:    p.description,
            main_text:      p.structured_formatting?.main_text    ?? p.description,
            secondary_text: p.structured_formatting?.secondary_text ?? '',
          }))
        );
      }
    } catch {}
  };

  // Place Details API — получает координаты по place_id
  const selectSuggestion = async (s: Suggestion) => {
    setSuggestions([]);
    setSearchText(s.description);
    setAddress(s.description);
    Keyboard.dismiss();
    setGeocoding(true);
    try {
      const url = `https://maps.googleapis.com/maps/api/place/details/json`
        + `?place_id=${s.place_id}`
        + `&key=${MAPS_API_KEY}`
        + `&language=ru`
        + `&fields=geometry,formatted_address,address_components`;
      const resp = await fetch(url, { headers: PLACE_HEADERS });
      const data = await resp.json();
      if (data.result) {
        const { lat, lng } = data.result.geometry.location;
        const r: Region = { latitude: lat, longitude: lng, latitudeDelta: 0.008, longitudeDelta: 0.008 };
        setRegion(r);
        mapRef.current?.animateToRegion(r, 600);
        const comps = data.result.address_components ?? [];
        const getComp = (type: string) => comps.find((c: any) => c.types.includes(type))?.long_name ?? '';
        setRawStreet(getComp('route'));
        setRawHouse(getComp('street_number'));
        const formatted = data.result.formatted_address ?? s.description;
        setAddress(formatted);
        setSearchText(formatted);
      }
    } catch {} finally {
      setGeocoding(false);
    }
  };

  // Кнопка "Найти" — запрашивает подсказки по текущему тексту
  const handleSearch = () => {
    const text = searchText.trim();
    if (!text) { searchRef.current?.focus(); return; }
    fetchSuggestions(text);
  };

  const handleSave = () => {
    if (!address.trim()) return;
    const trimmed = address.trim();
    const street = rawStreet || trimmed.split(',')[0].trim();
    const details = [
      entrance.trim()  ? `под. ${entrance.trim()}`  : '',
      floor.trim()     ? `этаж ${floor.trim()}`     : '',
      apartment.trim() ? `кв. ${apartment.trim()}`  : '',
    ].filter(Boolean).join(', ');
    const display = details ? `${trimmed}, ${details}` : trimmed;
    onSave(
      {
        street,
        house:     rawHouse,
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
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={region}
        onRegionChange={() => setDragging(true)}
        onRegionChangeComplete={handleRegionChangeComplete}
        showsUserLocation
        showsMyLocationButton={false}
      />

      <View pointerEvents="none" style={styles.pinContainer}>
        <Ionicons
          name="location"
          size={48}
          color={GREEN}
          style={[styles.pinIcon, dragging && styles.pinIconLifted]}
        />
      </View>

      <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.85}>
        <Ionicons name="chevron-back" size={22} color="#fff" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.locBtn} onPress={goToMyLocation} activeOpacity={0.85}>
        <Ionicons name="locate-outline" size={22} color="#fff" />
      </TouchableOpacity>

      <Animated.View style={[styles.sheet, { bottom: sheetBottom }]}>
        <View {...sheetPanResponder.panHandlers}>
          <View style={styles.handle} />
          {collapsed
            ? <Text style={styles.collapsedSummary} numberOfLines={1}>{address.trim() || 'Укажите адрес'}</Text>
            : <Text style={styles.sheetTitle}>Укажите адрес</Text>
          }
        </View>

        <Animated.View
          style={{
            overflow: 'hidden',
            opacity: expandAnim,
            height: contentHeight === null
              ? undefined
              : expandAnim.interpolate({ inputRange: [0, 1], outputRange: [0, contentHeight] }),
          }}
        >
          <View
            onLayout={e => {
              const h = e.nativeEvent.layout.height;
              if (!collapsedRef.current && h > 0 && h !== contentHeight) setContentHeight(h);
            }}
          >
            {/* Название адреса */}
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={label}
                onChangeText={setLabel}
                placeholder="Название адреса"
                placeholderTextColor="rgba(255,255,255,0.3)"
                returnKeyType="next"
                selectionColor={GREEN}
              />
            </View>

            {/* Поиск адреса */}
            <View style={styles.searchRow}>
              <Ionicons name="location-outline" size={18} color={GREEN} style={styles.searchIcon} />
              <TextInput
                ref={searchRef}
                style={styles.searchInput}
                value={searchText}
                onChangeText={text => { setSearchText(text); fetchSuggestions(text); }}
                placeholder="Введите адрес"
                placeholderTextColor="rgba(255,255,255,0.3)"
                selectionColor={GREEN}
                returnKeyType="search"
                onSubmitEditing={handleSearch}
              />
              {geocoding && <ActivityIndicator size="small" color={GREEN} style={{ marginLeft: 8, marginRight: 4 }} />}
            </View>

            {/* Подсказки Places Autocomplete */}
            {suggestions.length > 0 && (
              <View style={styles.suggestionsList}>
                {suggestions.map((s, i) => (
                  <TouchableOpacity
                    key={s.place_id}
                    style={[styles.suggestionRow, i > 0 && styles.suggestionBorder]}
                    onPress={() => selectSuggestion(s)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="home-outline" size={14} color="rgba(255,255,255,0.35)" style={{ marginRight: 10 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.suggestionMain} numberOfLines={1}>{s.main_text}</Text>
                      {!!s.secondary_text && (
                        <Text style={styles.suggestionSec} numberOfLines={1}>{s.secondary_text}</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Детали */}
            <View style={styles.detailsRow}>
              <View style={[styles.detailField, { flex: 1 }]}>
                <Text style={styles.detailLabel}>Подъезд</Text>
                <TextInput style={styles.detailInput} value={entrance} onChangeText={setEntrance} placeholder="—" placeholderTextColor="rgba(255,255,255,0.25)" keyboardType="numeric" selectionColor={GREEN} textAlign="center" />
              </View>
              <View style={[styles.detailField, { flex: 1 }]}>
                <Text style={styles.detailLabel}>Этаж</Text>
                <TextInput style={styles.detailInput} value={floor} onChangeText={setFloor} placeholder="—" placeholderTextColor="rgba(255,255,255,0.25)" keyboardType="numeric" selectionColor={GREEN} textAlign="center" />
              </View>
              <View style={[styles.detailField, { flex: 1 }]}>
                <Text style={styles.detailLabel}>Квартира</Text>
                <TextInput style={styles.detailInput} value={apartment} onChangeText={setApartment} placeholder="—" placeholderTextColor="rgba(255,255,255,0.25)" keyboardType="numeric" selectionColor={GREEN} textAlign="center" />
              </View>
            </View>

            {permDenied && (
              <Text style={styles.permNote}>Разрешение на геолокацию не выдано — двигайте карту вручную.</Text>
            )}
          </View>
        </Animated.View>

        <TouchableOpacity
          style={[styles.saveBtn, !address.trim() && styles.saveBtnDisabled]}
          onPress={handleSave}
          activeOpacity={0.85}
          disabled={!address.trim()}
        >
          <Text style={styles.saveBtnTxt}>Сохранить адрес</Text>
        </TouchableOpacity>

        <View style={{ height: Platform.OS === 'android' ? 60 : 36 }} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  map:  { flex: 1 },

  pinContainer: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
  },
  pinIcon:       { marginTop: -48 },
  pinIconLifted: { transform: [{ translateY: -10 }] },

  backBtn: {
    position: 'absolute', top: 52, left: 20,
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(12,15,10,0.8)',
    alignItems: 'center', justifyContent: 'center',
  },
  locBtn: {
    position: 'absolute', top: 52, right: 20,
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(12,15,10,0.8)',
    alignItems: 'center', justifyContent: 'center',
  },

  sheet: {
    position: 'absolute', left: 0, right: 0,
    backgroundColor: BG,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: BORDER,
  },
  handle:           { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'center', marginBottom: 18 },
  sheetTitle:       { color: '#fff', fontSize: 17, fontWeight: '700', marginBottom: 16, textAlign: 'center' },
  collapsedSummary: { color: 'rgba(255,255,255,0.6)', fontSize: 14, marginBottom: 16, textAlign: 'center' },

  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: CARD, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 2,
    marginBottom: 10,
  },
  input: { flex: 1, color: '#fff', fontSize: 15, paddingVertical: 14 },

  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: CARD, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 2,
    marginBottom: 4,
  },
  searchIcon:  { marginRight: 8 },
  searchInput: { flex: 1, color: '#fff', fontSize: 15, paddingVertical: 14 },
  searchBtn:    { marginLeft: 8, backgroundColor: GREEN, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  searchBtnTxt: { color: '#fff', fontSize: 13, fontWeight: '700' },

  suggestionsList: {
    backgroundColor: '#1a1f17',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 10,
    overflow: 'hidden',
  },
  suggestionRow:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12 },
  suggestionBorder: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.07)' },
  suggestionMain:   { color: '#fff', fontSize: 14, fontWeight: '500' },
  suggestionSec:    { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 2 },

  detailsRow: { flexDirection: 'row', gap: 8, marginBottom: 14, marginTop: 6 },
  detailField: {
    backgroundColor: CARD, borderRadius: 12,
    paddingHorizontal: 8, paddingTop: 8, paddingBottom: 4,
    alignItems: 'center',
  },
  detailLabel: { color: 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: '700', letterSpacing: 0.8, marginBottom: 2, textAlign: 'center' },
  detailInput: { color: '#fff', fontSize: 15, paddingVertical: 6, textAlign: 'center', width: '100%' },

  permNote: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginBottom: 12, lineHeight: 18 },

  saveBtn:         { backgroundColor: '#E8242E', borderRadius: 30, paddingVertical: 18, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnTxt:      { color: '#fff', fontSize: 17, fontWeight: '700' },
});

