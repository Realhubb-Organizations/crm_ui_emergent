// Centralised design tokens for TASKEZY CRM Admin.
// Strictly derived from /app/design_guidelines.json.

export const colors = {
  brand: {
    navy: '#0B1B3D',
    royal: '#1D4ED8',
    royalSoft: '#3B82F6',
    light: '#EFF6FF',
  },
  bg: {
    app: '#F8FAFC',
    surface: '#FFFFFF',
    highlight: '#F1F5F9',
    headerDark: '#0B1B3D',
  },
  text: {
    primary: '#0B1B3D',
    secondary: '#64748B',
    tertiary: '#94A3B8',
    inverse: '#FFFFFF',
    brand: '#1D4ED8',
  },
  border: {
    default: '#E2E8F0',
    focus: '#1D4ED8',
    soft: 'rgba(11, 27, 61, 0.08)',
  },
  status: {
    successBg: '#DCFCE7',
    successText: '#15803D',
    warningBg: '#FEF3C7',
    warningText: '#B45309',
    errorBg: '#FEE2E2',
    errorText: '#B91C1C',
    infoBg: '#DBEAFE',
    infoText: '#1D4ED8',
    hot: '#FF4500',
    hotBg: '#FFEDD5',
  },
  chart: ['#1D4ED8', '#3B82F6', '#93C5FD', '#0B1B3D', '#60A5FA', '#1E40AF'],
};

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 } as const;
export const radii = { sm: 8, md: 12, lg: 16, xl: 20, full: 9999 } as const;

export const shadow = {
  sm: {
    shadowColor: '#0B1B3D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#0B1B3D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#0B1B3D',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;

export const typography = {
  h1: { fontSize: 32, lineHeight: 40, fontWeight: '800' as const, letterSpacing: -0.5 },
  h2: { fontSize: 24, lineHeight: 32, fontWeight: '700' as const, letterSpacing: -0.4 },
  h3: { fontSize: 20, lineHeight: 28, fontWeight: '700' as const, letterSpacing: -0.3 },
  h4: { fontSize: 18, lineHeight: 26, fontWeight: '600' as const },
  bodyLg: { fontSize: 16, lineHeight: 24, fontWeight: '400' as const },
  body: { fontSize: 14, lineHeight: 20, fontWeight: '400' as const },
  bodyMed: { fontSize: 14, lineHeight: 20, fontWeight: '600' as const },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500' as const, letterSpacing: 0.2 },
  overline: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '700' as const,
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
  },
};

export function statusColor(status: string) {
  switch (status) {
    case 'New':
      return { bg: colors.status.infoBg, fg: colors.status.infoText };
    case 'Contacted':
      return { bg: '#E0E7FF', fg: '#4338CA' };
    case 'Qualified':
      return { bg: colors.status.successBg, fg: colors.status.successText };
    case 'Site Visit':
      return { bg: '#FCE7F3', fg: '#BE185D' };
    case 'Negotiation':
      return { bg: colors.status.warningBg, fg: colors.status.warningText };
    case 'Booked':
      return { bg: '#D1FAE5', fg: '#047857' };
    case 'Lost':
      return { bg: colors.status.errorBg, fg: colors.status.errorText };
    default:
      return { bg: colors.bg.highlight, fg: colors.text.secondary };
  }
}
