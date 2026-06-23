import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors, radii, spacing, typography } from '@/src/theme';

export type ChipItem = { label: string; value: string };

export function ChipRow({
  items,
  value,
  onChange,
  testIDPrefix,
}: {
  items: ChipItem[];
  value: string;
  onChange: (v: string) => void;
  testIDPrefix?: string;
}) {
  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {items.map((it) => {
          const active = it.value === value;
          return (
            <TouchableOpacity
              key={it.value}
              testID={testIDPrefix ? `${testIDPrefix}-${it.value}` : undefined}
              activeOpacity={0.85}
              onPress={() => onChange(it.value)}
              style={[styles.chip, active ? styles.chipActive : null]}
            >
              <Text
                style={[
                  typography.caption,
                  { color: active ? colors.text.inverse : colors.text.secondary, fontWeight: '600' },
                ]}
              >
                {it.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { height: 56, justifyContent: 'center', backgroundColor: colors.bg.app },
  row: {
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  chip: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.bg.surface,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  chipActive: {
    backgroundColor: colors.brand.royal,
    borderColor: colors.brand.royal,
  },
});
