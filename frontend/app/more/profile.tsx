import { Stack, useRouter } from 'expo-router';
import { ArrowLeft, Camera, ChevronRight, Check, Lock, ShieldCheck } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '@/src/api/client';
import { Avatar } from '@/src/components/Avatar';
import { Button, Card, Pill } from '@/src/components/ui';
import { useAuth } from '@/src/context/AuthContext';
import { colors, radii, spacing, typography } from '@/src/theme';

const AVATAR_OPTIONS = [
  'https://images.unsplash.com/photo-1600878459138-e1123b37cb30?w=200&q=70',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=70',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=70',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&q=70',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=70',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&q=70',
];

export default function ProfileScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [avatar, setAvatar] = useState<string>(user?.avatar ?? AVATAR_OPTIONS[0]);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [twofaEnabled, setTwofaEnabled] = useState(false);

  useEffect(() => {
    api<{ enabled: boolean }>('/auth/2fa/status').then((r) => setTwofaEnabled(r.enabled)).catch(() => {});
  }, []);

  async function save() {
    setBusy(true);
    try {
      await api('/auth/me', { method: 'PATCH', body: { name: name.trim(), avatar } });
      setToast('Profile updated');
      setTimeout(() => setToast(null), 1500);
    } catch (e: any) {
      setToast(e?.message ?? 'Failed to update');
      setTimeout(() => setToast(null), 2000);
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} testID="profile-back">
          <ArrowLeft size={20} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[typography.h3, { color: colors.text.primary, flex: 1, marginLeft: 8 }]}>Profile</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
          <Card style={{ alignItems: 'center', paddingVertical: spacing.lg }}>
            <Avatar uri={avatar} name={name} size={88} />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: spacing.md, flexWrap: 'wrap', justifyContent: 'center' }}>
              {AVATAR_OPTIONS.map((url) => {
                const active = url === avatar;
                return (
                  <TouchableOpacity
                    key={url}
                    testID={`profile-avatar-${url.slice(-12)}`}
                    onPress={() => setAvatar(url)}
                    style={[styles.avatarOption, active ? styles.avatarOptionActive : null]}
                  >
                    <Avatar uri={url} size={40} />
                    {active ? (
                      <View style={styles.avatarCheck}>
                        <Check size={12} color={colors.text.inverse} strokeWidth={3} />
                      </View>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          </Card>

          <View style={{ marginTop: spacing.md }}>
            <Text style={[typography.overline, { color: colors.text.tertiary, paddingHorizontal: 4, marginBottom: 6 }]}>NAME</Text>
            <TextInput
              testID="profile-name-input"
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor={colors.text.tertiary}
              style={styles.input}
            />
          </View>

          <View style={{ marginTop: spacing.md }}>
            <Text style={[typography.overline, { color: colors.text.tertiary, paddingHorizontal: 4, marginBottom: 6 }]}>EMAIL</Text>
            <View style={[styles.input, { justifyContent: 'center', backgroundColor: colors.bg.highlight }]}>
              <Text style={[typography.body, { color: colors.text.secondary }]}>{user?.email}</Text>
            </View>
          </View>

          <Button title="Save changes" onPress={save} loading={busy} fullWidth style={{ marginTop: spacing.lg }} testID="profile-save" />

          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => router.push('/more/security')}
            testID="profile-security"
          >
            <View style={styles.iconWrap}>
              <ShieldCheck size={16} color={colors.brand.royal} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[typography.bodyMed, { color: colors.text.primary }]}>Security & 2FA</Text>
              <Text style={[typography.caption, { color: colors.text.tertiary, marginTop: 2 }]}>
                Password and authenticator app
              </Text>
            </View>
            {twofaEnabled ? (
              <Pill label="On" bg={colors.status.successBg} fg={colors.status.successText} />
            ) : (
              <Pill label="Off" />
            )}
            <ChevronRight size={18} color={colors.text.tertiary} />
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {toast ? (
        <View style={styles.toast} pointerEvents="none">
          <Text style={[typography.caption, { color: colors.text.inverse, fontWeight: '600' }]}>{toast}</Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg.app },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.bg.app,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  iconBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: colors.bg.surface, borderWidth: 1, borderColor: colors.border.default,
    alignItems: 'center', justifyContent: 'center',
  },
  input: {
    backgroundColor: colors.bg.surface,
    borderWidth: 1, borderColor: colors.border.default, borderRadius: radii.md,
    paddingHorizontal: 14, height: 50, color: colors.text.primary, fontSize: 15,
  },
  avatarOption: {
    width: 44, height: 44, borderRadius: 999, padding: 2,
    borderWidth: 2, borderColor: 'transparent',
  },
  avatarOptionActive: { borderColor: colors.brand.royal },
  avatarCheck: {
    position: 'absolute', right: -2, bottom: -2,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: colors.brand.royal,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: colors.bg.surface,
  },
  iconWrap: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: colors.brand.light, alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  linkRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bg.surface,
    borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border.default,
    paddingHorizontal: spacing.md, paddingVertical: 14, marginTop: spacing.lg,
    gap: 8,
  },
  toast: {
    position: 'absolute', bottom: 28, alignSelf: 'center',
    backgroundColor: colors.brand.navy,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999,
  },
});
