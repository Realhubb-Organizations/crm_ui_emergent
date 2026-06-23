import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Polyline, Rect, Text as SvgText } from 'react-native-svg';

import { colors, spacing, typography } from '@/src/theme';

// ---------------- Funnel ---------------------------------------------------
export function Funnel({ data }: { data: { stage: string; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <View style={{ gap: 10 }}>
      {data.map((d, idx) => {
        const w = Math.max(0.08, d.count / max);
        const bg = colors.chart[idx % colors.chart.length];
        return (
          <View key={d.stage}>
            <View style={styles.funnelRow}>
              <Text style={[typography.caption, { color: colors.text.secondary, width: 90 }]}>
                {d.stage}
              </Text>
              <View style={styles.funnelTrack}>
                <View style={[styles.funnelFill, { backgroundColor: bg, width: `${w * 100}%` }]} />
              </View>
              <Text style={[typography.bodyMed, { color: colors.text.primary, width: 36, textAlign: 'right' }]}>
                {d.count}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ---------------- Donut ----------------------------------------------------
export function Donut({
  data,
  size = 140,
}: {
  data: { source: string; count: number }[];
  size?: number;
}) {
  const total = data.reduce((s, d) => s + d.count, 0) || 1;
  const radius = size / 2 - 12;
  const cx = size / 2;
  const cy = size / 2;
  const C = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
      <Svg width={size} height={size}>
        <Circle cx={cx} cy={cy} r={radius} stroke={colors.bg.highlight} strokeWidth={18} fill="none" />
        <G rotation={-90} origin={`${cx}, ${cy}`}>
          {data.slice(0, 6).map((d, i) => {
            const frac = d.count / total;
            const dash = frac * C;
            const el = (
              <Circle
                key={d.source}
                cx={cx}
                cy={cy}
                r={radius}
                stroke={colors.chart[i % colors.chart.length]}
                strokeWidth={18}
                fill="none"
                strokeDasharray={`${dash} ${C - dash}`}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
              />
            );
            offset += dash;
            return el;
          })}
        </G>
        <SvgText
          x={cx}
          y={cy + 4}
          textAnchor="middle"
          fontSize={20}
          fontWeight="700"
          fill={colors.text.primary}
        >
          {total}
        </SvgText>
      </Svg>
      <View style={{ flex: 1, gap: 6 }}>
        {data.slice(0, 5).map((d, i) => (
          <View key={d.source} style={styles.legendRow}>
            <View style={[styles.dot, { backgroundColor: colors.chart[i % colors.chart.length] }]} />
            <Text style={[typography.caption, { color: colors.text.secondary, flex: 1 }]} numberOfLines={1}>
              {d.source}
            </Text>
            <Text style={[typography.caption, { color: colors.text.primary, fontWeight: '700' }]}>
              {d.count}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ---------------- Bar Chart ------------------------------------------------
export function Bars({
  data,
  height = 140,
  color,
}: {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <View>
      <View style={[styles.barsWrap, { height }]}>
        {data.map((d, i) => {
          const h = (d.value / max) * (height - 30);
          return (
            <View key={i} style={styles.barCol}>
              <View style={styles.barValueWrap}>
                <Text style={[typography.caption, { color: colors.text.tertiary, fontSize: 10 }]}>
                  {d.value}
                </Text>
              </View>
              <View
                style={[
                  styles.bar,
                  { height: Math.max(2, h), backgroundColor: color ?? colors.brand.royal },
                ]}
              />
            </View>
          );
        })}
      </View>
      <View style={styles.barLabelRow}>
        {data.map((d, i) => (
          <Text
            key={i}
            style={[typography.caption, { color: colors.text.tertiary, flex: 1, textAlign: 'center', fontSize: 10 }]}
            numberOfLines={1}
          >
            {d.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

// ---------------- Line Chart -----------------------------------------------
export function LineSeries({
  data,
  height = 160,
  color,
}: {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
}) {
  const width = 320;
  const pad = 24;
  const max = Math.max(1, ...data.map((d) => d.value));
  const stepX = (width - pad * 2) / Math.max(1, data.length - 1);
  const points = data.map((d, i) => {
    const x = pad + i * stepX;
    const y = pad + (1 - d.value / max) * (height - pad * 2);
    return `${x},${y}`;
  });
  const stroke = color ?? colors.brand.royal;
  return (
    <View>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        {[0, 0.25, 0.5, 0.75, 1].map((f, i) => (
          <Line
            key={i}
            x1={pad}
            x2={width - pad}
            y1={pad + f * (height - pad * 2)}
            y2={pad + f * (height - pad * 2)}
            stroke={colors.border.default}
            strokeDasharray="2 4"
            strokeWidth={1}
          />
        ))}
        <Polyline points={points.join(' ')} fill="none" stroke={stroke} strokeWidth={2.5} />
        {data.map((d, i) => {
          const x = pad + i * stepX;
          const y = pad + (1 - d.value / max) * (height - pad * 2);
          return <Circle key={i} cx={x} cy={y} r={3} fill={stroke} />;
        })}
      </Svg>
      <View style={styles.lineLabelRow}>
        {data.map((d, i) => (
          <Text
            key={i}
            style={[typography.caption, { color: colors.text.tertiary, flex: 1, textAlign: 'center', fontSize: 10 }]}
            numberOfLines={1}
          >
            {data.length > 10 && i % 3 !== 0 ? '' : d.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

// ---------------- Sparkline (for KPI tiles) --------------------------------
export function Sparkline({ values, color = colors.brand.royal }: { values: number[]; color?: string }) {
  const w = 80;
  const h = 28;
  if (!values.length) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const step = w / (values.length - 1 || 1);
  const pts = values.map((v, i) => `${i * step},${h - ((v - min) / range) * h}`).join(' ');
  return (
    <Svg width={w} height={h}>
      <Polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} />
    </Svg>
  );
}

// ---------------- Stacked horizontal bar (for source share) ----------------
export function StackedBar({
  segments,
}: {
  segments: { label: string; value: number }[];
}) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  return (
    <View>
      <View style={styles.stacked}>
        {segments.slice(0, 6).map((s, i) => (
          <View
            key={s.label}
            style={{ width: `${(s.value / total) * 100}%`, backgroundColor: colors.chart[i % colors.chart.length] }}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  funnelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  funnelTrack: {
    flex: 1,
    height: 22,
    backgroundColor: colors.bg.highlight,
    borderRadius: 6,
    overflow: 'hidden',
  },
  funnelFill: { height: '100%', borderRadius: 6 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  barsWrap: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  barValueWrap: { marginBottom: 4 },
  bar: { width: '70%', borderRadius: 6 },
  barLabelRow: { flexDirection: 'row', marginTop: 6 },
  lineLabelRow: { flexDirection: 'row', marginTop: -8 },
  stacked: {
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    flexDirection: 'row',
    backgroundColor: colors.bg.highlight,
  },
});
