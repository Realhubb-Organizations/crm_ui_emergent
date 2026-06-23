import { useRouter } from 'expo-router';
import { Eye, EyeOff, Lock, Mail, ShieldCheck } from 'lucide-react-native';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/src/components/ui';
import { useAuth } from '@/src/context/AuthContext';
import { colors, radii, shadow, spacing, typography } from '@/src/theme';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('admin@taskezy.com');
  const [password, setPassword] = useState('Admin@12345');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit() {
    setErr(null);
    setBusy(true);
    try {
      await signIn(email.trim(), password);
      router.replace('/(tabs)/dashboard');
    } catch (e: any) {
      setErr(e?.message ?? 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.brand}>
            <View style={styles.logoWrap}>
              <ShieldCheck size={28} color={colors.text.inverse} strokeWidth={2.5} />
            </View>
            <Text style={[typography.overline, { color: colors.text.tertiary, marginTop: 16 }]}>
              TASKEZY • CRM ADMIN
            </Text>
            <Text style={[typography.h1, { color: colors.text.primary, marginTop: 8 }]}>
              Welcome back
            </Text>
            <Text style={[typography.body, { color: colors.text.secondary, marginTop: 4 }]}>
              Sign in to your enterprise workspace
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={[typography.caption, styles.label]}>EMAIL</Text>
            <View style={styles.inputWrap}>
              <Mail size={18} color={colors.text.tertiary} />
              <TextInput
                testID="login-email-input"
                value={email}
                onChangeText={setEmail}
                placeholder="you@company.com"
                placeholderTextColor={colors.text.tertiary}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                style={styles.input}
              />
            </View>

            <Text style={[typography.caption, styles.label, { marginTop: spacing.md }]}>PASSWORD</Text>
            <View style={styles.inputWrap}>
              <Lock size={18} color={colors.text.tertiary} />
              <TextInput
                testID="login-password-input"
                value={password}
                onChangeText={setPassword}
                placeholder="Your password"
                placeholderTextColor={colors.text.tertiary}
                secureTextEntry={!show}
                style={styles.input}
              />
              <TouchableOpacity onPress={() => setShow((s) => !s)} testID="login-toggle-password">
                {show ? <EyeOff size={18} color={colors.text.tertiary} /> : <Eye size={18} color={colors.text.tertiary} />}
              </TouchableOpacity>
            </View>

            {err ? (
              <View style={styles.errorBox}>
                <Text style={[typography.caption, { color: colors.status.errorText }]}>{err}</Text>
              </View>
            ) : null}

            <Button
              testID="login-submit-button"
              title="Sign in"
              onPress={onSubmit}
              loading={busy}
              fullWidth
              style={{ marginTop: spacing.lg }}
            />

            <View style={styles.hint}>
              <Text style={[typography.caption, { color: colors.text.tertiary }]}>
                Demo: admin@taskezy.com / Admin@12345
              </Text>
            </View>
          </View>

          <Text style={[typography.caption, { color: colors.text.tertiary, textAlign: 'center', marginTop: spacing.lg }]}>
            © 2026 TASKEZY • Enterprise CRM
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg.app },
  scroll: { padding: spacing.lg, justifyContent: 'center', flexGrow: 1 },
  brand: { alignItems: 'flex-start', marginBottom: spacing.xl },
  logoWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.brand.navy,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.md,
  },
  card: {
    backgroundColor: colors.bg.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    ...shadow.md,
  },
  label: { color: colors.text.tertiary, marginBottom: 6 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.bg.app,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    paddingHorizontal: spacing.md,
    height: 50,
  },
  input: { flex: 1, color: colors.text.primary, fontSize: 15 },
  errorBox: {
    marginTop: spacing.md,
    padding: 10,
    borderRadius: 10,
    backgroundColor: colors.status.errorBg,
  },
  hint: { alignItems: 'center', marginTop: spacing.md },
});
