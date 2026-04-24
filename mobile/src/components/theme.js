import { Dimensions } from 'react-native';

const { width } = Dimensions.get('window');
const scale = size => Math.round((width / 375) * size);

export const colors = {
  // Brand
  primary: '#4F46E5',
  primaryLight: '#EEF2FF',
  primaryDark: '#3730A3',

  // Background
  background: '#F8F9FC',
  surface: '#FFFFFF',
  surfaceSecondary: '#F1F5F9',

  // Text
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  textTertiary: '#94A3B8',

  // Entity tag colours
  tagSIP: {bg: '#DCFCE7', text: '#166534'},
  tagEMI: {bg: '#FEF9C3', text: '#854D0E'},
  tagLoan: {bg: '#FEE2E2', text: '#991B1B'},
  tagBudget: {bg: '#EDE9FE', text: '#5B21B6'},
  tagDeadline: {bg: '#FFE4E6', text: '#9F1239'},
  tagOther: {bg: '#F1F5F9', text: '#475569'},

  // Status
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',

  // UI
  border: '#E2E8F0',
  divider: '#F1F5F9',
  shadow: 'rgba(15, 23, 42, 0.08)',

  // Action items accent
  actionBg: '#FFF7ED',
  actionBorder: '#FED7AA',
  actionText: '#9A3412',
  actionDot: '#F97316',
};

export const typography = {
  h1: {fontSize: scale(28), fontWeight: '700', color: colors.textPrimary},
  h2: {fontSize: scale(22), fontWeight: '600', color: colors.textPrimary},
  h3: {fontSize: scale(18), fontWeight: '600', color: colors.textPrimary},
  h4: {fontSize: scale(16), fontWeight: '600', color: colors.textPrimary},
  body: {fontSize: scale(15), fontWeight: '400', color: colors.textPrimary, lineHeight: scale(24)},
  bodySmall: {fontSize: scale(13), fontWeight: '400', color: colors.textSecondary, lineHeight: scale(20)},
  caption: {fontSize: scale(12), fontWeight: '400', color: colors.textTertiary},
  label: {fontSize: scale(12), fontWeight: '600', letterSpacing: 0.5},
};

export const spacing = {xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48};

export const radius = {sm: 8, md: 12, lg: 16, xl: 24, full: 999};

export const shadows = {
  sm: {
    shadowColor: colors.shadow,
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 1,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: colors.shadow,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
};
