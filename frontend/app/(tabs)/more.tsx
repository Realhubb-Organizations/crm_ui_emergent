import { useRouter } from 'expo-router';
import {
  Bell,
  BookOpen,
  ChevronRight,
  FileBarChart,
  HelpCircle,
  LifeBuoy,
  Lock,
  LogOut,
  Megaphone,
  Plug,
  Settings,
  Share2,
  ShieldCheck,
  User,
  Users,
} from 'lucide-react-native';
import { LucideIcon } from 'lucide-react-native';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/src/components/Avatar';
import { Card, Pill } from '@/src/components/ui';
import { useAuth } from '@/src/context/AuthContext';
import { colors, radii, shadow, spacing, typography } from '@/src/theme';

type Row = { icon: LucideIcon; title: string; subtitle?: string; testID: string; danger?: boolean; onPress?: () => void };

export default function MoreScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const groups: { title: string; rows: Row[] }[] = [
    {
      title: 'Personal',
      rows: [
        { icon: User, title: 'Profile', subtitle: 'Edit your profile details', testID: 'more-profile' },
        {
          icon: Bell,
          title: 'Notifications',
          subtitle: 'Email, push, & in-app alerts',
          testID: 'more-notifications',
          onPress: () => router.push('/notifications'),
        },
        {
          icon: FileBarChart,
          title: 'Reports',
          subtitle: 'Generate & export reports',
          testID: 'more-reports',
          onPress: () => router.push('/more/reports'),
        },
      ],
    },
    {
      title: 'Management',
      rows: [
        {
          icon: Users,
          title: 'Team Management',
          subtitle: 'Agents, managers, roles',
          testID: 'more-team',
          onPress: () => router.push('/more/team'),
        },
        {
          icon: Megaphone,
          title: 'Campaign Management',
          subtitle: 'Ads, channels, budgets',
          testID: 'more-campaigns',
          onPress: () => router.push('/more/campaigns'),
        },
      ],
    },
    {
      title: 'Integrations',
      rows: [
        { icon: Plug, title: 'Connected Apps', subtitle: 'WhatsApp, Calls, Email', testID: 'more-connected' },
        { icon: Share2, title: 'Integrations', subtitle: 'Magic Bricks, 99acres, Meta', testID: 'more-integrations' },
      ],
    },
    {
      title: 'Settings & Support',
      rows: [
        { icon: Settings, title: 'Settings', subtitle: 'Preferences & workspace', testID: 'more-settings' },
        { icon: LifeBuoy, title: 'Support', subtitle: 'Chat with our team', testID: 'more-support' },
        { icon: BookOpen, title: 'Tutorials', subtitle: 'Learn the platform', testID: 'more-tutorials' },
        { icon: Lock, title: 'Security', subtitle: 'Password, sessions, 2FA', testID: 'more-security' },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <Card style={styles.profileCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <Avatar uri={user?.avatar} name={user?.name} size={56} />
            <View style={{ flex: 1 }}>
              <Text style={[typography.h3, { color: colors.text.primary }]} numberOfLines={1}>
                {user?.name ?? 'Admin'}
              </Text>
              <Text style={[typography.caption, { color: colors.text.secondary }]} numberOfLines={1}>
                {user?.email ?? '—'}
              </Text>
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
                <Pill
                  label={`Role: ${user?.role ?? 'admin'}`}
                  bg={colors.brand.light}
                  fg={colors.brand.royal}
                  icon={ShieldCheck}
                />
              </View>
            </View>
          </View>
        </Card>

        {groups.map((g) => (
          <View key={g.title} style={{ marginTop: spacing.lg }}>
            <Text style={[typography.overline, { color: colors.text.tertiary, paddingHorizontal: 4, marginBottom: 8 }]}>
              {g.title}
            </Text>
            <Card style={{ padding: 0 }}>
              {g.rows.map((r, idx) => {
                const Icon = r.icon;
                return (
                  <TouchableOpacity
                    key={r.title}
                    onPress={r.onPress}
                    activeOpacity={0.85}
                    testID={r.testID}
                    style={[
                      styles.row,
                      idx === g.rows.length - 1 ? { borderBottomWidth: 0 } : null,
                    ]}
                  >
                    <View style={[styles.iconWrap, r.danger ? { backgroundColor: colors.status.errorBg } : null]}>
                      <Icon size={18} color={r.danger ? colors.status.errorText : colors.brand.royal} strokeWidth={2.2} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[typography.bodyMed, { color: r.danger ? colors.status.errorText : colors.text.primary }]}>
                        {r.title}
                      </Text>
                      {r.subtitle ? (
                        <Text style={[typography.caption, { color: colors.text.tertiary, marginTop: 2 }]} numberOfLines={1}>
                          {r.subtitle}
                        </Text>
                      ) : null}
                    </View>
                    <ChevronRight size={18} color={colors.text.tertiary} />
                  </TouchableOpacity>
                );
              })}
            </Card>
          </View>
        ))}

        <View style={{ marginTop: spacing.lg }}>
          <Card style={{ padding: 0 }}>
            <TouchableOpacity
              testID="more-logout"
              activeOpacity={0.85}
              style={styles.row}
              onPress={async () => {
                await signOut();
                router.replace('/login');
              }}
            >
              <View style={[styles.iconWrap, { backgroundColor: colors.status.errorBg }]}>
                <LogOut size={18} color={colors.status.errorText} strokeWidth={2.2} />
              </View>
              <Text style={[typography.bodyMed, { color: colors.status.errorText, flex: 1 }]}>Log out</Text>
            </TouchableOpacity>
          </Card>
        </View>

        <Text style={[typography.caption, { color: colors.text.tertiary, textAlign: 'center', marginTop: spacing.xl }]}>
          TASKEZY CRM Admin · v1.0
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg.app },
  profileCard: { ...shadow.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
    gap: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.brand.light,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
