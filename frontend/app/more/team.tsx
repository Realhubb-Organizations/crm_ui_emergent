import { Stack, useRouter } from 'expo-router';
import { ArrowLeft, Mail, Phone, Star, Users } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '@/src/api/client';
import { Avatar } from '@/src/components/Avatar';
import { Card, Pill } from '@/src/components/ui';
import { colors, spacing, typography } from '@/src/theme';

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

export default function TeamScreen() {
  const router = useRouter();
  const [items, setItems] = useState<AgentWithPerf[]>([]);

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

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

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
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 32 }}
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
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
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
              <TouchableOpacity style={[styles.action, { backgroundColor: colors.bg.highlight }]} testID={`team-email-${item.id}`}>
                <Mail size={14} color={colors.text.secondary} />
                <Text style={[typography.caption, { color: colors.text.secondary, fontWeight: '600' }]} numberOfLines={1}>
                  {item.email}
                </Text>
              </TouchableOpacity>
            </View>
          </Card>
        )}
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
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
  },
  action: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: colors.brand.light,
    borderRadius: 10,
  },
});
