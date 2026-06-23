import { Stack, useRouter } from 'expo-router';
import { ArrowLeft, Check, Copy, Eye, EyeOff, KeyRound, ShieldCheck, ShieldOff } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';

import { api } from '@/src/api/client';
import { Button, Card, Pill } from '@/src/components/ui';
import { colors, radii, spacing, typography } from '@/src/theme';

export default function SecurityScreen() {
  const router = useRouter();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [setup, setSetup] = useState<{ secret: string; otp_uri: string } | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // password change
  const [showPw, setShowPw] = useState(false);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [pwBusy, setPwBusy] = useState(false);
  const [pwErr, setPwErr] = useState<string | null>(null);

  useEffect(() => {
    api<{ enabled: boolean }>('/auth/2fa/status').then((r) => setEnabled(r.enabled)).catch(() => {});
  }, []);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  }

  async function startSetup() {
    setBusy(true);
    try {
      const res = await api<{ secret: string; otp_uri: string }>('/auth/2fa/setup', { method: 'POST' });
      setSetup(res);
    } finally {
      setBusy(false);
    }
  }

  async function confirmEnable() {
    if (code.length < 6) return flash('Enter 6-digit code');
    setBusy(true);
    try {
      await api('/auth/2fa/enable', { method: 'POST', body: { code } });
      setEnabled(true);
      setSetup(null);
      setCode('');
      flash('2FA enabled');
    } catch (e: any) {
      flash(e?.message ?? 'Invalid code');
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    if (code.length < 6) return flash('Enter 6-digit code to disable');
    setBusy(true);
    try {
      await api('/auth/2fa/disable', { method: 'POST', body: { code } });
      setEnabled(false);
      setCode('');
      flash('2FA disabled');
    } catch (e: any) {
      flash(e?.message ?? 'Invalid code');
    } finally {
      setBusy(false);
    }
  }

  async function changePassword() {
    setPwErr(null);
    if (!current || next.length < 8) return setPwErr('Password must be at least 8 chars.');
    setPwBusy(true);
    try {
      await api('/auth/change-password', {
        method: 'POST',
        body: { current_password: current, new_password: next },
      });
      setCurrent('');
      setNext('');
      flash('Password changed');
    } catch (e: any) {
      setPwErr(e?.message ?? 'Failed');
    } finally {
      setPwBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} testID="security-back">
          <ArrowLeft size={20} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[typography.h3, { color: colors.text.primary, flex: 1, marginLeft: 8 }]}>Security</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
        <Text style={[typography.overline, { color: colors.text.tertiary, paddingHorizontal: 4, marginBottom: 8 }]}>
          TWO-FACTOR AUTH
        </Text>
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={[styles.iconWrap, { backgroundColor: enabled ? colors.status.successBg : colors.bg.highlight }]}>
              {enabled ? (
                <ShieldCheck size={18} color={colors.status.successText} strokeWidth={2.4} />
              ) : (
                <ShieldOff size={18} color={colors.text.secondary} strokeWidth={2.4} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[typography.bodyMed, { color: colors.text.primary }]}>Authenticator app (TOTP)</Text>
              <Text style={[typography.caption, { color: colors.text.tertiary, marginTop: 2 }]}>
                {enabled ? 'Your account is protected with a 6-digit code.' : 'Use Google Authenticator, 1Password, Authy, etc.'}
              </Text>
            </View>
            <Pill label={enabled ? 'On' : 'Off'} bg={enabled ? colors.status.successBg : colors.bg.highlight} fg={enabled ? colors.status.successText : colors.text.secondary} />
          </View>

          {!enabled && !setup ? (
            <Button title="Enable 2FA" onPress={startSetup} loading={busy} fullWidth style={{ marginTop: spacing.md }} testID="2fa-start" />
          ) : null}

          {setup ? (
            <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
              <Text style={[typography.caption, { color: colors.text.secondary }]}>
                1. In your authenticator app, add a new account using this secret:
              </Text>
              <View style={styles.secretRow}>
                <Text selectable style={[typography.bodyMed, { color: colors.brand.royal, letterSpacing: 1.5, flex: 1 }]}>
                  {setup.secret}
                </Text>
                <TouchableOpacity
                  onPress={async () => {
                    await Clipboard.setStringAsync(setup.secret);
                    flash('Copied');
                  }}
                  testID="2fa-copy"
                >
                  <Copy size={16} color={colors.text.secondary} />
                </TouchableOpacity>
              </View>
              <Text style={[typography.caption, { color: colors.text.secondary, marginTop: spacing.sm }]}>
                2. Enter the 6-digit code from the app to confirm:
              </Text>
              <TextInput
                testID="2fa-code-input"
                value={code}
                onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                placeholderTextColor={colors.text.tertiary}
                keyboardType="number-pad"
                style={[styles.input, { letterSpacing: 6, textAlign: 'center', fontSize: 18 }]}
              />
              <Button title="Confirm & enable" onPress={confirmEnable} loading={busy} fullWidth style={{ marginTop: 6 }} testID="2fa-enable" />
            </View>
          ) : null}

          {enabled ? (
            <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
              <Text style={[typography.caption, { color: colors.text.secondary }]}>
                Enter a fresh code from your authenticator app to turn 2FA off.
              </Text>
              <TextInput
                testID="2fa-disable-code"
                value={code}
                onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                placeholderTextColor={colors.text.tertiary}
                keyboardType="number-pad"
                style={[styles.input, { letterSpacing: 6, textAlign: 'center', fontSize: 18 }]}
              />
              <Button title="Disable 2FA" variant="outline" onPress={disable} loading={busy} fullWidth testID="2fa-disable" />
            </View>
          ) : null}
        </Card>

        <Text style={[typography.overline, { color: colors.text.tertiary, paddingHorizontal: 4, marginBottom: 8, marginTop: spacing.lg }]}>
          CHANGE PASSWORD
        </Text>
        <Card>
          <View style={{ gap: spacing.sm }}>
            <View style={styles.pwRow}>
              <KeyRound size={16} color={colors.text.tertiary} />
              <TextInput
                testID="pw-current"
                value={current}
                onChangeText={setCurrent}
                placeholder="Current password"
                placeholderTextColor={colors.text.tertiary}
                secureTextEntry={!showPw}
                style={styles.pwInput}
              />
              <TouchableOpacity onPress={() => setShowPw((s) => !s)} testID="pw-toggle">
                {showPw ? <EyeOff size={16} color={colors.text.tertiary} /> : <Eye size={16} color={colors.text.tertiary} />}
              </TouchableOpacity>
            </View>
            <View style={styles.pwRow}>
              <KeyRound size={16} color={colors.text.tertiary} />
              <TextInput
                testID="pw-new"
                value={next}
                onChangeText={setNext}
                placeholder="New password (min 8 chars)"
                placeholderTextColor={colors.text.tertiary}
                secureTextEntry={!showPw}
                style={styles.pwInput}
              />
            </View>
            {pwErr ? (
              <View style={styles.errBox}>
                <Text style={[typography.caption, { color: colors.status.errorText }]}>{pwErr}</Text>
              </View>
            ) : null}
            <Button title="Update password" onPress={changePassword} loading={pwBusy} fullWidth style={{ marginTop: 4 }} testID="pw-submit" />
          </View>
        </Card>
      </ScrollView>

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
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: colors.bg.app,
    borderBottomWidth: 1, borderBottomColor: colors.border.default,
  },
  iconBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: colors.bg.surface, borderWidth: 1, borderColor: colors.border.default,
    alignItems: 'center', justifyContent: 'center',
  },
  iconWrap: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  input: {
    backgroundColor: colors.bg.app,
    borderWidth: 1, borderColor: colors.border.default, borderRadius: radii.md,
    paddingHorizontal: 14, height: 50, color: colors.text.primary, fontSize: 15,
  },
  secretRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.brand.light, padding: 12, borderRadius: radii.md, gap: 12,
  },
  pwRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.bg.app,
    borderWidth: 1, borderColor: colors.border.default, borderRadius: radii.md,
    paddingHorizontal: 12, height: 48,
  },
  pwInput: { flex: 1, color: colors.text.primary, fontSize: 14 },
  errBox: { padding: 10, borderRadius: 10, backgroundColor: colors.status.errorBg },
  toast: {
    position: 'absolute', bottom: 28, alignSelf: 'center',
    backgroundColor: colors.brand.navy,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999,
  },
});
