/** Shared design tokens so every screen looks consistent. */
export const colors = {
  primary: '#16316B',
  primaryDark: '#0F2450',
  primaryLight: '#E8EEFB',
  accent: '#f59e0b',
  bg: '#f5f7fa',
  card: '#ffffff',
  border: '#e2e8f0',
  text: '#0f172a',
  muted: '#64748b',
  danger: '#dc2626',
  dangerBg: '#fef2f2',
  success: '#16a34a',
  successText: '#15803d',
  successBg: '#f0fdf4',
  warnBg: '#fffbeb',
  warnText: '#92400e',
  placeholderBg: '#fef9c3',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const radius = { sm: 8, md: 12, lg: 16 };

export const fontSize = { xs: 12, sm: 13, base: 15, md: 16, lg: 18, xl: 22, xxl: 28 };

/** Manrope family — requires @expo-google-fonts/manrope loaded in app/_layout.tsx */
export const fonts = {
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semiBold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  extraBold: 'Manrope_800ExtraBold',
};