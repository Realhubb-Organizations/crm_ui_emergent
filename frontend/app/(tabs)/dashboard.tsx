import { useRouter } from 'expo-router';
import {
  ArrowUpRight,
  Bell,
  ChevronRight,
  Flame,
  Phone,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  CalendarClock,
  CheckCircle2,
  AlertTriangle,
  MessageCircle,
  IndianRupee,
} from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import {
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '@/src/api/client';
import { Avatar } from '@/src/components/Avatar';
import { Bars, Donut, Funnel } from '@/src/components/charts';
import { Card, KPI, Pill, Section } from '@/src/components/ui';
import { useAuth } from '@/src/context/AuthContext';
import { colors, radii, shadow, spacing, statusColor, typography } from '@/src/theme';

type Summary = {
  kpis: {
    total_leads: number;
    new_leads: number;
    qualified_leads: number;
    site_visits: number;
    bookings: number;
    conversion_pct: number;
    hot_leads: number;
    lost_leads: number;
  };
  attention: { overdue_followups: number; hot_leads: number; stalled_negotiations: number };
  funnel: { stage: string; count: number }[];
  sources: { source: string; count: number }[];
  weekly_leads: { day: string; leads: number }[];
};

type ActivityItem = {
  id: string;
  type: string;
  title: string;
  lead_name: string;
  agent_name?: string;
  agent_avatar?: string;
  created_at: string;
};

type Followup = {
  id: string;
  name: string;
  phone: string;
  status: string;
  is_hot: boolean;
  assigned_avatar?: string;
  next_followup_at: string;
};

type Insight = { id: string; title: string; body: string; trend: string; icon: string };
type TopProperty = { id: string; name: string; city: string; image: string; bookings: number; leads_count: number; conversion_pct: number };
type TopAgent = { id: string; name: string; avatar?: string; leads: number; bookings: number; conversion_pct: number };

function timeAgo(iso: string) {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [followups, setFollowups] = useState<Followup[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [topProps, setTopProps] = useState<TopProperty[]>([]);
  const [topAgents, setTopAgents] = useState<TopAgent[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [s, a, f, i, tp, ta] = await Promise.all([
      api<Summary>('/dashboard/summary'),
      api<ActivityItem[]>('/dashboard/activities', { query: { limit: 8 } }),
      api<Followup[]>('/dashboard/followups'),
      api<Insight[]>('/dashboard/insights'),
      api<TopProperty[]>('/dashboard/top-properties'),
      api<TopAgent[]>('/dashboard/top-agents'),
    ]);
    setSummary(s);
    setActivities(a);
    setFollowups(f);
    setInsights(i);
    setTopProps(tp);
    setTopAgents(ta);
  }, []);

  useEffect(() => {
    load().catch((e) => console.warn(e));
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.headerInner}>
          <View style={{ flex: 1 }}>
            <Text style={[typography.caption, { color: 'rgba(255,255,255,0.7)' }]}>
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
            </Text>
            <Text style={[typography.h2, { color: colors.text.inverse, marginTop: 2 }]} testID="dashboard-greeting">
              Hello, {user?.name?.split(' ')[0] ?? 'Admin'}
            </Text>
          </View>
          <TouchableOpacity style={styles.bellBtn} testID="dashboard-notifications">
            <Bell size={20} color={colors.text.inverse} strokeWidth={2.2} />
            <View style={styles.bellDot} />
          </TouchableOpacity>
          <View style={{ marginLeft: 10 }}>
            <Avatar uri={user?.avatar} name={user?.name} size={40} />
          </View>
        </View>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand.royal} />}
      >
        {/* Attention center overlapping header */}
        {summary ? (
          <Card style={styles.attention} testID="executive-attention">
            <View style={styles.attentionHeader}>
              <View style={styles.iconChip}>
                <AlertTriangle size={14} color={colors.status.warningText} strokeWidth={2.5} />
              </View>
              <Text style={[typography.overline, { color: colors.text.tertiary }]}>EXECUTIVE ATTENTION</Text>
            </View>
            <View style={styles.attentionRow}>
              <AttentionTile label="Overdue follow-ups" value={summary.attention.overdue_followups} color={colors.status.errorText} />
              <View style={styles.divider} />
              <AttentionTile label="Hot leads" value={summary.attention.hot_leads} color={colors.status.hot} />
              <View style={styles.divider} />
              <AttentionTile label="In negotiation" value={summary.attention.stalled_negotiations} color={colors.status.warningText} />
            </View>
          </Card>
        ) : null}

        {/* KPI Grid */}
        <View style={styles.kpiGrid}>
          <KPI testID="kpi-total-leads" label="Total Leads" value={summary?.kpis.total_leads ?? '—'} icon={Users} delta="+12%" />
          <KPI testID="kpi-new-leads" label="New Leads" value={summary?.kpis.new_leads ?? '—'} icon={Sparkles} delta="+8%" />
        </View>
        <View style={styles.kpiGrid}>
          <KPI testID="kpi-qualified" label="Qualified" value={summary?.kpis.qualified_leads ?? '—'} icon={Target} delta="+4%" />
          <KPI testID="kpi-site-visits" label="Site Visits" value={summary?.kpis.site_visits ?? '—'} icon={CalendarClock} />
        </View>
        <View style={styles.kpiGrid}>
          <KPI testID="kpi-bookings" label="Bookings" value={summary?.kpis.bookings ?? '—'} icon={CheckCircle2} tone="dark" />
          <KPI testID="kpi-conversion" label="Conversion %" value={summary ? `${summary.kpis.conversion_pct}%` : '—'} icon={TrendingUp} delta="+1.2%" />
        </View>

        <Section title="Sales Funnel" testID="sales-funnel">
          <Card>{summary ? <Funnel data={summary.funnel} /> : null}</Card>
        </Section>

        <Section title="Lead Source Analytics" testID="lead-sources">
          <Card>{summary ? <Donut data={summary.sources} /> : null}</Card>
        </Section>

        <Section title="Marketing Performance" testID="marketing-performance">
          <Card>
            <View style={styles.cardHeaderRow}>
              <Text style={[typography.caption, { color: colors.text.secondary }]}>Leads acquired · Last 7 days</Text>
              <Pill label="+18%" bg={colors.status.successBg} fg={colors.status.successText} />
            </View>
            <View style={{ height: 8 }} />
            {summary ? (
              <Bars data={summary.weekly_leads.map((w) => ({ label: w.day, value: w.leads }))} />
            ) : null}
          </Card>
        </Section>

        <Section
          title="Top Performing Properties"
          action={
            <TouchableOpacity testID="see-all-properties" onPress={() => router.push('/(tabs)/properties')}>
              <Text style={[typography.caption, { color: colors.brand.royal, fontWeight: '700' }]}>See all</Text>
            </TouchableOpacity>
          }
        >
          {topProps.map((p) => (
            <TouchableOpacity
              key={p.id}
              onPress={() => router.push(`/property/${p.id}`)}
              activeOpacity={0.85}
              testID={`top-property-${p.id}`}
            >
              <Card style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: 10 }}>
                <Image source={{ uri: p.image }} style={styles.propThumb} />
                <View style={{ flex: 1 }}>
                  <Text style={[typography.bodyMed, { color: colors.text.primary }]} numberOfLines={1}>
                    {p.name}
                  </Text>
                  <Text style={[typography.caption, { color: colors.text.tertiary }]}>{p.city}</Text>
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
                    <Pill label={`${p.bookings} bookings`} bg={colors.status.successBg} fg={colors.status.successText} />
                    <Pill label={`${p.conversion_pct}%`} bg={colors.status.infoBg} fg={colors.status.infoText} />
                  </View>
                </View>
                <ChevronRight size={18} color={colors.text.tertiary} />
              </Card>
            </TouchableOpacity>
          ))}
        </Section>

        <Section title="Top Agents" testID="top-agents">
          <Card>
            {topAgents.map((a, idx) => (
              <View
                key={a.id}
                style={[styles.rowItem, idx === topAgents.length - 1 ? { borderBottomWidth: 0 } : null]}
              >
                <Text style={[typography.bodyMed, { color: colors.text.tertiary, width: 24 }]}>#{idx + 1}</Text>
                <Avatar uri={a.avatar} name={a.name} size={36} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[typography.bodyMed, { color: colors.text.primary }]}>{a.name}</Text>
                  <Text style={[typography.caption, { color: colors.text.tertiary }]}>
                    {a.leads} leads · {a.bookings} bookings
                  </Text>
                </View>
                <View style={styles.agentScore}>
                  <Text style={[typography.bodyMed, { color: colors.brand.royal }]}>
                    {a.conversion_pct}%
                  </Text>
                </View>
              </View>
            ))}
          </Card>
        </Section>

        <Section
          title="Follow-up Center"
          testID="followup-center"
          action={
            <Pill
              label={`${followups.length} pending`}
              bg={colors.status.warningBg}
              fg={colors.status.warningText}
            />
          }
        >
          {followups.slice(0, 4).map((f) => (
            <Card key={f.id} style={{ marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Avatar uri={f.assigned_avatar} name={f.name} size={40} />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[typography.bodyMed, { color: colors.text.primary }]} numberOfLines={1}>
                      {f.name}
                    </Text>
                    {f.is_hot ? <Flame size={14} color={colors.status.hot} fill={colors.status.hot} /> : null}
                  </View>
                  <Text style={[typography.caption, { color: colors.text.secondary }]} numberOfLines={1}>
                    Due {timeAgo(f.next_followup_at)} · {f.status}
                  </Text>
                </View>
                <TouchableOpacity style={styles.miniBtn} testID={`followup-call-${f.id}`}>
                  <Phone size={16} color={colors.brand.royal} />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.miniBtn, { backgroundColor: '#DCFCE7' }]} testID={`followup-wa-${f.id}`}>
                  <MessageCircle size={16} color="#15803D" />
                </TouchableOpacity>
              </View>
            </Card>
          ))}
        </Section>

        <Section title="Recent Activities" testID="recent-activities">
          <Card>
            {activities.slice(0, 6).map((a, idx) => (
              <View
                key={a.id}
                style={[styles.rowItem, idx === Math.min(activities.length, 6) - 1 ? { borderBottomWidth: 0 } : null]}
              >
                <View style={[styles.activityDot, { backgroundColor: activityColor(a.type) }]} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[typography.body, { color: colors.text.primary }]} numberOfLines={1}>
                    {a.title}
                  </Text>
                  <Text style={[typography.caption, { color: colors.text.tertiary }]}>
                    {a.agent_name ?? 'System'} · {timeAgo(a.created_at)}
                  </Text>
                </View>
              </View>
            ))}
          </Card>
        </Section>

        <Section title="AI Insights" testID="ai-insights">
          {insights.map((ins) => (
            <Card key={ins.id} style={styles.insightCard}>
              <View style={styles.insightHeader}>
                <View style={styles.insightIcon}>
                  <Sparkles size={16} color={colors.brand.royal} strokeWidth={2.5} />
                </View>
                <Text style={[typography.bodyMed, { color: colors.text.primary, flex: 1 }]}>
                  {ins.title}
                </Text>
                <ArrowUpRight
                  size={16}
                  color={ins.trend === 'warn' ? colors.status.warningText : colors.status.successText}
                />
              </View>
              <Text style={[typography.caption, { color: colors.text.secondary, marginTop: 6 }]}>
                {ins.body}
              </Text>
            </Card>
          ))}
        </Section>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

function AttentionTile({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.attentionTile}>
      <Text style={[typography.h3, { color }]}>{value}</Text>
      <Text style={[typography.caption, { color: colors.text.tertiary, marginTop: 2 }]}>{label}</Text>
    </View>
  );
}

function activityColor(type: string) {
  if (type === 'call') return colors.brand.royal;
  if (type === 'whatsapp') return '#15803D';
  if (type === 'email') return '#A855F7';
  if (type === 'site_visit') return '#BE185D';
  if (type === 'status') return '#B45309';
  return colors.text.tertiary;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg.app },
  headerSafe: { backgroundColor: colors.brand.navy },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg + 28,
  },
  bellBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.status.hot,
  },
  scroll: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl, marginTop: -28 },
  attention: { marginBottom: spacing.md, ...shadow.md },
  attentionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  iconChip: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: colors.status.warningBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attentionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  attentionTile: { flex: 1, alignItems: 'flex-start' },
  divider: { width: 1, height: 36, backgroundColor: colors.border.default, marginHorizontal: spacing.sm },
  kpiGrid: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  propThumb: { width: 56, height: 56, borderRadius: 12, backgroundColor: colors.bg.highlight },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  agentScore: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: colors.brand.light,
  },
  miniBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.brand.light,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityDot: { width: 8, height: 8, borderRadius: 4, marginLeft: 4 },
  insightCard: { marginBottom: 10 },
  insightHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  insightIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.brand.light,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
