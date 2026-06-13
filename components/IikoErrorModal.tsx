import { Ionicons } from '@expo/vector-icons';
import { Linking, Modal, StyleSheet, TouchableOpacity, View } from 'react-native';
import Text from './Text';

interface Props {
  visible: boolean;
  onClose: () => void;
  phone?: string | null;
}

export default function IikoErrorModal({ visible, onClose, phone }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons name="alert-circle-outline" size={52} color="#e05252" />
          </View>
          <Text style={styles.title}>Что-то пошло не так..</Text>
          <Text style={styles.subtitle}>
            Попробуйте позвонить в ресторан и уточнить детали
          </Text>
          {!!phone && (
            <TouchableOpacity
              style={styles.callBtn}
              onPress={() => Linking.openURL(`tel:${phone}`)}
              activeOpacity={0.85}
            >
              <Ionicons name="call-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.callBtnTxt}>Позвонить менеджеру</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.closeBtnTxt}>Закрыть</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 24,
    width: '100%',
    alignItems: 'center',
  },
  iconWrap: { marginBottom: 16 },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111',
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 26,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(0,0,0,0.5)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8242E',
    borderRadius: 30,
    paddingVertical: 16,
    paddingHorizontal: 28,
    width: '100%',
    justifyContent: 'center',
    marginBottom: 12,
  },
  callBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },
  closeBtn:   { paddingVertical: 8 },
  closeBtnTxt: { color: 'rgba(0,0,0,0.4)', fontSize: 14, textDecorationLine: 'underline' },
});

