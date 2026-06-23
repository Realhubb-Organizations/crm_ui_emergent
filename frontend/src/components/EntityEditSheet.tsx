// Generic edit/create sheet for entities (Team agents, Campaigns).
import React, { useEffect, useState } from 'react';
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

import { Button } from '@/src/components/ui';
import { colors, radii, spacing, typography } from '@/src/theme';

export type FormField =
  | { key: string; label: string; type: 'text' | 'email' | 'phone' | 'number'; placeholder?: string; required?: boolean }
  | { key: string; label: string; type: 'options'; options: string[]; required?: boolean };

export function EntityEditSheet({
  visible,
  title,
  fields,
  initial,
  submitLabel = 'Save',
  onSubmit,
  onClose,
  testID,
}: {
  visible: boolean;
  title: string;
  fields: FormField[];
  initial?: Record<string, any>;
  submitLabel?: string;
  onSubmit: (values: Record<string, any>) => Promise<void>;
  onClose: () => void;
  testID?: string;
}) {
  const [values, setValues] = useState<Record<string, any>>(initial ?? {});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setValues(initial ?? {});
      setErr(null);
    }
  }, [visible, initial]);

  async function submit() {
    setErr(null);
    for (const f of fields) {
      if (f.required && !String(values[f.key] ?? '').trim()) {
        return setErr(`${f.label} is required`);
      }
    }
    setBusy(true);
    try {
      await onSubmit(values);
    } catch (e: any) {
      setErr(e?.message ?? 'Failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.bg} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={[typography.h3, { color: colors.text.primary, flex: 1 }]}>{title}</Text>
            <TouchableOpacity onPress={onClose} testID={`${testID}-close`}>
              <X size={20} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {fields.map((f) => (
              <View key={f.key} style={{ marginTop: spacing.md }}>
                <Text
                  style={[
                    typography.overline,
                    { color: f.required ? colors.text.brand : colors.text.tertiary, marginBottom: 6 },
                  ]}
                >
                  {f.label}
                  {f.required ? ' *' : ''}
                </Text>
                {f.type === 'options' ? (
                  <View style={styles.chipWrap}>
                    {f.options.map((opt) => {
                      const active = values[f.key] === opt;
                      return (
                        <TouchableOpacity
                          key={opt}
                          onPress={() => setValues((s) => ({ ...s, [f.key]: opt }))}
                          style={[styles.chip, active ? styles.chipActive : null]}
                          testID={`${testID}-${f.key}-${opt}`}
                        >
                          <Text
                            style={[
                              typography.caption,
                              { color: active ? colors.text.inverse : colors.text.secondary, fontWeight: '600' },
                            ]}
                          >
                            {opt}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : (
                  <TextInput
                    testID={`${testID}-${f.key}`}
                    value={values[f.key] === undefined || values[f.key] === null ? '' : String(values[f.key])}
                    onChangeText={(v) =>
                      setValues((s) => ({ ...s, [f.key]: f.type === 'number' ? Number(v.replace(/[^\d.]/g, '')) || 0 : v }))
                    }
                    placeholder={f.placeholder}
                    placeholderTextColor={colors.text.tertiary}
                    keyboardType={
                      f.type === 'phone' ? 'phone-pad' : f.type === 'email' ? 'email-address' : f.type === 'number' ? 'numeric' : 'default'
                    }
                    autoCapitalize={f.type === 'email' ? 'none' : 'sentences'}
                    style={styles.input}
                  />
                )}
              </View>
            ))}

            {err ? (
              <View style={styles.errBox}>
                <Text style={[typography.caption, { color: colors.status.errorText }]}>{err}</Text>
              </View>
            ) : null}

            <View style={{ flexDirection: 'row', gap: 10, marginTop: spacing.lg, marginBottom: spacing.md }}>
              <Button title="Cancel" variant="outline" fullWidth onPress={onClose} style={{ flex: 1 }} />
              <Button title={submitLabel} fullWidth onPress={submit} loading={busy} style={{ flex: 1.4 }} testID={`${testID}-submit`} />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: 'rgba(11,27,61,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.bg.surface,
    paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.lg,
    borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%',
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: colors.border.default, alignSelf: 'center', marginBottom: spacing.md,
  },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  input: {
    backgroundColor: colors.bg.app,
    borderWidth: 1, borderColor: colors.border.default, borderRadius: radii.md,
    paddingHorizontal: 14, height: 48, color: colors.text.primary, fontSize: 15,
  },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
    backgroundColor: colors.bg.app,
    borderWidth: 1, borderColor: colors.border.default,
  },
  chipActive: { backgroundColor: colors.brand.royal, borderColor: colors.brand.royal },
  errBox: { marginTop: spacing.md, padding: 10, borderRadius: 10, backgroundColor: colors.status.errorBg },
});
