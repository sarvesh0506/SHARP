/**
 * Centralized SHARP Chart Color System
 * Derived exclusively from the official 5-color SHARP palette:
 * Deep Sage (#5D7B6F), Soft Sage (#A4C3A2), Mint Green (#B0D4B8),
 * Warm Cream (#EAE7D6), and Ice Cyan (#D7F9FA).
 */
export const SHARP_CHART_COLORS = {
  primary: '#5D7B6F',
  secondary: '#A4C3A2',
  success: '#B0D4B8',
  info: '#D7F9FA',
  neutral: '#EAE7D6',
  grid: 'rgba(164, 195, 162, 0.14)',
  axis: '#98AB9C',
  tooltipBg: '#16211D',
  tooltipBorder: 'rgba(164, 195, 162, 0.34)',
  tooltipText: '#EAE7D6',
} as const;

export const SHARP_CHART_SERIES = [
  SHARP_CHART_COLORS.primary,
  SHARP_CHART_COLORS.secondary,
  SHARP_CHART_COLORS.success,
  SHARP_CHART_COLORS.info,
  SHARP_CHART_COLORS.neutral,
] as const;
