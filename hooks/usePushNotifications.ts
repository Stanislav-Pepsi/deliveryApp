import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import {
  getMessaging,
  getToken,
  onMessage,
  requestPermission,
  AuthorizationStatus,
} from '@react-native-firebase/messaging';
import notifee, { EventType } from '@notifee/react-native';
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

  // One-time: handle taps from terminated state and foreground/background press
  useEffect(() => {
    // Terminated: app opened via notification tap
    notifee.getInitialNotification().then(initial => {
      if (initial?.notification?.data?.type) {
        navigateRef.current(initial.notification.data as NotifData);
      }
    }).catch(() => {});

    // Background/foreground: user taps notification while app is alive
    const unsub = notifee.onForegroundEvent(({ type, detail }) => {
      if (type === EventType.PRESS && detail.notification?.data?.type) {
        navigateRef.current(detail.notification.data as NotifData);
      }
    });

    return () => unsub();
  }, []);

  // Auth-dependent: request permission, register token, suppress foreground notifications
  useEffect(() => {
    if (!authToken) return;

    let messaging: ReturnType<typeof getMessaging>;
    try { messaging = getMessaging(); } catch { return; }

    let cancelled = false;

    const setup = async () => {
      const status = await requestPermission(messaging);
      const allowed =
        status === AuthorizationStatus.AUTHORIZED ||
        status === AuthorizationStatus.PROVISIONAL;
      if (!allowed || cancelled) return;

      const fcmToken = await getToken(messaging);
      if (cancelled) return;
      tokenRef.current = fcmToken;

      await registerDeviceToken(
        fcmToken,
        Platform.OS === 'ios' ? 'ios' : 'android',
        authToken,
      );
    };

    setup().catch(() => {});

    // Suppress foreground notifications — shown only when app is in background/terminated
    const unsubFg = onMessage(messaging, async () => {});

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
