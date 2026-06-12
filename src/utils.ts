import { DARK_THEME, DEFAULT_HEIGHT, DEFAULT_WIDTH, LIGHT_THEME } from './constants';
import type { DepthThemeColors, ThemeMode } from './types';

export function resolveTheme(theme: ThemeMode | DepthThemeColors | undefined): DepthThemeColors {
  if (!theme) return DARK_THEME;
  if (typeof theme !== 'string') return theme;
  if (theme === 'light') return LIGHT_THEME;
  if (theme === 'dark') return DARK_THEME;
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? LIGHT_THEME : DARK_THEME;
  }
  return DARK_THEME;
}

export function formatPrice(price: number): string {
  if (!Number.isFinite(price)) return '';
  const abs = Math.abs(price);
  if (abs >= 1000) return price.toFixed(2);
  if (abs >= 1) return price.toFixed(4);
  if (abs >= 0.01) return price.toFixed(6);
  return price.toFixed(8);
}

export function formatVolume(volume: number): string {
  if (!Number.isFinite(volume)) return '';
  if (volume >= 1e9) return `${(volume / 1e9).toFixed(2)}B`;
  if (volume >= 1e6) return `${(volume / 1e6).toFixed(2)}M`;
  if (volume >= 1e3) return `${(volume / 1e3).toFixed(2)}K`;
  return volume.toFixed(2);
}

export function containerSize(container: HTMLElement): { width: number; height: number } {
  const rect = container.getBoundingClientRect();
  const width = container.clientWidth || rect.width || DEFAULT_WIDTH;
  const height = container.clientHeight || rect.height || DEFAULT_HEIGHT;
  return { width, height };
}

export function resizeHiDPICanvas(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
): CanvasRenderingContext2D {
  const dpr =
    typeof window !== 'undefined' && Number.isFinite(window.devicePixelRatio)
      ? Math.max(1, window.devicePixelRatio)
      : 1;
  canvas.width = Math.max(1, Math.floor(width * dpr));
  canvas.height = Math.max(1, Math.floor(height * dpr));
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('[depth] 2D canvas context is unavailable');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

export function createLayerCanvas(zIndex: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.style.position = 'absolute';
  canvas.style.inset = '0';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.zIndex = String(zIndex);
  return canvas;
}

export function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

export function niceStep(rawStep: number): number {
  if (!Number.isFinite(rawStep) || rawStep <= 0) return 1;
  const exp = Math.floor(Math.log10(rawStep));
  const base = 10 ** exp;
  const frac = rawStep / base;
  if (frac <= 1) return base;
  if (frac <= 2) return 2 * base;
  if (frac <= 2.5) return 2.5 * base;
  if (frac <= 5) return 5 * base;
  return 10 * base;
}

export function niceGridValues(min: number, max: number, maxTicks = 6): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return [min];
  const step = niceStep((max - min) / maxTicks);
  const start = Math.ceil(min / step) * step;
  const values: number[] = [];
  for (let v = start; v <= max + step * 0.25; v += step) values.push(v);
  return values;
}
