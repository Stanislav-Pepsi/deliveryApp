import { useEffect, useRef } from 'react';
import { Alert, Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import { registerDeviceToken, unregisterDeviceToken } from '../api/deviceTokens';

export interface NotifData {
  type?: 'order' | 'reservation' | 'loyalty' | 'new_order' | 'announcement';
  orderId?: string;
  reservationId?: string;
}

export function usePushNotifications(
  authToken: string | null,
  onNavigate: (data: NotifData) => void,
) {
  const tokenRef    = useRef<string | null>(null);
  const navigateRef = useRef(onNavigate);
  useEffect(() => { navigateRef.current = onNavigate; }, [onNavigate]);

  // One-time: handle taps from background / terminated state
  useEffect(() => {
    const unsubBg = messaging().onNotificationOpenedApp(msg => {
      if (msg.data?.type) navigateRef.current(msg.data as NotifData);
    });

    messaging()
      .getInitialMessage()
      .then(msg => {
        if (msg?.data?.type) navigateRef.current(msg.data as NotifData);
      })
      .catch(() => {});

    return () => unsubBg();
  }, []);

  // Auth-dependent: request permission, register token, foreground handler
  useEffect(() => {
    if (!authToken) return;
    let cancelled = false;

    const setup = async () => {
      const status = await messaging().requestPermission();
      const allowed =
        status === messaging.AuthorizationStatus.AUTHORIZED ||
        status === messaging.AuthorizationStatus.PROVISIONAL;
      if (!allowed || cancelled) return;

      const fcmToken = await messaging().getToken();
      if (cancelled) return;
      tokenRef.current = fcmToken;

      await registerDeviceToken(
        fcmToken,
        Platform.OS === 'ios' ? 'ios' : 'android',
        authToken,
      );
    };

    setup().catch(() => {});

    const unsubFg = messaging().onMessage(async msg => {
      const data  = (msg.data ?? {}) as NotifData;
      const title = msg.notification?.title ?? '';
      const body  = msg.notification?.body  ?? '';
      if (!title && !body) return;
      Alert.alert(title, body, [
        { text: 'Закрыть', style: 'cancel' },
        ...(data.type
          ? [{ text: 'Открыть', onPress: () => navigateRef.current(data) }]
          : []),
      ]);
    });

    return () => {
      cancelled = true;
      unsubFg();
    };
  }, [authToken]);

  return {
    unregisterToken: () => {
      const t = tokenRef.current;
      if (t && authToken) unregisterDeviceToken(t, authToken).catch(() => {});
      tokenRef.current = null;
    },
  };
}
