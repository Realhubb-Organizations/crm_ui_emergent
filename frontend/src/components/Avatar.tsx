import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { colors, radii, typography } from '@/src/theme';

export function Avatar({
  uri,
  name,
  size = 40,
}: {
  uri?: string | null;
  name?: string | null;
  size?: number;
}) {
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: radii.full, backgroundColor: colors.bg.highlight }}
      />
    );
  }
  const initial = (name ?? '?').trim().slice(0, 1).toUpperCase();
  return (
    <View
      style={[
        styles.fallback,
        { width: size, height: size, borderRadius: radii.full },
      ]}
    >
      <Text style={[typography.bodyMed, { color: colors.brand.royal }]}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: colors.brand.light,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
