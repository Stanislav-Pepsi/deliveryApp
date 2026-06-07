import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Text from '../components/Text';
import { sendOtp, verifyOtp } from '../api/auth';

interface Props {
  onSuccess: (name: string, token: string, phone: string) => void;
}

export default function LoginScreen({ onSuccess }: Props) {
  const [name, setName]               = useState('');
  const [nameFocused, setNameFocused] = useState(false);
  const [phone, setPhone]             = useState('');
  const [focused, setFocused]         = useState(false);
  const [codeSent, setCodeSent]       = useState(false);
  const [code, setCode]               = useState('');
  const [codeFocused, setCodeFocused] = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [agreed, setAgreed]           = useState(false);

  const rawPhone = '+7' + phone.replace(/\s/g, '');

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
    setError('');
  };

  const handlePress = async () => {
    setError('');
    if (!codeSent) {
      if (phone.replace(/\s/g, '').length < 10) {
        setError('Введите номер телефона');
        return;
      }
      setLoading(true);
      try {
        await sendOtp(rawPhone);
        setCodeSent(true);
      } catch (e: any) {
        setError(e.message ?? 'Ошибка отправки кода');
      } finally {
        setLoading(false);
      }
    } else {
      if (code.length < 4) {
        setError('Введите 4-значный код');
        return;
      }
      setLoading(true);
      try {
        const result = await verifyOtp(rawPhone, code, name);
        onSuccess(result.user.name || name.trim() || 'Гость', result.accessToken, rawPhone);
      } catch (e: any) {
        setError(e.message ?? 'Неверный код');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      <View style={styles.content}>
        <Image
          source={require('../assets/star10_logo_without_bg.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        <Text style={styles.title}>
          <Text style={styles.titleWhite}>Авторизация</Text>
        </Text>


        <Text style={styles.label}>ИМЯ</Text>
        <View style={[styles.inputBox, nameFocused && styles.inputBoxFocused]}>
          <TextInput
            style={[styles.input, { paddingHorizontal: 16 }]}
            value={name}
            onChangeText={(t) => { setName(t); setError(''); }}
            placeholder="Введите ваше имя"
            placeholderTextColor="rgba(0,0,0,0.3)"
            returnKeyType="next"
            onFocus={() => setNameFocused(true)}
            onBlur={() => setNameFocused(false)}
            underlineColorAndroid="transparent"
            selectionColor={GREEN}
            cursorColor={GREEN}
            editable={!codeSent && !loading}
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
            placeholderTextColor="rgba(0,0,0,0.3)"
            maxLength={13}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            underlineColorAndroid="transparent"
            selectionColor={GREEN}
            cursorColor={GREEN}
            editable={!codeSent && !loading}
          />
        </View>

        {codeSent && (
          <>
            <Text style={styles.label}>КОД ИЗ SMS</Text>
            <View style={[styles.inputBox, codeFocused && styles.inputBoxFocused]}>
              <TextInput
                style={[styles.input, { paddingHorizontal: 16 }]}
                value={code}
                onChangeText={(t) => { setCode(t.replace(/\D/g, '').slice(0, 4)); setError(''); }}
                keyboardType="number-pad"
                placeholder="• • • •"
                placeholderTextColor="rgba(0,0,0,0.3)"
                maxLength={4}
                onFocus={() => setCodeFocused(true)}
                onBlur={() => setCodeFocused(false)}
                underlineColorAndroid="transparent"
                selectionColor={GREEN}
                cursorColor={GREEN}
                autoFocus
                editable={!loading}
              />
            </View>
          </>
        )}

        {!!error && <Text style={styles.errorTxt}>{error}</Text>}

        <TouchableOpacity style={styles.termsRow} activeOpacity={0.7} onPress={() => { if (!codeSent) setAgreed(v => !v); }} disabled={codeSent}>
          <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
            {agreed && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={[styles.terms, { flex: 1 }]}>
            {'Продолжая, вы соглашаетесь с '}
            <Text style={styles.termsLink}>условиями и политикой конфиденциальности</Text>
            {'.'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bottom}>
        <TouchableOpacity
          style={[styles.button, (loading || (!agreed && !codeSent)) && styles.buttonDisabled]}
          activeOpacity={0.85}
          onPress={handlePress}
          disabled={loading || (!agreed && !codeSent)}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.buttonText}>{codeSent ? 'Войти' : 'Получить код'}</Text>
          }
        </TouchableOpacity>
        {codeSent && !loading && (
          <TouchableOpacity onPress={() => { setCodeSent(false); setCode(''); setError(''); }}>
            <Text style={styles.resendTxt}>Отправить код повторно</Text>
          </TouchableOpacity>
        )}
        {!codeSent && (
          <Text style={styles.hint}>
            Не приходит SMS? Проверьте сигнал{'\n'}и не отключайте приложение во время получения кода.
          </Text>
        )}
      </View>
    </View>
  );
}

const GREEN        = '#8DBB00';
const GREEN_BORDER = '#6A9A00';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 56,
  },
  logo: { width: 160, height: 160, marginTop: -50, marginBottom: -30, alignSelf: 'center' },
  title:       { fontSize: 36, fontWeight: '800', marginBottom: 14, lineHeight: 44, textAlign: 'center' },
  titleWhite:  { color: '#111' },
  titleGreen:  { color: GREEN },
  subtitle: {
    color: 'rgba(0,0,0,0.45)',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 32,
    textAlign: 'center',
  },
  label: {
    color: 'rgba(0,0,0,0.4)',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.08)',
    paddingVertical: 2,
    paddingHorizontal: 4,
    marginBottom: 20,
  },
  inputBoxFocused: { borderColor: GREEN_BORDER },
  countryCodeBox: {
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRightWidth: 1,
    borderRightColor: 'rgba(0,0,0,0.1)',
    marginRight: 4,
  },
  countryCodeText: { color: '#111', fontSize: 17, fontWeight: '500' },
  input: {
    flex: 1,
    color: '#111',
    fontSize: 17,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  errorTxt: {
    color: '#e05252',
    fontSize: 13,
    marginTop: -12,
    marginBottom: 16,
    fontWeight: '500',
  },
  termsRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 4 },
  checkbox: {
    width: 20, height: 20, borderRadius: 5,
    borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center', justifyContent: 'center',
    marginTop: 1, flexShrink: 0,
  },
  checkboxChecked: { backgroundColor: GREEN, borderColor: GREEN },
  checkmark: { color: '#fff', fontSize: 12, fontWeight: '800' },
  terms:     { color: 'rgba(0,0,0,0.4)', fontSize: 13, lineHeight: 20 },
  termsLink: { color: GREEN },
  bottom: { paddingHorizontal: 24, paddingBottom: 36, gap: 16 },
  button: {
    backgroundColor: GREEN,
    borderRadius: 30,
    paddingVertical: 18,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '700', letterSpacing: 0.2 },
  resendTxt: {
    color: 'rgba(0,0,0,0.4)',
    fontSize: 14,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  hint: {
    color: 'rgba(0,0,0,0.3)',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
});
