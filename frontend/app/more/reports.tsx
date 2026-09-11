import { Stack, useRouter } from 'expo-router';
import { ArrowLeft, Calendar, Download, FileBarChart, IndianRupee, TrendingUp } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '@/src/api/client';
import { Card, Pill } from '@/src/components/ui';
import { colors, spacing, typography } from '@/src/theme';

type Report = {
  id: string;
  title: string;
  cadence: string;
  body: string;
  kpis: { leads: number; bookings: number; roas: number };
  created_at: string;
};

export default function ReportsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await api<Report[]>('/reports');
      setItems(list);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} testID="reports-back">
          <ArrowLeft size={20} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[typography.h3, { color: colors.text.primary, flex: 1, marginLeft: 8 }]}>Reports</Text>
        <Pill label={`${items.length} available`} bg={colors.brand.light} fg={colors.brand.royal} icon={FileBarChart} />
      </View>

      <FlatList
        data={items}
        keyExtractor={(it) => it.id}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 32 }}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={
          !loading ? (
            <View style={{ alignItems: 'center', padding: spacing.xl }}>
              <Text style={[typography.bodyMed, { color: colors.text.secondary }]}>No reports found</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity activeOpacity={0.92} testID={`report-${item.id}`}>
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                <View style={styles.iconWrap}>
                  <FileBarChart size={18} color={colors.brand.royal} strokeWidth={2.2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.bodyMed, { color: colors.text.primary }]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={[typography.caption, { color: colors.text.tertiary, marginTop: 2 }]} numberOfLines={2}>
                    {item.body}
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                <Pill label={item.cadence} icon={Calendar} />
                <Pill label={new Date(item.created_at).toLocaleDateString('en-IN')} />
              </View>
              <View style={styles.kpiRow}>
                <Metric label="Leads" value={item.kpis.leads} icon={TrendingUp} />
                <View style={styles.div} />
                <Metric label="Bookings" value={item.kpis.bookings} icon={FileBarChart} />
                <View style={styles.div} />
                <Metric label="ROAS" value={`${item.kpis.roas}x`} icon={IndianRupee} accent />
              </View>
              <View style={styles.rowActions}>
                <TouchableOpacity style={styles.editBtn} testID={`report-download-${item.id}`}>
                  <Download size={14} color={colors.brand.royal} />
                  <Text style={[typography.caption, { color: colors.brand.royal, fontWeight: '700' }]}>Download</Text>
                </TouchableOpacity>
              </View>
            </Card>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

function Metric({ label, value, icon: Icon, accent }: { label: string; value: number | string; icon: any; accent?: boolean }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Icon size={12} color={accent ? colors.brand.royal : colors.text.tertiary} />
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
  rowActions: { flexDirection: 'row', gap: 8, marginTop: spacing.sm },
  editBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: colors.brand.light,
    borderRadius: 10,
  },
});
