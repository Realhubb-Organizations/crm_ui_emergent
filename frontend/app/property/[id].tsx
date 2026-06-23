import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Building2, Flame, MapPin, ShieldCheck, TrendingUp } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '@/src/api/client';
import { Avatar } from '@/src/components/Avatar';
import { Bars } from '@/src/components/charts';
import { Card, KPI, Pill, Section } from '@/src/components/ui';
import { colors, radii, shadow, spacing, statusColor, typography } from '@/src/theme';

type Property = {
  id: string;
  name: string;
  builder: string;
  city: string;
  location: string;
  bhk: string[];
  price_min: number;
  price_max: number;
  area_min: number;
  area_max: number;
  image: string;
  rera: string;
  status: string;
  amenities: string[];
  leads_count: number;
  site_visits: number;
  bookings: number;
  conversion_pct: number;
};

type Lead = {
  id: string;
  name: string;
  status: string;
  is_hot: boolean;
  assigned_avatar?: string;
  assigned_name?: string;
};

export default function PropertyDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [property, setProperty] = useState<Property | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);

  const load = useCallback(async () => {
    if (!id) return;
    const d = await api<{ property: Property; leads: Lead[] }>(`/properties/${id}`);
    setProperty(d.property);
    setLeads(d.leads);
  }, [id]);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  if (!property) {
    return (
      <SafeAreaView style={styles.root}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backFloat} testID="property-back">
          <ArrowLeft size={20} color={colors.text.primary} />
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Image source={{ uri: property.image }} style={styles.hero} />
        <SafeAreaView edges={['top']} style={styles.heroOverlay}>
          <TouchableOpacity style={styles.backCircle} onPress={() => router.back()} testID="property-back">
            <ArrowLeft size={20} color={colors.text.primary} />
          </TouchableOpacity>
        </SafeAreaView>

        <View style={styles.body}>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
            <Pill label={property.status} bg={colors.brand.light} fg={colors.brand.royal} />
            <Pill label={property.rera} icon={ShieldCheck} />
          </View>
          <Text style={[typography.h2, { color: colors.text.primary }]}>{property.name}</Text>
          <Text style={[typography.body, { color: colors.text.secondary, marginTop: 2 }]}>
            by {property.builder}
          </Text>
          <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center', marginTop: 8 }}>
            <MapPin size={14} color={colors.text.tertiary} />
            <Text style={[typography.caption, { color: colors.text.secondary }]}>{property.location}</Text>
          </View>

          <View style={styles.priceCard}>
            <View>
              <Text style={[typography.caption, { color: colors.text.tertiary }]}>Price Range</Text>
              <Text style={[typography.h3, { color: colors.brand.royal }]}>
                ₹{property.price_min}L – ₹{property.price_max}L
              </Text>
            </View>
            <View style={styles.priceDiv} />
            <View>
              <Text style={[typography.caption, { color: colors.text.tertiary }]}>Carpet Area</Text>
              <Text style={[typography.h4, { color: colors.text.primary }]}>
                {property.area_min}–{property.area_max} sqft
              </Text>
            </View>
          </View>

          <Section title="Configurations">
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              {property.bhk.map((b) => (
                <Pill key={b} label={b} bg={colors.bg.surface} fg={colors.text.primary} />
              ))}
            </View>
          </Section>

          <Section title="Performance">
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <KPI label="Leads" value={property.leads_count} icon={Building2} />
              <KPI label="Site Visits" value={property.site_visits} icon={TrendingUp} />
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
              <KPI label="Bookings" value={property.bookings} icon={ShieldCheck} tone="dark" />
              <KPI label="Conversion" value={`${property.conversion_pct}%`} icon={TrendingUp} />
            </View>
          </Section>

          <Section title="Conversion Funnel">
            <Card>
              <Bars
                data={[
                  { label: 'Leads', value: property.leads_count },
                  { label: 'Visits', value: property.site_visits },
                  { label: 'Bookings', value: property.bookings },
                ]}
                height={140}
              />
            </Card>
          </Section>

          <Section title="Amenities">
            <Card>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                {property.amenities.map((a) => (
                  <Pill key={a} label={a} bg={colors.bg.highlight} fg={colors.text.primary} />
                ))}
              </View>
            </Card>
          </Section>

          <Section title="Recent Leads">
            <Card>
              {leads.length === 0 ? (
                <Text style={[typography.body, { color: colors.text.secondary }]}>No leads yet.</Text>
              ) : (
                leads.map((l, idx) => {
                  const sc = statusColor(l.status);
                  return (
                    <TouchableOpacity
                      key={l.id}
                      onPress={() => router.push(`/lead/${l.id}`)}
                      style={[styles.leadRow, idx === leads.length - 1 ? { borderBottomWidth: 0 } : null]}
                      testID={`prop-lead-${l.id}`}
                    >
                      <Avatar uri={l.assigned_avatar} name={l.name} size={32} />
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={[typography.bodyMed, { color: colors.text.primary }]} numberOfLines={1}>
                            {l.name}
                          </Text>
                          {l.is_hot ? <Flame size={12} color={colors.status.hot} fill={colors.status.hot} /> : null}
                        </View>
                        <Text style={[typography.caption, { color: colors.text.tertiary }]}>{l.assigned_name ?? '—'}</Text>
                      </View>
                      <Pill label={l.status} bg={sc.bg} fg={sc.fg} />
                    </TouchableOpacity>
                  );
                })
              )}
            </Card>
          </Section>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg.app },
  hero: { width: '100%', height: 260, backgroundColor: colors.bg.highlight },
  heroOverlay: { position: 'absolute', top: 0, left: 0, right: 0 },
  backCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    margin: spacing.md,
    ...shadow.md,
  },
  backFloat: { position: 'absolute', top: 50, left: 16 },
  body: { padding: spacing.md, marginTop: -20, backgroundColor: colors.bg.app, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  priceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    ...shadow.sm,
  },
  priceDiv: { width: 1, height: 36, backgroundColor: colors.border.default, marginHorizontal: spacing.md },
  leadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
});
