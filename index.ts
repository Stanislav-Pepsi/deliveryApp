import { registerRootComponent } from 'expo';
import App from './App';
import notifee, { AndroidImportance, EventType } from '@notifee/react-native';

const NOTIF_CHANNEL_ID = 'starten_default';

// Required by notifee — must be registered at top level
notifee.onBackgroundEvent(async ({ type, detail }) => {
  // Foreground event handler in usePushNotifications will handle navigation
  // when app comes to foreground after press
});

try {
  const { getMessaging, setBackgroundMessageHandler } = require('@react-native-firebase/messaging');
  setBackgroundMessageHandler(getMessaging(), async (message: any) => {
    if (message.notification) return;

    const channelId = await notifee.createChannel({
      id: NOTIF_CHANNEL_ID,
      name: 'Starten',
      importance: AndroidImportance.HIGH,
    });

    await notifee.displayNotification({
      title: String(message.data?.title ?? ''),
      body:  String(message.data?.body  ?? ''),
      data:  message.data,
      android: {
        channelId,
        smallIcon: 'ic_notification',
        pressAction: { id: 'default' },
      },
    });
  });
} catch {}

registerRootComponent(App);
