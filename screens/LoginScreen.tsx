import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
  ImageBackground,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface Props {
  onSuccess: (name: string) => void;
}

export default function LoginScreen({ onSuccess }: Props) {
  const [name, setName]         = useState('');
  const [nameFocused, setNameFocused] = useState(false);
  const [phone, setPhone] = useState('');
  const [focused, setFocused] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState('');
  const [codeFocused, setCodeFocused] = useState(false);

  const formatPhone = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 10);
    let formatted = '';
    if (digits.length <= 3) {
      formatted = digits;
    } else if (digits.length <= 6) {
      formatted = `${digits.slice(0, 3)} ${digits.slice(3)}`;
    } else if (digits.length <= 8) {
      formatted = `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
    } else {
      formatted = `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 8)} ${digits.slice(8)}`;
    }
    setPhone(formatted);
  };

  const handlePress = () => {
    if (!codeSent) {
      setCodeSent(true);
    } else {
      onSuccess(name.trim() || 'Гость');
    }
  };

  return (
    <ImageBackground
      source={require('../assets/pexels-esra-afsar-123882149-29637358.jpg')}
      style={styles.root}
      resizeMode="cover"
    >
      <View style={styles.overlay} />
      <StatusBar style="light" />

      <View style={styles.content}>
        <View style={styles.logoRow}>
          <Text style={styles.logoText}>ba</Text>
          <Text style={styles.logoGreen}>silic</Text>
        </View>

        <Text style={styles.title}>
          <Text style={styles.titleWhite}>Войти в </Text>
          <Text style={styles.titleGreen}>Базилик</Text>
        </Text>

        <Text style={styles.subtitle}>
          Введите номер телефона — мы отправим SMS-код,{'\n'}чтобы подтвердить, что это вы.
        </Text>

        <Text style={styles.label}>ИМЯ</Text>
        <View style={[styles.inputBox, nameFocused && styles.inputBoxFocused]}>
          <TextInput
            style={[styles.input, { paddingHorizontal: 16 }]}
            value={name}
            onChangeText={setName}
            placeholder="Введите ваше имя"
            placeholderTextColor="rgba(255,255,255,0.35)"
            returnKeyType="next"
            onFocus={() => setNameFocused(true)}
            onBlur={() => setNameFocused(false)}
            underlineColorAndroid="transparent"
            selectionColor={GREEN}
            cursorColor={GREEN}
            editable={!codeSent}
          />
        </View>

        <Text style={styles.label}>ТЕЛЕФОН</Text>

        <View style={[styles.inputBox, focused && styles.inputBoxFocused]}>
          <View style={styles.countryCodeBox}>
            <Text style={styles.countryCodeText}>KZ +7</Text>
          </View>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={formatPhone}
            keyboardType="phone-pad"
            placeholder="777 123 45 67"
            placeholderTextColor="rgba(255,255,255,0.35)"
            maxLength={13}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            underlineColorAndroid="transparent"
            selectionColor={GREEN}
            cursorColor={GREEN}
          />
        </View>

        {codeSent && (
          <>
            <Text style={styles.label}>КОД ИЗ SMS</Text>
            <View style={[styles.inputBox, codeFocused && styles.inputBoxFocused]}>
              <TextInput
                style={[styles.input, { paddingHorizontal: 16 }]}
                value={code}
                onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
                keyboardType="number-pad"
                placeholder="• • • • • •"
                placeholderTextColor="rgba(255,255,255,0.35)"
                maxLength={6}
                onFocus={() => setCodeFocused(true)}
                onBlur={() => setCodeFocused(false)}
                underlineColorAndroid="transparent"
                selectionColor={GREEN}
                cursorColor={GREEN}
                autoFocus
              />
            </View>
          </>
        )}

        <Text style={styles.terms}>
          {'Продолжая, вы соглашаетесь с '}
          <Text style={styles.termsLink}>условиями и{'\n'}политикой конфиденциальности</Text>
          {'.'}
        </Text>
      </View>

      <View style={styles.bottom}>
        <TouchableOpacity style={styles.button} activeOpacity={0.85} onPress={handlePress}>
          <Text style={styles.buttonText}>
            {codeSent ? 'Войти' : 'Получить код'}
          </Text>
        </TouchableOpacity>
        <Text style={styles.hint}>
          Не приходит SMS? Проверьте сигнал{'\n'}и не отключайте приложение во время получения кода.
        </Text>
      </View>
    </ImageBackground>
  );
}

const GREEN = '#8DBB00';
const GREEN_BORDER = '#6A9A00';

const styles = StyleSheet.create({
  root: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,12,8,0.78)',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 56,
  },
  logoRow: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  logoText: { color: '#fff', fontSize: 18, fontWeight: '700', letterSpacing: 0.3 },
  logoGreen: { color: GREEN, fontSize: 18, fontWeight: '700', letterSpacing: 0.3 },
  title: { fontSize: 36, fontWeight: '800', marginBottom: 14, lineHeight: 44 },
  titleWhite: { color: '#fff' },
  titleGreen: { color: GREEN },
  subtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 32,
  },
  label: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 2,
    paddingHorizontal: 4,
    marginBottom: 20,
  },
  inputBoxFocused: { borderColor: GREEN_BORDER },
  countryCodeBox: {
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.15)',
    marginRight: 4,
  },
  countryCodeText: { color: '#fff', fontSize: 17, fontWeight: '500' },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 17,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  terms: { color: 'rgba(255,255,255,0.45)', fontSize: 13, lineHeight: 20 },
  termsLink: { color: GREEN },
  bottom: { paddingHorizontal: 24, paddingBottom: 36, gap: 16 },
  button: {
    backgroundColor: GREEN,
    borderRadius: 30,
    paddingVertical: 18,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '700', letterSpacing: 0.2 },
  hint: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
});
