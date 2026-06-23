import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { X } from 'lucide-react-native';

import { api } from '@/src/api/client';
import { Button } from '@/src/components/ui';
import { colors, radii, spacing, typography } from '@/src/theme';

const SOURCES = ['Website', 'Facebook Ads', 'Google Ads', 'Instagram', 'Referral', 'Walk-in', 'Magic Bricks', '99acres'];
const INTERESTS = ['1 BHK', '2 BHK', '3 BHK', '4 BHK', 'Villa', 'Penthouse'];

export function NewLeadSheet({
  visible,
  onClose,
  onCreated,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+91 ');
  const [email, setEmail] = useState('');
  const [source, setSource] = useState('Website');
  const [interest, setInterest] = useState<string | null>(null);
  const [budget, setBudget] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function reset() {
    setName('');
    setPhone('+91 ');
    setEmail('');
    setSource('Website');
    setInterest(null);
    setBudget('');
    setNotes('');
    setErr(null);
  }

  async function submit() {
    setErr(null);
    if (!name.trim()) return setErr('Name is required');
    if (!phone.trim() || phone.trim().length < 6) return setErr('Phone is required');
    setBusy(true);
    try {
      const lead = await api<{ id: string }>('/leads', {
        method: 'POST',
        body: {
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          source,
          interest: interest ?? undefined,
          budget: budget ? Number(budget) : undefined,
          notes: notes.trim() || undefined,
        },
      });
      reset();
      onCreated(lead.id);
    } catch (e: any) {
      setErr(e?.message ?? 'Could not create lead');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.bg}
      >
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={[typography.h3, { color: colors.text.primary, flex: 1 }]}>New Lead</Text>
            <TouchableOpacity onPress={onClose} testID="new-lead-close">
              <X size={20} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Field label="Name *" required>
              <TextInput
                testID="new-lead-name"
                value={name}
                onChangeText={setName}
                placeholder="Riya Mehta"
                placeholderTextColor={colors.text.tertiary}
                style={styles.input}
              />
            </Field>

            <Field label="Phone *" required>
              <TextInput
                testID="new-lead-phone"
                value={phone}
                onChangeText={setPhone}
                placeholder="+91 98765 43210"
                placeholderTextColor={colors.text.tertiary}
                keyboardType="phone-pad"
                style={styles.input}
              />
            </Field>

            <Field label="Email">
              <TextInput
                testID="new-lead-email"
                value={email}
                onChangeText={setEmail}
                placeholder="optional"
                placeholderTextColor={colors.text.tertiary}
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.input}
              />
            </Field>

            <Field label="Source *" required>
              <View style={styles.chipWrap}>
                {SOURCES.map((s) => (
                  <ChipBtn key={s} label={s} active={source === s} onPress={() => setSource(s)} testID={`new-lead-source-${s}`} />
                ))}
              </View>
            </Field>

            <Field label="Interest">
              <View style={styles.chipWrap}>
                {INTERESTS.map((s) => (
                  <ChipBtn key={s} label={s} active={interest === s} onPress={() => setInterest(s === interest ? null : s)} testID={`new-lead-interest-${s}`} />
                ))}
              </View>
            </Field>

            <Field label="Budget (₹ Lakhs)">
              <TextInput
                testID="new-lead-budget"
                value={budget}
                onChangeText={setBudget}
                placeholder="e.g. 120"
                placeholderTextColor={colors.text.tertiary}
                keyboardType="numeric"
                style={styles.input}
              />
            </Field>

            <Field label="Notes">
              <TextInput
                testID="new-lead-notes"
                value={notes}
                onChangeText={setNotes}
                placeholder="Optional context, preferences, etc."
                placeholderTextColor={colors.text.tertiary}
                multiline
                style={[styles.input, { height: 80, textAlignVertical: 'top', paddingTop: 12 }]}
              />
            </Field>

            {err ? (
              <View style={styles.errorBox}>
                <Text style={[typography.caption, { color: colors.status.errorText }]}>{err}</Text>
              </View>
            ) : null}

            <View style={{ flexDirection: 'row', gap: 10, marginTop: spacing.md, marginBottom: spacing.lg }}>
              <Button title="Cancel" variant="outline" fullWidth onPress={onClose} style={{ flex: 1 }} />
              <Button
                title="Create lead"
                fullWidth
                onPress={submit}
                loading={busy}
                style={{ flex: 1.4 }}
                testID="new-lead-submit"
              />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <View style={{ marginTop: spacing.md }}>
      <Text style={[typography.overline, { color: required ? colors.text.brand : colors.text.tertiary, marginBottom: 6 }]}>
        {label}
      </Text>
      {children}
    </View>
  );
}

function ChipBtn({ label, active, onPress, testID }: { label: string; active: boolean; onPress: () => void; testID?: string }) {
  return (
    <TouchableOpacity
      testID={testID}
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.chip, active ? styles.chipActive : null]}
    >
      <Text
        style={[
          typography.caption,
          { color: active ? colors.text.inverse : colors.text.secondary, fontWeight: '600' },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: 'rgba(11,27,61,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.bg.surface,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border.default,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  input: {
    backgroundColor: colors.bg.app,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    height: 48,
    color: colors.text.primary,
    fontSize: 15,
  },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.bg.app,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  chipActive: { backgroundColor: colors.brand.royal, borderColor: colors.brand.royal },
  errorBox: {
    marginTop: spacing.md,
    padding: 10,
    borderRadius: 10,
    backgroundColor: colors.status.errorBg,
  },
});
