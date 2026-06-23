import { Stack, useRouter } from 'expo-router';
import { ArrowLeft, Mail, Pencil, Phone, Plus, Star, Trash2, Users } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '@/src/api/client';
import { Avatar } from '@/src/components/Avatar';
import { Card, Pill } from '@/src/components/ui';
import { EntityEditSheet, FormField } from '@/src/components/EntityEditSheet';
import { colors, radii, shadow, spacing, typography } from '@/src/theme';

type Agent = {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  city: string;
  rating: number;
};
type AgentWithPerf = Agent & { leads: number; bookings: number; conversion_pct: number };

const AGENT_FIELDS: FormField[] = [
  { key: 'name', label: 'Name', type: 'text', placeholder: 'Riya Mehta', required: true },
  { key: 'email', label: 'Email', type: 'email', placeholder: 'agent@taskezy.com', required: true },
  { key: 'phone', label: 'Phone', type: 'phone', placeholder: '+91 98765 43210', required: true },
  { key: 'city', label: 'City', type: 'options', options: ['Mumbai', 'Bengaluru', 'Pune', 'Hyderabad', 'Delhi NCR', 'Chennai'] },
];

export default function TeamScreen() {
  const router = useRouter();
  const [items, setItems] = useState<AgentWithPerf[]>([]);
  const [editing, setEditing] = useState<Agent | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Agent | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [agents, top] = await Promise.all([
      api<Agent[]>('/agents'),
      api<AgentWithPerf[]>('/dashboard/top-agents'),
    ]);
    const perf = new Map(top.map((a) => [a.id, a]));
    setItems(
      agents.map((a) => ({
        ...a,
        leads: perf.get(a.id)?.leads ?? 0,
        bookings: perf.get(a.id)?.bookings ?? 0,
        conversion_pct: perf.get(a.id)?.conversion_pct ?? 0,
      })),
    );
  }, []);

  useEffect(() => { load().catch(() => {}); }, [load]);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 1600);
  }

  async function create(values: Record<string, any>) {
    await api('/agents', { method: 'POST', body: values });
    setCreating(false);
    await load();
    flash('Agent added');
  }

  async function update(values: Record<string, any>) {
    if (!editing) return;
    await api(`/agents/${editing.id}`, { method: 'PATCH', body: values });
    setEditing(null);
    await load();
    flash('Agent updated');
  }

  async function remove() {
    if (!confirmDelete) return;
    await api(`/agents/${confirmDelete.id}`, { method: 'DELETE' });
    setConfirmDelete(null);
    await load();
    flash('Agent removed');
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} testID="team-back">
          <ArrowLeft size={20} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[typography.h3, { color: colors.text.primary, flex: 1, marginLeft: 8 }]}>Team</Text>
        <Pill label={`${items.length} agents`} bg={colors.brand.light} fg={colors.brand.royal} icon={Users} />
      </View>

      <FlatList
        data={items}
        keyExtractor={(it) => it.id}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 96 }}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => (
          <Card>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Avatar uri={item.avatar} name={item.name} size={48} />
              <View style={{ flex: 1 }}>
                <Text style={[typography.bodyMed, { color: colors.text.primary }]} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={[typography.caption, { color: colors.text.tertiary, marginTop: 2 }]} numberOfLines={1}>
                  {item.city} · ⭐ {item.rating}
                </Text>
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                  <Pill label={`${item.leads} leads`} />
                  <Pill label={`${item.bookings} bookings`} bg={colors.status.successBg} fg={colors.status.successText} />
                  <Pill label={`${item.conversion_pct}%`} bg={colors.brand.light} fg={colors.brand.royal} icon={Star} />
                </View>
              </View>
            </View>
            <View style={styles.actions}>
              <TouchableOpacity style={styles.action} testID={`team-call-${item.id}`}>
                <Phone size={14} color={colors.brand.royal} />
                <Text style={[typography.caption, { color: colors.brand.royal, fontWeight: '700' }]} numberOfLines={1}>
                  {item.phone}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.iconAction, { backgroundColor: colors.brand.light }]}
                onPress={() => setEditing(item)}
                testID={`team-edit-${item.id}`}
              >
                <Pencil size={14} color={colors.brand.royal} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.iconAction, { backgroundColor: colors.status.errorBg }]}
                onPress={() => setConfirmDelete(item)}
                testID={`team-delete-${item.id}`}
              >
                <Trash2 size={14} color={colors.status.errorText} />
              </TouchableOpacity>
            </View>
          </Card>
        )}
      />

      <TouchableOpacity style={styles.fab} onPress={() => setCreating(true)} testID="team-add-fab" activeOpacity={0.85}>
        <Plus size={22} color={colors.text.inverse} strokeWidth={2.6} />
      </TouchableOpacity>

      <EntityEditSheet
        visible={creating}
        title="Add agent"
        fields={AGENT_FIELDS}
        initial={{ city: 'Mumbai' }}
        submitLabel="Create"
        onSubmit={create}
        onClose={() => setCreating(false)}
        testID="team-create-sheet"
      />

      <EntityEditSheet
        visible={!!editing}
        title="Edit agent"
        fields={AGENT_FIELDS}
        initial={editing ?? undefined}
        submitLabel="Save"
        onSubmit={update}
        onClose={() => setEditing(null)}
        testID="team-edit-sheet"
      />

      {confirmDelete ? (
        <ConfirmDelete name={confirmDelete.name} onCancel={() => setConfirmDelete(null)} onConfirm={remove} />
      ) : null}

      {toast ? (
        <View style={styles.toast} pointerEvents="none">
          <Text style={[typography.caption, { color: colors.text.inverse, fontWeight: '600' }]}>{toast}</Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

function ConfirmDelete({ name, onCancel, onConfirm }: { name: string; onCancel: () => void; onConfirm: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  return (
    <View style={styles.confirmBg}>
      <Card style={{ marginHorizontal: spacing.lg }}>
        <Text style={[typography.h4, { color: colors.text.primary }]}>Remove this agent?</Text>
        <Text style={[typography.body, { color: colors.text.secondary, marginTop: 6 }]}>
          {name} will no longer appear in your team list. Their assigned leads remain unchanged.
        </Text>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: spacing.lg }}>
          <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: colors.bg.highlight }]} onPress={onCancel} testID="team-delete-cancel">
            <Text style={[typography.bodyMed, { color: colors.text.primary }]}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.confirmBtn, { backgroundColor: colors.status.errorText }]}
            onPress={async () => { setBusy(true); try { await onConfirm(); } finally { setBusy(false); } }}
            testID="team-delete-confirm"
          >
            <Text style={[typography.bodyMed, { color: colors.text.inverse }]}>{busy ? 'Removing…' : 'Remove'}</Text>
          </TouchableOpacity>
        </View>
      </Card>
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
  actions: {
    flexDirection: 'row', gap: 8,
    marginTop: spacing.md, paddingTop: spacing.sm,
    borderTopWidth: 1, borderTopColor: colors.border.default,
  },
  action: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 8, paddingHorizontal: 10,
    backgroundColor: colors.brand.light, borderRadius: 10,
  },
  iconAction: { width: 38, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
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
