import { Stack, useRouter } from 'expo-router';
import { ArrowLeft, Megaphone, TrendingUp } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '@/src/api/client';
import { Card, Pill } from '@/src/components/ui';
import { colors, spacing, statusColor, typography } from '@/src/theme';

type Campaign = {
  id: string;
  name: string;
  channel: string;
  status: string;
  spend: number;
  leads: number;
  bookings: number;
  cpl: number;
  ctr: number;
  roas: number;
};

function inr(n: number) {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(1)}Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)}L`;
  if (n >= 1e3) return `₹${(n / 1e3).toFixed(1)}K`;
  return `₹${n}`;
}

export default function CampaignsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<Campaign[]>([]);

  const load = useCallback(async () => {
    const list = await api<Campaign[]>('/campaigns');
    setItems(list);
  }, []);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} testID="campaigns-back">
          <ArrowLeft size={20} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[typography.h3, { color: colors.text.primary, flex: 1, marginLeft: 8 }]}>Campaigns</Text>
        <Pill label={`${items.length}`} bg={colors.brand.light} fg={colors.brand.royal} icon={Megaphone} />
      </View>

      <FlatList
        data={items}
        keyExtractor={(it) => it.id}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 32 }}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => {
          const sc =
            item.status === 'Active'
              ? statusColor('Booked')
              : item.status === 'Paused'
              ? statusColor('Negotiation')
              : statusColor('Contacted');
          return (
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                <View style={styles.iconWrap}>
                  <Megaphone size={18} color={colors.brand.royal} strokeWidth={2.2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.bodyMed, { color: colors.text.primary }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={[typography.caption, { color: colors.text.tertiary, marginTop: 2 }]}>
                    {item.channel}
                  </Text>
                </View>
                <Pill label={item.status} bg={sc.bg} fg={sc.fg} />
              </View>
              <View style={styles.kpiRow}>
                <Metric label="Spend" value={inr(item.spend)} />
                <View style={styles.div} />
                <Metric label="Leads" value={item.leads} />
                <View style={styles.div} />
                <Metric label="CPL" value={inr(item.cpl)} />
                <View style={styles.div} />
                <Metric label="ROAS" value={`${item.roas}x`} icon={TrendingUp} accent />
              </View>
            </Card>
          );
        }}
      />
    </SafeAreaView>
  );
}

function Metric({ label, value, icon: Icon, accent }: { label: string; value: number | string; icon?: any; accent?: boolean }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        {Icon ? <Icon size={12} color={accent ? colors.brand.royal : colors.text.tertiary} /> : null}
        <Text style={[typography.bodyMed, { color: accent ? colors.brand.royal : colors.text.primary, fontSize: 14 }]}>
          {value}
        </Text>
      </View>
      <Text style={[typography.caption, { color: colors.text.tertiary, fontSize: 11 }]}>{label}</Text>
    </View>
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
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.bg.surface,
    borderWidth: 1,
    borderColor: colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.brand.light,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
  },
  div: { width: 1, height: 22, backgroundColor: colors.border.default },
});
