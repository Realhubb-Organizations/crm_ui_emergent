import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Briefcase,
  Check,
  ChevronDown,
  Flame,
  IndianRupee,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  TrendingUp,
  UserCheck,
} from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '@/src/api/client';
import { Avatar } from '@/src/components/Avatar';
import { Button, Card, Pill, Section } from '@/src/components/ui';
import { colors, radii, shadow, spacing, statusColor, typography } from '@/src/theme';

const STATUSES = ['New', 'Contacted', 'Qualified', 'Site Visit', 'Negotiation', 'Booked', 'Lost'];

type Lead = {
  id: string;
  name: string;
  phone: string;
  email: string;
  source: string;
  status: string;
  is_hot: boolean;
  score: number;
  property_name: string;
  city: string;
  budget: number;
  interest: string;
  notes: string;
  assigned_name?: string;
  assigned_avatar?: string;
  next_followup_at?: string;
  created_at: string;
};

type TimelineItem = {
  id: string;
  type: string;
  title: string;
  agent_name?: string;
  created_at: string;
};

type Agent = { id: string; name: string; avatar?: string };

export default function LeadDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [lead, setLead] = useState<Lead | null>(null);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [statusOpen, setStatusOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    const data = await api<{ lead: Lead; timeline: TimelineItem[] }>(`/leads/${id}`);
    setLead(data.lead);
    setTimeline(data.timeline);
  }, [id]);

  useEffect(() => {
    load().catch(() => {});
    api<Agent[]>('/agents').then(setAgents).catch(() => {});
  }, [load]);

  async function updateLead(patch: Record<string, unknown>) {
    if (!id) return;
    const updated = await api<Lead>(`/leads/${id}`, { method: 'PATCH', body: patch });
    setLead(updated);
    await load();
  }

  if (!lead) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => router.back()} testID="lead-back">
            <ArrowLeft size={22} color={colors.text.primary} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const sc = statusColor(lead.status);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => router.back()} testID="lead-back" style={styles.iconBtn}>
          <ArrowLeft size={20} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[typography.h4, { color: colors.text.primary, flex: 1, marginLeft: 8 }]}>
          Lead Details
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <Card style={{ ...shadow.md }}>
          <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
            <Avatar uri={lead.assigned_avatar} name={lead.name} size={60} />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[typography.h3, { color: colors.text.primary }]} numberOfLines={1}>
                  {lead.name}
                </Text>
                {lead.is_hot ? <Flame size={16} color={colors.status.hot} fill={colors.status.hot} /> : null}
              </View>
              <Text style={[typography.caption, { color: colors.text.secondary, marginTop: 2 }]}>
                Score {lead.score} · From {lead.source}
              </Text>
            </View>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionPrimary} testID="lead-action-call">
              <Phone size={16} color={colors.text.inverse} />
              <Text style={[typography.caption, { color: colors.text.inverse, fontWeight: '700' }]}>Call</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionGreen} testID="lead-action-whatsapp">
              <MessageCircle size={16} color={colors.text.inverse} />
              <Text style={[typography.caption, { color: colors.text.inverse, fontWeight: '700' }]}>WhatsApp</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionGhost}
              onPress={() => updateLead({ is_hot: !lead.is_hot })}
              testID="lead-action-hot"
            >
              <Flame size={16} color={lead.is_hot ? colors.status.hot : colors.text.secondary} />
            </TouchableOpacity>
          </View>
        </Card>

        <Section title="Status & Assignment">
          <Card style={{ padding: 0 }}>
            <TouchableOpacity
              style={styles.row}
              onPress={() => setStatusOpen(true)}
              testID="lead-change-status"
            >
              <View style={[styles.iconWrap, { backgroundColor: sc.bg }]}>
                <TrendingUp size={16} color={sc.fg} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[typography.caption, { color: colors.text.tertiary }]}>Stage</Text>
                <Text style={[typography.bodyMed, { color: colors.text.primary }]}>{lead.status}</Text>
              </View>
              <ChevronDown size={18} color={colors.text.tertiary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.row, { borderBottomWidth: 0 }]}
              onPress={() => setAssignOpen(true)}
              testID="lead-change-assignee"
            >
              <View style={styles.iconWrap}>
                <UserCheck size={16} color={colors.brand.royal} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[typography.caption, { color: colors.text.tertiary }]}>Assigned to</Text>
                <Text style={[typography.bodyMed, { color: colors.text.primary }]}>
                  {lead.assigned_name ?? 'Unassigned'}
                </Text>
              </View>
              <ChevronDown size={18} color={colors.text.tertiary} />
            </TouchableOpacity>
          </Card>
        </Section>

        <Section title="Contact">
          <Card>
            <Detail icon={Phone} label="Phone" value={lead.phone} />
            <Detail icon={Mail} label="Email" value={lead.email} />
            <Detail icon={MapPin} label="City" value={lead.city} />
            <Detail icon={Briefcase} label="Interest" value={lead.interest || '—'} />
            <Detail icon={IndianRupee} label="Budget" value={`₹${lead.budget}L`} last />
          </Card>
        </Section>

        {lead.property_name ? (
          <Section title="Property Interest">
            <Card>
              <Text style={[typography.bodyMed, { color: colors.text.primary }]}>{lead.property_name}</Text>
              <Text style={[typography.caption, { color: colors.text.tertiary, marginTop: 4 }]}>
                {lead.city}
              </Text>
            </Card>
          </Section>
        ) : null}

        {lead.notes ? (
          <Section title="Notes">
            <Card>
              <Text style={[typography.body, { color: colors.text.primary, lineHeight: 22 }]}>
                {lead.notes}
              </Text>
            </Card>
          </Section>
        ) : null}

        <Section title="Timeline">
          <Card>
            {timeline.map((t, i) => (
              <View key={t.id} style={styles.timelineItem}>
                <View style={styles.timelineLeft}>
                  <View style={styles.dot} />
                  {i < timeline.length - 1 ? <View style={styles.line} /> : null}
                </View>
                <View style={{ flex: 1, paddingBottom: 18 }}>
                  <Text style={[typography.bodyMed, { color: colors.text.primary }]} numberOfLines={2}>
                    {t.title}
                  </Text>
                  <Text style={[typography.caption, { color: colors.text.tertiary, marginTop: 2 }]}>
                    {t.agent_name ?? 'System'} · {new Date(t.created_at).toLocaleString()}
                  </Text>
                </View>
              </View>
            ))}
          </Card>
        </Section>
      </ScrollView>

      {/* Status picker */}
      <PickerSheet
        visible={statusOpen}
        onClose={() => setStatusOpen(false)}
        title="Update status"
        items={STATUSES.map((s) => ({
          key: s,
          label: s,
          selected: s === lead.status,
          color: statusColor(s).fg,
        }))}
        onPick={async (s) => {
          setStatusOpen(false);
          await updateLead({ status: s });
        }}
      />

      <PickerSheet
        visible={assignOpen}
        onClose={() => setAssignOpen(false)}
        title="Reassign to"
        items={agents.map((a) => ({
          key: a.id,
          label: a.name,
          selected: lead.assigned_name === a.name,
          avatar: a.avatar,
        }))}
        onPick={async (id, label) => {
          setAssignOpen(false);
          const a = agents.find((x) => x.id === id);
          await updateLead({ assigned_to: id });
          if (a) setLead((l) => (l ? { ...l, assigned_name: a.name, assigned_avatar: a.avatar } : l));
        }}
      />
    </SafeAreaView>
  );
}

function Detail({
  icon: Icon,
  label,
  value,
  last,
}: {
  icon: any;
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.detailRow, last ? { borderBottomWidth: 0 } : null]}>
      <View style={styles.iconWrap}>
        <Icon size={14} color={colors.brand.royal} />
      </View>
      <Text style={[typography.caption, { color: colors.text.tertiary, width: 80 }]}>{label}</Text>
      <Text style={[typography.bodyMed, { color: colors.text.primary, flex: 1 }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function PickerSheet({
  visible,
  onClose,
  title,
  items,
  onPick,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  items: { key: string; label: string; selected?: boolean; color?: string; avatar?: string }[];
  onPick: (key: string, label: string) => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetBg}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={[typography.h4, { color: colors.text.primary, marginBottom: spacing.sm }]}>{title}</Text>
          <ScrollView style={{ maxHeight: 360 }}>
            {items.map((it) => (
              <TouchableOpacity
                key={it.key}
                style={styles.pickItem}
                onPress={() => onPick(it.key, it.label)}
                testID={`pick-${it.key}`}
              >
                {it.avatar !== undefined ? <Avatar uri={it.avatar} name={it.label} size={28} /> : (
                  <View style={[styles.statusBullet, { backgroundColor: it.color ?? colors.text.tertiary }]} />
                )}
                <Text style={[typography.bodyMed, { color: colors.text.primary, flex: 1, marginLeft: 12 }]}>
                  {it.label}
                </Text>
                {it.selected ? <Check size={18} color={colors.brand.royal} /> : null}
              </TouchableOpacity>
            ))}
          </ScrollView>
          <Button title="Close" variant="outline" onPress={onClose} fullWidth style={{ marginTop: spacing.md }} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg.app },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
    backgroundColor: colors.bg.app,
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
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
  },
  actionPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: colors.brand.royal,
    borderRadius: 10,
  },
  actionGreen: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: '#15803D',
    borderRadius: 10,
  },
  actionGhost: {
    width: 48,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg.highlight,
    borderRadius: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
    gap: 12,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.brand.light,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  timelineItem: { flexDirection: 'row', gap: 12 },
  timelineLeft: { width: 14, alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.brand.royal, marginTop: 4 },
  line: { width: 2, flex: 1, backgroundColor: colors.border.default, marginTop: 2 },
  sheetBg: { flex: 1, backgroundColor: 'rgba(11,27,61,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.bg.surface,
    padding: spacing.lg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: spacing.xl,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border.default,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  pickItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  statusBullet: { width: 10, height: 10, borderRadius: 5 },
});
