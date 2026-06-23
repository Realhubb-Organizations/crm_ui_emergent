import { Stack, useRouter } from 'expo-router';
import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  BellOff,
  Briefcase,
  CalendarClock,
  CheckCircle2,
  Inbox,
  Sparkles,
} from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '@/src/api/client';
import { Button, Card, Pill } from '@/src/components/ui';
import { colors, spacing, typography } from '@/src/theme';

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  severity: 'info' | 'warn' | 'success';
  lead_id?: string | null;
  read: boolean;
  created_at: string;
};

function timeAgo(iso: string) {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function iconFor(type: string) {
  if (type === 'booking') return CheckCircle2;
  if (type === 'followup') return CalendarClock;
  if (type === 'alert') return AlertTriangle;
  if (type === 'system') return Sparkles;
  if (type === 'lead' || type === 'status') return Briefcase;
  return Bell;
}

function colorsFor(sev: string) {
  if (sev === 'warn') return { bg: colors.status.warningBg, fg: colors.status.warningText };
  if (sev === 'success') return { bg: colors.status.successBg, fg: colors.status.successText };
  return { bg: colors.status.infoBg, fg: colors.status.infoText };
}

export default function NotificationsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<Notification[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const list = await api<Notification[]>('/notifications');
    setItems(list);
  }, []);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  async function open(n: Notification) {
    if (!n.read) {
      await api(`/notifications/${n.id}/read`, { method: 'POST' });
      setItems((s) => s.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    }
    if (n.lead_id) router.push(`/lead/${n.lead_id}`);
  }

  async function markAll() {
    await api('/notifications/read-all', { method: 'POST' });
    setItems((s) => s.map((x) => ({ ...x, read: true })));
  }

  const unread = items.filter((n) => !n.read).length;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} testID="notif-back" style={styles.iconBtn}>
          <ArrowLeft size={20} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[typography.h3, { color: colors.text.primary, flex: 1, marginLeft: 8 }]}>
          Notifications
        </Text>
        {unread > 0 ? (
          <Pill label={`${unread} new`} bg={colors.brand.light} fg={colors.brand.royal} />
        ) : null}
      </View>

      <FlatList
        data={items}
        keyExtractor={(it) => it.id}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListHeaderComponent={
          items.length > 0 ? (
            <View style={{ marginBottom: spacing.sm, alignItems: 'flex-end' }}>
              <Button
                title="Mark all as read"
                variant="ghost"
                onPress={markAll}
                testID="notif-mark-all"
                style={{ paddingHorizontal: 0 }}
              />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={{ alignItems: 'center', padding: spacing.xl, gap: 8 }}>
            <BellOff size={28} color={colors.text.tertiary} />
            <Text style={[typography.bodyMed, { color: colors.text.secondary }]}>You're all caught up</Text>
          </View>
        }
        renderItem={({ item }) => {
          const Icon = iconFor(item.type);
          const c = colorsFor(item.severity);
          return (
            <TouchableOpacity activeOpacity={0.9} onPress={() => open(item)} testID={`notif-${item.id}`}>
              <Card style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, opacity: item.read ? 0.85 : 1 }}>
                <View style={[styles.iconWrap, { backgroundColor: c.bg }]}>
                  <Icon size={16} color={c.fg} strokeWidth={2.4} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[typography.bodyMed, { color: colors.text.primary, flex: 1 }]} numberOfLines={1}>
                      {item.title}
                    </Text>
                    {!item.read ? <View style={styles.dot} /> : null}
                  </View>
                  {item.body ? (
                    <Text style={[typography.caption, { color: colors.text.secondary, marginTop: 2 }]} numberOfLines={2}>
                      {item.body}
                    </Text>
                  ) : null}
                  <Text style={[typography.caption, { color: colors.text.tertiary, marginTop: 6 }]}>
                    {timeAgo(item.created_at)}
                  </Text>
                </View>
              </Card>
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.brand.royal },
});
