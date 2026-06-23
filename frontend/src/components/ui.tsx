import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TouchableOpacity,
  TouchableOpacityProps,
  StyleProp,
  ActivityIndicator,
} from 'react-native';
import { LucideIcon } from 'lucide-react-native';

import { colors, radii, shadow, spacing, typography } from '@/src/theme';

export function Card({
  children,
  style,
  testID,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  return (
    <View testID={testID} style={[styles.card, style]}>
      {children}
    </View>
  );
}

export function Section({
  title,
  action,
  children,
  testID,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  testID?: string;
}) {
  return (
    <View testID={testID} style={{ marginBottom: spacing.lg }}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {action}
      </View>
      {children}
    </View>
  );
}

export function Pill({
  label,
  bg,
  fg,
  icon: Icon,
  style,
  testID,
}: {
  label: string;
  bg?: string;
  fg?: string;
  icon?: LucideIcon;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  return (
    <View
      testID={testID}
      style={[
        styles.pill,
        { backgroundColor: bg ?? colors.bg.highlight },
        style,
      ]}
    >
      {Icon ? <Icon size={12} color={fg ?? colors.text.secondary} strokeWidth={2.5} /> : null}
      <Text style={[styles.pillText, { color: fg ?? colors.text.secondary }]}>{label}</Text>
    </View>
  );
}

type ButtonProps = TouchableOpacityProps & {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  icon?: LucideIcon;
  loading?: boolean;
  fullWidth?: boolean;
};

export function Button({
  title,
  variant = 'primary',
  icon: Icon,
  loading,
  fullWidth,
  style,
  ...rest
}: ButtonProps) {
  const stylesBy: Record<string, ViewStyle> = {
    primary: { backgroundColor: colors.brand.royal },
    secondary: { backgroundColor: colors.brand.light },
    outline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border.default },
    ghost: { backgroundColor: 'transparent' },
  };
  const textColor =
    variant === 'primary'
      ? colors.text.inverse
      : variant === 'secondary'
      ? colors.brand.royal
      : colors.text.primary;
  return (
    <TouchableOpacity
      accessibilityRole="button"
      activeOpacity={0.85}
      style={[
        styles.btn,
        stylesBy[variant],
        fullWidth ? { alignSelf: 'stretch' } : null,
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <View style={styles.btnInner}>
          {Icon ? <Icon size={16} color={textColor} strokeWidth={2.5} /> : null}
          <Text style={[styles.btnText, { color: textColor }]}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export function KPI({
  label,
  value,
  delta,
  icon: Icon,
  tone = 'default',
  testID,
}: {
  label: string;
  value: string | number;
  delta?: string;
  icon?: LucideIcon;
  tone?: 'default' | 'positive' | 'warn' | 'dark';
  testID?: string;
}) {
  const toneBg = tone === 'dark' ? colors.brand.navy : colors.bg.surface;
  const toneFg = tone === 'dark' ? colors.text.inverse : colors.text.primary;
  const toneSub = tone === 'dark' ? 'rgba(255,255,255,0.7)' : colors.text.secondary;
  const iconBg = tone === 'dark' ? 'rgba(255,255,255,0.1)' : colors.brand.light;
  const iconFg = tone === 'dark' ? colors.text.inverse : colors.brand.royal;
  return (
    <View testID={testID} style={[styles.kpi, { backgroundColor: toneBg }]}>
      <View style={styles.kpiTop}>
        {Icon ? (
          <View style={[styles.kpiIcon, { backgroundColor: iconBg }]}>
            <Icon size={16} color={iconFg} strokeWidth={2.5} />
          </View>
        ) : null}
        {delta ? (
          <Text
            style={{
              ...typography.caption,
              color: tone === 'warn' ? colors.status.warningText : colors.status.successText,
              fontWeight: '600',
            }}
          >
            {delta}
          </Text>
        ) : null}
      </View>
      <Text style={[typography.h2, { color: toneFg, marginTop: spacing.sm }]}>{value}</Text>
      <Text style={[typography.caption, { color: toneSub, marginTop: 2 }]}>{label}</Text>
    </View>
  );
}

export function Empty({ title, body }: { title: string; body?: string }) {
  return (
    <View style={styles.empty}>
      <Text style={[typography.h4, { color: colors.text.primary }]}>{title}</Text>
      {body ? (
        <Text style={[typography.body, { color: colors.text.secondary, marginTop: 4 }]}>
          {body}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bg.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    ...shadow.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingHorizontal: 2,
  },
  sectionTitle: { ...typography.h4, color: colors.text.primary },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: radii.full,
    alignSelf: 'flex-start',
  },
  pillText: { ...typography.caption },
  btn: {
    borderRadius: radii.md,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btnText: { ...typography.bodyMed },
  kpi: {
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    ...shadow.sm,
    flex: 1,
  } as ViewStyle,
  kpiTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  kpiIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: { padding: spacing.lg, alignItems: 'center' },
});

export const tStyles: { txt: TextStyle } = {
  txt: { color: colors.text.primary },
};
