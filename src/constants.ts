import type { DepthThemeColors } from './types';

export const DEFAULT_LAYOUT = {
  paddingLeft: 56,
  paddingRight: 72,
  paddingTop: 20,
  paddingBottom: 36,
  yPaddingRatio: 0.08,
} as const;

export const DARK_THEME: DepthThemeColors = {
  background: '#090e13',
  grid: '#17232c',
  axis: '#2a3945',
  text: '#d8e2ea',
  mutedText: '#748594',
  bidLine: '#4fb783',
  bidFill: 'rgba(79, 183, 131, 0.12)',
  askLine: '#d96a6a',
  askFill: 'rgba(217, 106, 106, 0.12)',
  midLine: '#9aa7b2',
  crosshair: '#aeb8c2',
};

export const LIGHT_THEME: DepthThemeColors = {
  background: '#eef2f5',
  grid: '#d4dee6',
  axis: '#a8b7c2',
  text: '#16212a',
  mutedText: '#627380',
  bidLine: '#1f7f58',
  bidFill: 'rgba(31, 127, 88, 0.10)',
  askLine: '#a94f56',
  askFill: 'rgba(169, 79, 86, 0.10)',
  midLine: '#7d8b96',
  crosshair: '#455763',
};

export const DEFAULT_WIDTH = 800;
export const DEFAULT_HEIGHT = 420;
