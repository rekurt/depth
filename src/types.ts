export type DepthSide = 'bid' | 'ask';

export interface DepthLevel {
  price: number;
  volume: number;
}

export interface DepthSnapshot {
  bids: DepthLevel[];
  asks: DepthLevel[];
  midPrice?: number;
  timestamp?: number;
  sequence?: number | string;
}

export interface DepthSideView {
  side: DepthSide;
  price: Float64Array;
  volume: Float64Array;
  cumulativeVolume: Float64Array;
  length: number;
}

export interface DepthView {
  bids: DepthSideView;
  asks: DepthSideView;
  bestBid: number | null;
  bestAsk: number | null;
  midPrice: number | null;
  spread: number | null;
  timestamp?: number;
  sequence?: number | string;
}

export interface DepthBufferOptions {
  /** Keep only the best N merged levels per side before computing cumulative depth. */
  maxLevels?: number;
}

export interface DepthMetrics {
  bestBid: number | null;
  bestAsk: number | null;
  midPrice: number | null;
  spread: number | null;
  spreadBps: number | null;
  bidTotal: number;
  askTotal: number;
  totalVolume: number;
  /** (bidTotal - askTotal) / totalVolume, in [-1, 1]. */
  imbalance: number;
  bidLevels: number;
  askLevels: number;
}

export interface PriceDomain {
  min: number;
  max: number;
}

export type PriceDomainMode = 'centered' | 'fit';

export interface DepthRenderDomainOptions {
  priceDomainMode?: PriceDomainMode;
}

export interface VolumeRange {
  min: number;
  max: number;
}

export interface DepthDomain {
  minPrice: number;
  maxPrice: number;
  minVolume: number;
  maxVolume: number;
}

export interface DepthPointInfo {
  side: DepthSide;
  price: number;
  volume: number;
  cumulativeVolume: number;
  index: number;
}

export interface DepthHoverInfo extends DepthPointInfo {
  x: number;
  y: number;
}

export type ThemeMode = 'dark' | 'light' | 'auto';

export interface DepthThemeColors {
  background: string;
  grid: string;
  axis: string;
  text: string;
  mutedText: string;
  bidLine: string;
  bidFill: string;
  askLine: string;
  askFill: string;
  midLine: string;
  crosshair: string;
}

export type DepthShape = 'step' | 'linear';

export type DepthErrorWhere = 'setData' | 'render' | 'interaction' | 'unknown';

export interface DepthError {
  where: DepthErrorWhere;
  error: Error;
  fatal: boolean;
}

export interface DepthChartOptions {
  container: HTMLElement;
  data?: DepthSnapshot;
  theme?: ThemeMode | DepthThemeColors;
  shape?: DepthShape;
  maxLevels?: number;
  priceDomainMode?: PriceDomainMode;
  showGrid?: boolean;
  showSpread?: boolean;
  showMidLine?: boolean;
  showLabels?: boolean;
  emptyMessage?: string;
  priceFormat?: (price: number) => string;
  volumeFormat?: (volume: number) => string;
  onHover?: (info: DepthHoverInfo | null) => void;
  onError?: (error: DepthError) => void;
}

export type DepthChartUpdateOptions = Partial<
  Omit<DepthChartOptions, 'container' | 'onHover' | 'onError'>
>;
