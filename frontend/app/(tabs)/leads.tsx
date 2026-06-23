import { useRouter } from 'expo-router';
import {
  Flame,
  KanbanSquare,
  List,
  MessageCircle,
  Phone,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '@/src/api/client';
import { Avatar } from '@/src/components/Avatar';
import { ChipRow } from '@/src/components/ChipRow';
import { Button, Card, Pill } from '@/src/components/ui';
import { colors, radii, shadow, spacing, statusColor, typography } from '@/src/theme';

const STATUS_FILTERS = [
  { label: 'All', value: 'All' },
  { label: 'New', value: 'New' },
  { label: 'Contacted', value: 'Contacted' },
  { label: 'Qualified', value: 'Qualified' },
  { label: 'Site Visit', value: 'Site Visit' },
  { label: 'Negotiation', value: 'Negotiation' },
  { label: 'Booked', value: 'Booked' },
  { label: 'Lost', value: 'Lost' },
];

const SOURCES = ['All', 'Website', 'Facebook Ads', 'Google Ads', 'Instagram', 'Referral', 'Walk-in', 'Magic Bricks', '99acres'];

type Lead = {
  id: string;
  name: string;
  phone: string;
  email: string;
  source: string;
  status: string;
  stage: string;
  is_hot: boolean;
  score: number;
  property_name: string;
  budget: number;
  assigned_name?: string;
  assigned_avatar?: string;
  created_at: string;
};

export default function LeadsScreen() {
  const router = useRouter();
  const [view, setView] = useState<'list' | 'pipeline'>('list');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('All');
  const [source, setSource] = useState('All');
  const [hotOnly, setHotOnly] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [pipeline, setPipeline] = useState<Record<string, Lead[]>>({});
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (view === 'list') {
        const list = await api<Lead[]>('/leads', {
          query: {
            q: q.trim() || undefined,
            status: status === 'All' ? undefined : status,
            source: source === 'All' ? undefined : source,
            is_hot: hotOnly ? true : undefined,
          },
        });
        setLeads(list);
      } else {
        const pipe = await api<Record<string, Lead[]>>('/leads/pipeline');
        setPipeline(pipe);
      }
    } finally {
      setLoading(false);
    }
  }, [q, status, source, hotOnly, view]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const headerHeight = useMemo(() => 56 + 56 + 56, []);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={[typography.h2, { color: colors.text.primary }]} testID="leads-title">
            Leads
          </Text>
          <View style={styles.viewToggle}>
            <TouchableOpacity
              testID="view-list"
              onPress={() => setView('list')}
              style={[styles.toggleBtn, view === 'list' ? styles.toggleActive : null]}
            >
              <List size={16} color={view === 'list' ? colors.text.inverse : colors.text.secondary} />
            </TouchableOpacity>
            <TouchableOpacity
              testID="view-pipeline"
              onPress={() => setView('pipeline')}
              style={[styles.toggleBtn, view === 'pipeline' ? styles.toggleActive : null]}
            >
              <KanbanSquare size={16} color={view === 'pipeline' ? colors.text.inverse : colors.text.secondary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.searchRow}>
          <View style={styles.search}>
            <Search size={18} color={colors.text.tertiary} />
            <TextInput
              testID="leads-search-input"
              value={q}
              onChangeText={setQ}
              placeholder="Search by name, phone, email"
              placeholderTextColor={colors.text.tertiary}
              style={styles.searchInput}
            />
            {q ? (
              <TouchableOpacity onPress={() => setQ('')} testID="leads-search-clear">
                <X size={16} color={colors.text.tertiary} />
              </TouchableOpacity>
            ) : null}
          </View>
          <TouchableOpacity
            style={styles.filterBtn}
            onPress={() => setFiltersOpen(true)}
            testID="leads-open-filters"
          >
            <SlidersHorizontal size={18} color={colors.brand.royal} />
            {(source !== 'All' || hotOnly) && <View style={styles.filterDot} />}
          </TouchableOpacity>
        </View>

        <ChipRow items={STATUS_FILTERS} value={status} onChange={setStatus} testIDPrefix="leads-status" />
      </View>

      {view === 'list' ? (
        <FlatList
          data={leads}
          keyExtractor={(it) => it.id}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: 24 }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={({ item }) => <LeadCard lead={item} onPress={() => router.push(`/lead/${item.id}`)} />}
          ListEmptyComponent={
            !loading ? (
              <View style={{ alignItems: 'center', padding: spacing.xl }}>
                <Text style={[typography.bodyMed, { color: colors.text.secondary }]}>No leads found</Text>
              </View>
            ) : null
          }
        />
      ) : (
        <PipelineView pipeline={pipeline} onSelect={(id) => router.push(`/lead/${id}`)} />
      )}

      <FiltersModal
        visible={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        source={source}
        setSource={setSource}
        hotOnly={hotOnly}
        setHotOnly={setHotOnly}
      />
    </SafeAreaView>
  );
}

function LeadCard({ lead, onPress }: { lead: Lead; onPress: () => void }) {
  const sc = statusColor(lead.status);
  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} testID={`lead-card-${lead.id}`}>
      <Card>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Avatar uri={lead.assigned_avatar} name={lead.name} size={44} />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[typography.bodyMed, { color: colors.text.primary }]} numberOfLines={1}>
                {lead.name}
              </Text>
              {lead.is_hot ? <Flame size={14} color={colors.status.hot} fill={colors.status.hot} /> : null}
              <View style={{ flex: 1 }} />
              <Text style={[typography.caption, { color: colors.text.tertiary }]}>{lead.score}</Text>
            </View>
            <Text style={[typography.caption, { color: colors.text.secondary, marginTop: 2 }]} numberOfLines={1}>
              {lead.phone} · {lead.source}
            </Text>
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
              <Pill label={lead.status} bg={sc.bg} fg={sc.fg} />
              {lead.property_name ? <Pill label={lead.property_name} /> : null}
            </View>
          </View>
        </View>
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.action} testID={`lead-call-${lead.id}`}>
            <Phone size={16} color={colors.brand.royal} />
            <Text style={[typography.caption, { color: colors.brand.royal, fontWeight: '700' }]}>Call</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.action, { backgroundColor: '#DCFCE7' }]}
            testID={`lead-whatsapp-${lead.id}`}
          >
            <MessageCircle size={16} color="#15803D" />
            <Text style={[typography.caption, { color: '#15803D', fontWeight: '700' }]}>WhatsApp</Text>
          </TouchableOpacity>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

function PipelineView({
  pipeline,
  onSelect,
}: {
  pipeline: Record<string, Lead[]>;
  onSelect: (id: string) => void;
}) {
  const stages = ['New', 'Contacted', 'Qualified', 'Site Visit', 'Negotiation', 'Booked'];
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.pipeRow}
    >
      {stages.map((stage) => {
        const items = pipeline[stage] || [];
        const sc = statusColor(stage);
        return (
          <View key={stage} style={styles.pipeCol}>
            <View style={styles.pipeHeader}>
              <View style={[styles.pipeDot, { backgroundColor: sc.fg }]} />
              <Text style={[typography.bodyMed, { color: colors.text.primary, flex: 1 }]}>{stage}</Text>
              <Text style={[typography.caption, { color: colors.text.tertiary }]}>{items.length}</Text>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {items.map((l) => (
                <TouchableOpacity
                  key={l.id}
                  onPress={() => onSelect(l.id)}
                  activeOpacity={0.9}
                  testID={`pipeline-lead-${l.id}`}
                >
                  <View style={styles.pipeCard}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={[typography.bodyMed, { color: colors.text.primary, flex: 1 }]} numberOfLines={1}>
                        {l.name}
                      </Text>
                      {l.is_hot ? <Flame size={12} color={colors.status.hot} fill={colors.status.hot} /> : null}
                    </View>
                    <Text style={[typography.caption, { color: colors.text.tertiary, marginTop: 2 }]} numberOfLines={1}>
                      {l.property_name}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 6 }}>
                      <Avatar uri={l.assigned_avatar} name={l.assigned_name} size={20} />
                      <Text style={[typography.caption, { color: colors.text.secondary, flex: 1 }]} numberOfLines={1}>
                        {l.assigned_name ?? '—'}
                      </Text>
                      <Text style={[typography.caption, { color: colors.brand.royal, fontWeight: '700' }]}>
                        ₹{l.budget}L
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
              <View style={{ height: 24 }} />
            </ScrollView>
          </View>
        );
      })}
    </ScrollView>
  );
}

function FiltersModal({
  visible,
  onClose,
  source,
  setSource,
  hotOnly,
  setHotOnly,
}: {
  visible: boolean;
  onClose: () => void;
  source: string;
  setSource: (s: string) => void;
  hotOnly: boolean;
  setHotOnly: (b: boolean) => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.sheetBg}>
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
            <Text style={[typography.h3, { color: colors.text.primary, flex: 1 }]}>Filters</Text>
            <TouchableOpacity onPress={onClose} testID="filters-close">
              <X size={20} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          <Text style={[typography.overline, { color: colors.text.tertiary }]}>Source</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10, marginBottom: spacing.lg }}>
            {SOURCES.map((s) => {
              const active = s === source;
              return (
                <TouchableOpacity
                  key={s}
                  onPress={() => setSource(s)}
                  testID={`filter-source-${s}`}
                  style={[styles.sourceChip, active ? styles.sourceChipActive : null]}
                >
                  <Text
                    style={[
                      typography.caption,
                      { color: active ? colors.text.inverse : colors.text.secondary, fontWeight: '600' },
                    ]}
                  >
                    {s}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={styles.toggleRow}
            onPress={() => setHotOnly(!hotOnly)}
            testID="filter-hot-toggle"
          >
            <Flame size={18} color={colors.status.hot} fill={hotOnly ? colors.status.hot : 'transparent'} />
            <Text style={[typography.bodyMed, { color: colors.text.primary, flex: 1, marginLeft: 10 }]}>
              Show hot leads only
            </Text>
            <View style={[styles.toggle, hotOnly ? styles.toggleOn : null]}>
              <View style={[styles.knob, hotOnly ? styles.knobOn : null]} />
            </View>
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', gap: 10, marginTop: spacing.lg }}>
            <Button
              title="Reset"
              variant="outline"
              fullWidth
              style={{ flex: 1 }}
              onPress={() => {
                setSource('All');
                setHotOnly(false);
              }}
            />
            <Button title="Apply" fullWidth style={{ flex: 1 }} onPress={onClose} testID="filters-apply" />
          </View>
        </View>
      </View>
    </Modal>
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
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: colors.bg.surface,
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  toggleBtn: { width: 36, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  toggleActive: { backgroundColor: colors.brand.royal },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  search: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 44,
    backgroundColor: colors.bg.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.default,
    paddingHorizontal: 12,
  },
  searchInput: { flex: 1, color: colors.text.primary, fontSize: 14 },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.bg.surface,
    borderWidth: 1,
    borderColor: colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.status.hot,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
  },
  action: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    backgroundColor: colors.brand.light,
    borderRadius: 10,
  },
  pipeRow: { padding: spacing.md, gap: 10 },
  pipeCol: {
    width: 260,
    backgroundColor: colors.bg.highlight,
    borderRadius: 14,
    padding: 10,
    maxHeight: '100%',
  },
  pipeHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 10 },
  pipeDot: { width: 8, height: 8, borderRadius: 4 },
  pipeCard: {
    backgroundColor: colors.bg.surface,
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  sheetBg: { flex: 1, backgroundColor: 'rgba(11,27,61,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.bg.surface,
    padding: spacing.lg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: spacing.xl,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border.default,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  sourceChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.bg.app,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  sourceChipActive: { backgroundColor: colors.brand.royal, borderColor: colors.brand.royal },
  toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  toggle: {
    width: 44,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.border.default,
    padding: 2,
  },
  toggleOn: { backgroundColor: colors.brand.royal },
  knob: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff' },
  knobOn: { alignSelf: 'flex-end' },
});
