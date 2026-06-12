import { DEFAULT_LAYOUT } from '../constants';
import type { DepthDomain } from '../types';

export interface DepthViewportSize {
  width: number;
  height: number;
}

export interface PlotBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
  width: number;
  height: number;
}

function expandCollapsed(min: number, max: number): { min: number; max: number } {
  if (max > min) return { min, max };
  const pad = Math.max(Math.abs(min) * 0.01, 0.5);
  return { min: min - pad, max: max + pad };
}

export class DepthViewport {
  private _width: number;
  private _height: number;
  private _domain: DepthDomain = {
    minPrice: 0,
    maxPrice: 1,
    minVolume: 0,
    maxVolume: 1,
  };
  private _effectiveMaxVolume = 1;

  constructor(size: DepthViewportSize) {
    this._width = size.width;
    this._height = size.height;
  }

  setSize(width: number, height: number): void {
    this._width = Math.max(1, width);
    this._height = Math.max(1, height);
  }

  setDomain(domain: DepthDomain): void {
    const price = expandCollapsed(domain.minPrice, domain.maxPrice);
    const maxVolume = Math.max(domain.maxVolume, domain.minVolume, 0);
    const paddedMaxVolume =
      maxVolume > 0 ? maxVolume * (1 + DEFAULT_LAYOUT.yPaddingRatio) : 1;
    this._domain = {
      minPrice: price.min,
      maxPrice: price.max,
      minVolume: 0,
      maxVolume,
    };
    this._effectiveMaxVolume = paddedMaxVolume;
  }

  get width(): number {
    return this._width;
  }

  get height(): number {
    return this._height;
  }

  get domain(): DepthDomain {
    return { ...this._domain };
  }

  get plot(): PlotBounds {
    const left = Math.min(DEFAULT_LAYOUT.paddingLeft, this._width - 1);
    const right = Math.max(left + 1, this._width - DEFAULT_LAYOUT.paddingRight);
    const top = Math.min(DEFAULT_LAYOUT.paddingTop, this._height - 1);
    const bottom = Math.max(top + 1, this._height - DEFAULT_LAYOUT.paddingBottom);
    return {
      left,
      right,
      top,
      bottom,
      width: right - left,
      height: bottom - top,
    };
  }

  priceToX(price: number): number {
    const plot = this.plot;
    const span = this._domain.maxPrice - this._domain.minPrice || 1;
    return plot.left + ((price - this._domain.minPrice) / span) * plot.width;
  }

  xToPrice(x: number): number {
    const plot = this.plot;
    const span = this._domain.maxPrice - this._domain.minPrice || 1;
    return this._domain.minPrice + ((x - plot.left) / plot.width) * span;
  }

  volumeToY(volume: number): number {
    const plot = this.plot;
    const span = this._effectiveMaxVolume || 1;
    return plot.bottom - (Math.max(0, volume) / span) * plot.height;
  }

  containsPoint(x: number, y: number): boolean {
    const plot = this.plot;
    return x >= plot.left && x <= plot.right && y >= plot.top && y <= plot.bottom;
  }
}
