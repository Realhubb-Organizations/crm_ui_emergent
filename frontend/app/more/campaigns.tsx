import { Stack, useRouter } from 'expo-router';
import { ArrowLeft, Megaphone, Pencil, Plus, Trash2, TrendingUp } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '@/src/api/client';
import { Card, Pill } from '@/src/components/ui';
import { EntityEditSheet, FormField } from '@/src/components/EntityEditSheet';
import { colors, radii, shadow, spacing, statusColor, typography } from '@/src/theme';

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

const CAMPAIGN_FIELDS: FormField[] = [
  { key: 'name', label: 'Name', type: 'text', placeholder: 'Festive Push - Mumbai', required: true },
  { key: 'channel', label: 'Channel', type: 'options', options: ['Facebook', 'Google', 'Instagram', 'YouTube'], required: true },
  { key: 'status', label: 'Status', type: 'options', options: ['Active', 'Paused', 'Completed'] },
  { key: 'spend', label: 'Spend (₹)', type: 'number', placeholder: '100000' },
  { key: 'leads', label: 'Leads', type: 'number', placeholder: '250' },
  { key: 'bookings', label: 'Bookings', type: 'number', placeholder: '5' },
];

function inr(n: number) {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(1)}Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)}L`;
  if (n >= 1e3) return `₹${(n / 1e3).toFixed(1)}K`;
  return `₹${n}`;
}

export default function CampaignsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<Campaign[]>([]);
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Campaign | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    const list = await api<Campaign[]>('/campaigns');
    setItems(list);
  }, []);

  useEffect(() => { load().catch(() => {}); }, [load]);

  function flash(msg: string) { setToast(msg); setTimeout(() => setToast(null), 1600); }

  async function create(values: Record<string, any>) {
    await api('/campaigns', { method: 'POST', body: values });
    setCreating(false);
    await load();
    flash('Campaign created');
  }

  async function update(values: Record<string, any>) {
    if (!editing) return;
    await api(`/campaigns/${editing.id}`, { method: 'PATCH', body: values });
    setEditing(null);
    await load();
    flash('Campaign updated');
  }

  async function remove() {
    if (!confirmDelete) return;
    await api(`/campaigns/${confirmDelete.id}`, { method: 'DELETE' });
    setConfirmDelete(null);
    await load();
    flash('Campaign deleted');
  }

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
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 96 }}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => {
          const sc = item.status === 'Active' ? statusColor('Booked') : item.status === 'Paused' ? statusColor('Negotiation') : statusColor('Contacted');
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
                  <Text style={[typography.caption, { color: colors.text.tertiary, marginTop: 2 }]}>{item.channel}</Text>
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
              <View style={styles.rowActions}>
                <TouchableOpacity
                  style={styles.editBtn}
                  onPress={() => setEditing(item)}
                  testID={`camp-edit-${item.id}`}
                >
                  <Pencil size={14} color={colors.brand.royal} />
                  <Text style={[typography.caption, { color: colors.brand.royal, fontWeight: '700' }]}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.editBtn, { backgroundColor: colors.status.errorBg }]}
                  onPress={() => setConfirmDelete(item)}
                  testID={`camp-delete-${item.id}`}
                >
                  <Trash2 size={14} color={colors.status.errorText} />
                  <Text style={[typography.caption, { color: colors.status.errorText, fontWeight: '700' }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </Card>
          );
        }}
      />

      <TouchableOpacity style={styles.fab} onPress={() => setCreating(true)} testID="camp-add-fab" activeOpacity={0.85}>
        <Plus size={22} color={colors.text.inverse} strokeWidth={2.6} />
      </TouchableOpacity>

      <EntityEditSheet
        visible={creating}
        title="New campaign"
        fields={CAMPAIGN_FIELDS}
        initial={{ channel: 'Facebook', status: 'Active' }}
        submitLabel="Create"
        onSubmit={create}
        onClose={() => setCreating(false)}
        testID="camp-create-sheet"
      />

      <EntityEditSheet
        visible={!!editing}
        title="Edit campaign"
        fields={CAMPAIGN_FIELDS}
        initial={editing ?? undefined}
        submitLabel="Save"
        onSubmit={update}
        onClose={() => setEditing(null)}
        testID="camp-edit-sheet"
      />

      {confirmDelete ? (
        <View style={styles.confirmBg}>
          <Card style={{ marginHorizontal: spacing.lg }}>
            <Text style={[typography.h4, { color: colors.text.primary }]}>Delete this campaign?</Text>
            <Text style={[typography.body, { color: colors.text.secondary, marginTop: 6 }]}>
              {confirmDelete.name} will be removed from your campaign list. This action cannot be undone.
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: spacing.lg }}>
              <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: colors.bg.highlight }]} onPress={() => setConfirmDelete(null)} testID="camp-delete-cancel">
                <Text style={[typography.bodyMed, { color: colors.text.primary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: colors.status.errorText }]} onPress={remove} testID="camp-delete-confirm">
                <Text style={[typography.bodyMed, { color: colors.text.inverse }]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </Card>
        </View>
      ) : null}

      {toast ? (
        <View style={styles.toast} pointerEvents="none">
          <Text style={[typography.caption, { color: colors.text.inverse, fontWeight: '600' }]}>{toast}</Text>
        </View>
      ) : null}
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
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: colors.bg.app,
    borderBottomWidth: 1, borderBottomColor: colors.border.default,
  },
  iconBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: colors.bg.surface, borderWidth: 1, borderColor: colors.border.default,
    alignItems: 'center', justifyContent: 'center',
  },
  iconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: colors.brand.light, alignItems: 'center', justifyContent: 'center',
  },
  kpiRow: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: spacing.md, paddingTop: spacing.sm,
    borderTopWidth: 1, borderTopColor: colors.border.default,
  },
  div: { width: 1, height: 22, backgroundColor: colors.border.default },
  rowActions: { flexDirection: 'row', gap: 8, marginTop: spacing.sm },
  editBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 8, paddingHorizontal: 10,
    backgroundColor: colors.brand.light, borderRadius: 10,
  },
  fab: {
    position: 'absolute', right: 20, bottom: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.brand.royal,
    alignItems: 'center', justifyContent: 'center',
    ...shadow.lg,
  },
  confirmBg: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(11,27,61,0.5)', alignItems: 'center', justifyContent: 'center',
  },
  confirmBtn: {
    flex: 1, height: 46, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center',
  },
  toast: {
    position: 'absolute', bottom: 96, alignSelf: 'center',
    backgroundColor: colors.brand.navy,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999,
  },
});
