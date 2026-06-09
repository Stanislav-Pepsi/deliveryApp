import { registerRootComponent } from 'expo';
import App from './App';
import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance } from '@notifee/react-native';

const NOTIF_CHANNEL_ID = 'starten_default';

notifee.onBackgroundEvent(async () => {});

messaging().setBackgroundMessageHandler(async remoteMessage => {
  if (remoteMessage.notification) return;

  const channelId = await notifee.createChannel({
    id: NOTIF_CHANNEL_ID,
    name: 'Starten',
    importance: AndroidImportance.HIGH,
  });

  await notifee.displayNotification({
    title: String(remoteMessage.data?.title ?? ''),
    body:  String(remoteMessage.data?.body  ?? ''),
    data:  remoteMessage.data,
    android: {
      channelId,
      pressAction: { id: 'default' },
    },
  });
});

registerRootComponent(App);
