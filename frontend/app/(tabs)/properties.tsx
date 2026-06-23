import { useRouter } from 'expo-router';
import { Building2, MapPin, Search, X } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '@/src/api/client';
import { ChipRow } from '@/src/components/ChipRow';
import { Card, Pill } from '@/src/components/ui';
import { colors, radii, shadow, spacing, typography } from '@/src/theme';

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
  status: string;
  leads_count: number;
  site_visits: number;
  bookings: number;
  conversion_pct: number;
};

const CITIES = [
  { label: 'All Cities', value: 'All' },
  { label: 'Mumbai', value: 'Mumbai' },
  { label: 'Bengaluru', value: 'Bengaluru' },
  { label: 'Pune', value: 'Pune' },
  { label: 'Hyderabad', value: 'Hyderabad' },
  { label: 'Delhi NCR', value: 'Delhi NCR' },
  { label: 'Chennai', value: 'Chennai' },
];

const BHK = [
  { label: 'Any BHK', value: 'All' },
  { label: '1 BHK', value: '1 BHK' },
  { label: '2 BHK', value: '2 BHK' },
  { label: '3 BHK', value: '3 BHK' },
  { label: '4 BHK', value: '4 BHK' },
  { label: 'Villa', value: 'Villa' },
  { label: 'Penthouse', value: 'Penthouse' },
];

export default function PropertiesScreen() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [city, setCity] = useState('All');
  const [bhk, setBhk] = useState('All');
  const [items, setItems] = useState<Property[]>([]);

  const load = useCallback(async () => {
    const list = await api<Property[]>('/properties', {
      query: {
        q: q.trim() || undefined,
        city: city === 'All' ? undefined : city,
        bhk: bhk === 'All' ? undefined : bhk,
      },
    });
    setItems(list);
  }, [q, city, bhk]);

  useEffect(() => {
    const t = setTimeout(() => load().catch(() => {}), 250);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={[typography.h2, { color: colors.text.primary }]}>Properties</Text>
          <View style={styles.countPill}>
            <Building2 size={12} color={colors.brand.royal} />
            <Text style={[typography.caption, { color: colors.brand.royal, fontWeight: '700' }]}>
              {items.length}
            </Text>
          </View>
        </View>

        <View style={styles.searchRow}>
          <View style={styles.search}>
            <Search size={18} color={colors.text.tertiary} />
            <TextInput
              testID="properties-search-input"
              value={q}
              onChangeText={setQ}
              placeholder="Search properties, builders, locations"
              placeholderTextColor={colors.text.tertiary}
              style={styles.searchInput}
            />
            {q ? (
              <TouchableOpacity onPress={() => setQ('')} testID="properties-search-clear">
                <X size={16} color={colors.text.tertiary} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        <ChipRow items={CITIES} value={city} onChange={setCity} testIDPrefix="properties-city" />
        <ChipRow items={BHK} value={bhk} onChange={setBhk} testIDPrefix="properties-bhk" />
      </View>

      <FlatList
        data={items}
        keyExtractor={(it) => it.id}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 32 }}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        renderItem={({ item }) => <PropertyCard item={item} onPress={() => router.push(`/property/${item.id}`)} />}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', padding: spacing.xl }}>
            <Text style={[typography.bodyMed, { color: colors.text.secondary }]}>No properties match</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

function PropertyCard({ item, onPress }: { item: Property; onPress: () => void }) {
  return (
    <TouchableOpacity activeOpacity={0.92} onPress={onPress} testID={`property-card-${item.id}`}>
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <Image source={{ uri: item.image }} style={styles.cover} />
        <View style={styles.statusPill}>
          <Pill label={item.status} bg={colors.bg.surface} fg={colors.text.primary} />
        </View>
        <View style={{ padding: spacing.md }}>
          <Text style={[typography.h4, { color: colors.text.primary }]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={[typography.caption, { color: colors.text.tertiary, marginTop: 2 }]}>
            by {item.builder}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 }}>
            <MapPin size={12} color={colors.text.tertiary} />
            <Text style={[typography.caption, { color: colors.text.secondary }]} numberOfLines={1}>
              {item.location}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            {item.bhk.map((b) => (
              <Pill key={b} label={b} />
            ))}
            <Pill
              label={`₹${item.price_min}–${item.price_max}L`}
              bg={colors.brand.light}
              fg={colors.brand.royal}
            />
          </View>

          <View style={styles.metricStrip}>
            <Metric label="Leads" value={item.leads_count} />
            <View style={styles.metricDiv} />
            <Metric label="Visits" value={item.site_visits} />
            <View style={styles.metricDiv} />
            <Metric label="Bookings" value={item.bookings} />
            <View style={styles.metricDiv} />
            <Metric label="Conv." value={`${item.conversion_pct}%`} accent />
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

function Metric({ label, value, accent }: { label: string; value: number | string; accent?: boolean }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text
        style={[
          typography.bodyMed,
          { color: accent ? colors.brand.royal : colors.text.primary, fontSize: 15 },
        ]}
      >
        {value}
      </Text>
      <Text style={[typography.caption, { color: colors.text.tertiary, fontSize: 11 }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg.app },
  header: {
    backgroundColor: colors.bg.app,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
    paddingBottom: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    gap: 10,
  },
  countPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: colors.brand.light,
  },
  searchRow: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.sm },
  search: {
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
  cover: { width: '100%', height: 180, backgroundColor: colors.bg.highlight },
  statusPill: { position: 'absolute', top: 12, left: 12 },
  metricStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
  },
  metricDiv: { width: 1, height: 28, backgroundColor: colors.border.default },
});
