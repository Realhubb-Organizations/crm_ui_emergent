import { Stack, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { LogBox, Platform, StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '@/src/context/AuthContext';
import { useIconFonts } from '@/src/hooks/use-icon-fonts';
import { registerForPush } from '@/src/lib/push';

LogBox.ignoreAllLogs(true);

// --- Push: configure foreground display + Android channel at MODULE SCOPE ---
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

if (Platform.OS === 'android') {
  // Channel must exist before any push arrives.
  Notifications.setNotificationChannelAsync('default', {
    name: 'Default',
    importance: Notifications.AndroidImportance.MAX,
    sound: 'default',
  });
}

// Keep splash visible until icon fonts register.
SplashScreen.preventAutoHideAsync();

function PushAndTapBridge() {
  const router = useRouter();
  const { user } = useAuth();

  // Re-register on every login / app open (tokens rotate).
  useEffect(() => {
    if (user?.id) registerForPush(user.id);
  }, [user?.id]);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    const handleNav = (url: unknown) => {
      if (typeof url !== 'string' || !url) return;
      if (url.startsWith('http')) Linking.openURL(url);
      else router.push(url as never);
    };

    // Warm tap — user taps while app is open.
    const tapSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = (response.notification.request.content.data ?? {}) as Record<string, unknown>;
      handleNav(data.deeplink ?? data.action_url);
    });

    // Cold start tap — app was killed.
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) return;
      const data = (response.notification.request.content.data ?? {}) as Record<string, unknown>;
      handleNav(data.deeplink ?? data.action_url);
    });

    return () => tapSub.remove();
  }, [router]);

  return null;
}

export default function RootLayout() {
  const [loaded, error] = useIconFonts();

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <AuthProvider>
        <PushAndTapBridge />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#F8FAFC' } }} />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
