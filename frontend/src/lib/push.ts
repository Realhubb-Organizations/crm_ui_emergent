// Push notification registration helper.
// Uses Emergent-managed push relay via /api/register-push.
// SAFE on web — early returns.
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { api } from '@/src/api/client';

let lastRegisteredUser: string | null = null;

export async function registerForPush(userId: string): Promise<void> {
  if (Platform.OS === 'web') return;
  if (lastRegisteredUser === userId) return; // dedupe per session
  try {
    const perm = await Notifications.requestPermissionsAsync();
    if (perm.status !== 'granted') return;

    const tokenResp = await Notifications.getDevicePushTokenAsync();
    await api('/register-push', {
      method: 'POST',
      body: {
        user_id: userId,
        platform: Platform.OS,
        device_token: tokenResp.data,
      },
    });
    lastRegisteredUser = userId;
  } catch (e) {
    // Push failure must never block UX — log only.
    // eslint-disable-next-line no-console
    console.warn('Push registration skipped:', e);
  }
}
