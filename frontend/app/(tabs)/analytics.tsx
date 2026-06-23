import {
  Activity,
  CalendarRange,
  IndianRupee,
  MousePointerClick,
  Target,
  TrendingUp,
} from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '@/src/api/client';
import { ChipRow } from '@/src/components/ChipRow';
import { Bars, Donut, LineSeries, StackedBar } from '@/src/components/charts';
import { Card, KPI, Pill, Section } from '@/src/components/ui';
import { colors, radii, spacing, typography } from '@/src/theme';

type Overview = {
  kpis: {
    total_leads: number;
    bookings: number;
    site_visits: number;
    cpl: number;
    ctr: number;
    roas: number;
    spend: number;
    revenue: number;
  };
  series: { day: string; leads: number; bookings: number }[];
  sources: { source: string; count: number }[];
};

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

const RANGES = [
  { label: '7D', value: '7' },
  { label: '30D', value: '30' },
  { label: '90D', value: '90' },
];

function inr(n: number) {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(1)}Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)}L`;
  if (n >= 1e3) return `₹${(n / 1e3).toFixed(1)}K`;
  return `₹${n}`;
}

export default function AnalyticsScreen() {
  const [range, setRange] = useState('30');
  const [data, setData] = useState<Overview | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  const load = useCallback(async () => {
    const [o, c] = await Promise.all([
      api<Overview>('/analytics/overview', { query: { days: Number(range) } }),
      api<Campaign[]>('/analytics/campaigns'),
    ]);
    setData(o);
    setCampaigns(c);
  }, [range]);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={[typography.h2, { color: colors.text.primary }]}>Analytics</Text>
          <Pill
            label="Executive Report"
            bg={colors.brand.navy}
            fg={colors.text.inverse}
            icon={Activity}
          />
        </View>
        <ChipRow items={RANGES} value={range} onChange={setRange} testIDPrefix="analytics-range" />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.kpiGrid}>
          <KPI testID="ana-kpi-cpl" label="Cost / Lead (CPL)" value={inr(data?.kpis.cpl ?? 0)} icon={IndianRupee} tone="dark" />
          <KPI testID="ana-kpi-ctr" label="Click-Through Rate" value={`${data?.kpis.ctr ?? 0}%`} icon={MousePointerClick} />
        </View>
        <View style={styles.kpiGrid}>
          <KPI testID="ana-kpi-roas" label="ROAS" value={`${data?.kpis.roas ?? 0}x`} icon={TrendingUp} delta="+0.4x" />
          <KPI testID="ana-kpi-bookings" label="Bookings" value={data?.kpis.bookings ?? '—'} icon={Target} delta="+6%" />
        </View>
        <View style={styles.kpiGrid}>
          <KPI testID="ana-kpi-spend" label="Marketing Spend" value={inr(data?.kpis.spend ?? 0)} icon={CalendarRange} />
          <KPI testID="ana-kpi-revenue" label="Booking Revenue" value={inr(data?.kpis.revenue ?? 0)} icon={IndianRupee} delta="+12%" />
        </View>

        <Section title="Leads Trend" testID="leads-trend">
          <Card>
            {data ? (
              <LineSeries
                data={data.series.map((s) => ({ label: s.day, value: s.leads }))}
                height={160}
              />
            ) : null}
          </Card>
        </Section>

        <Section title="Bookings Trend" testID="bookings-trend">
          <Card>
            {data ? (
              <LineSeries
                data={data.series.map((s) => ({ label: s.day, value: s.bookings }))}
                height={140}
                color={colors.chart[3]}
              />
            ) : null}
          </Card>
        </Section>

        <Section title="Lead Source Share" testID="source-share">
          <Card>
            {data ? <Donut data={data.sources} /> : null}
            <View style={{ height: spacing.sm }} />
            {data ? <StackedBar segments={data.sources.map((s) => ({ label: s.source, value: s.count }))} /> : null}
          </Card>
        </Section>

        <Section title="Campaign Performance" testID="campaign-performance">
          <Card style={{ padding: 0 }}>
            {campaigns.map((c, i) => (
              <View
                key={c.id}
                style={[styles.campRow, i === campaigns.length - 1 ? { borderBottomWidth: 0 } : null]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[typography.bodyMed, { color: colors.text.primary }]} numberOfLines={1}>
                    {c.name}
                  </Text>
                  <Text style={[typography.caption, { color: colors.text.tertiary }]}>
                    {c.channel} · {c.status}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[typography.bodyMed, { color: colors.brand.royal }]}>{c.roas}x</Text>
                  <Text style={[typography.caption, { color: colors.text.tertiary }]}>
                    {inr(c.spend)} · {c.leads} leads
                  </Text>
                </View>
              </View>
            ))}
          </Card>
        </Section>

        <Section title="Executive Summary" testID="exec-summary">
          <Card>
            <Text style={[typography.body, { color: colors.text.primary, lineHeight: 22 }]}>
              Over the last {range} days you acquired{' '}
              <Text style={{ fontWeight: '700' }}>{data?.kpis.total_leads ?? 0}</Text> leads and converted{' '}
              <Text style={{ fontWeight: '700' }}>{data?.kpis.bookings ?? 0}</Text> bookings at{' '}
              <Text style={{ fontWeight: '700' }}>{inr(data?.kpis.cpl ?? 0)}</Text> cost per lead. ROAS holds at{' '}
              <Text style={{ fontWeight: '700' }}>{data?.kpis.roas ?? 0}x</Text> with revenue of{' '}
              <Text style={{ fontWeight: '700' }}>{inr(data?.kpis.revenue ?? 0)}</Text>.
            </Text>
          </Card>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg.app },
  header: {
    backgroundColor: colors.bg.app,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  kpiGrid: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  campRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
});
