import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Region } from 'react-native-maps';

const GREEN      = '#8DBB00';
const GREEN_DARK = '#4a6600';
const BG         = '#0c0f0a';
const CARD       = 'rgba(255,255,255,0.08)';
const BORDER     = 'rgba(255,255,255,0.12)';

// Default: Almaty, Kazakhstan
const DEFAULT_REGION: Region = {
  latitude: 43.2220,
  longitude: 76.8512,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};

interface Props {
  initialAddress?: string;
  onSave: (address: string) => void;
  onBack: () => void;
}

export default function AddressPickerScreen({ initialAddress, onSave, onBack }: Props) {
  const mapRef  = useRef<MapView>(null);
  const [region, setRegion]         = useState<Region>(DEFAULT_REGION);
  const [address, setAddress]       = useState(initialAddress ?? '');
  const [geocoding, setGeocoding]   = useState(false);
  const [dragging, setDragging]     = useState(false);
  const [permDenied, setPermDenied] = useState(false);

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
        const parts = [r.street, r.streetNumber, r.city].filter(Boolean);
        if (parts.length > 0) setAddress(parts.join(', '));
      }
    } catch {
      // keep current address
    } finally {
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

  const handleSave = () => {
    if (address.trim()) {
      onSave(address.trim());
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Map */}
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={region}
        onRegionChange={() => { setDragging(true); }}
        onRegionChangeComplete={handleRegionChangeComplete}
        showsUserLocation
        showsMyLocationButton={false}
      />

      {/* Centred pin */}
      <View pointerEvents="none" style={styles.pinContainer}>
        <Ionicons
          name="location"
          size={48}
          color={GREEN}
          style={[styles.pinIcon, dragging && styles.pinIconLifted]}
        />
      </View>

      {/* Back button */}
      <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.85}>
        <Ionicons name="chevron-back" size={22} color="#fff" />
      </TouchableOpacity>

      {/* My location button */}
      <TouchableOpacity style={styles.locBtn} onPress={goToMyLocation} activeOpacity={0.85}>
        <Ionicons name="locate-outline" size={22} color="#fff" />
      </TouchableOpacity>

      {/* Bottom sheet */}
      <View style={styles.sheet}>
        <View style={styles.handle} />

        <Text style={styles.sheetTitle}>Укажите адрес</Text>

        {/* Address input */}
        <View style={styles.inputRow}>
          <Ionicons name="location-outline" size={20} color={GREEN} style={{ marginRight: 10 }} />
          <TextInput
            style={styles.input}
            value={address}
            onChangeText={setAddress}
            placeholder="Введите адрес вручную"
            placeholderTextColor="rgba(255,255,255,0.3)"
            returnKeyType="done"
            onSubmitEditing={() => Keyboard.dismiss()}
            selectionColor={GREEN}
          />
          {geocoding && <ActivityIndicator size="small" color={GREEN} style={{ marginLeft: 8 }} />}
        </View>

        {permDenied && (
          <Text style={styles.permNote}>
            Разрешение на геолокацию не выдано — двигайте карту вручную.
          </Text>
        )}

        <TouchableOpacity
          style={[styles.saveBtn, !address.trim() && styles.saveBtnDisabled]}
          onPress={handleSave}
          activeOpacity={0.85}
          disabled={!address.trim()}
        >
          <Text style={styles.saveBtnTxt}>Сохранить адрес</Text>
        </TouchableOpacity>

        <View style={{ height: Platform.OS === 'android' ? 60 : 36 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  map:  { flex: 1 },

  pinContainer: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
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
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: BG,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 24, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: BORDER,
  },
  handle:     { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'center', marginBottom: 18 },
  sheetTitle: { color: '#fff', fontSize: 17, fontWeight: '700', marginBottom: 16 },

  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: CARD, borderRadius: 14,
    borderWidth: 1, borderColor: BORDER,
    paddingHorizontal: 14, paddingVertical: 2,
    marginBottom: 16,
  },
  input: { flex: 1, color: '#fff', fontSize: 15, paddingVertical: 14 },

  permNote: {
    color: 'rgba(255,255,255,0.4)', fontSize: 12,
    marginBottom: 12, lineHeight: 18,
  },

  saveBtn:         { backgroundColor: GREEN_DARK, borderRadius: 30, paddingVertical: 17, alignItems: 'center', borderWidth: 1, borderColor: GREEN },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnTxt:      { color: '#fff', fontSize: 16, fontWeight: '700' },
});
