import type {
  DepthDomain,
  DepthBufferOptions,
  DepthLevel,
  DepthMetrics,
  DepthPointInfo,
  DepthRenderDomainOptions,
  DepthSide,
  DepthSideView,
  DepthSnapshot,
  DepthView,
  PriceDomain,
  VolumeRange,
} from '../types';
import { validateLevels, ValidationError } from './validation';

interface BuiltSide {
  price: Float64Array;
  volume: Float64Array;
  cumulativeVolume: Float64Array;
}

function emptySide(side: DepthSide): DepthSideView {
  return {
    side,
    price: new Float64Array(0),
    volume: new Float64Array(0),
    cumulativeVolume: new Float64Array(0),
    length: 0,
  };
}

function cloneLevels(levels: readonly DepthLevel[]): DepthLevel[] {
  return levels.map((level) => ({ price: level.price, volume: level.volume }));
}

function normalizeMaxLevels(maxLevels: number | undefined): number | null {
  if (maxLevels === undefined) return null;
  if (!Number.isFinite(maxLevels) || maxLevels <= 0) {
    throw new ValidationError('[depth] maxLevels must be a finite positive number');
  }
  return Math.floor(maxLevels);
}

function buildSide(
  levels: readonly DepthLevel[],
  side: DepthSide,
  options: DepthBufferOptions = {},
): BuiltSide {
  validateLevels(levels, side);
  if (levels.length === 0) {
    return {
      price: new Float64Array(0),
      volume: new Float64Array(0),
      cumulativeVolume: new Float64Array(0),
    };
  }

  const merged = new Map<number, number>();
  for (const level of levels) {
    merged.set(level.price, (merged.get(level.price) ?? 0) + level.volume);
  }

  const sortedForCumulative = Array.from(merged.entries())
    .filter(([, volume]) => volume > 0)
    .sort(([a], [b]) => (side === 'bid' ? b - a : a - b));
  const maxLevels = normalizeMaxLevels(options.maxLevels);
  const selectedForCumulative =
    maxLevels === null ? sortedForCumulative : sortedForCumulative.slice(0, maxLevels);

  const cumulativeByPrice = new Map<number, number>();
  let cumulative = 0;
  for (const [price, volume] of selectedForCumulative) {
    cumulative += volume;
    cumulativeByPrice.set(price, cumulative);
  }

  const ascending = selectedForCumulative.slice().sort(([a], [b]) => a - b);
  const price = new Float64Array(ascending.length);
  const volume = new Float64Array(ascending.length);
  const cumulativeVolume = new Float64Array(ascending.length);
  for (let i = 0; i < ascending.length; i++) {
    const [p, v] = ascending[i]!;
    price[i] = p;
    volume[i] = v;
    cumulativeVolume[i] = cumulativeByPrice.get(p) ?? 0;
  }
  return { price, volume, cumulativeVolume };
}

function viewSide(side: DepthSide, built: BuiltSide): DepthSideView {
  return {
    side,
    price: built.price,
    volume: built.volume,
    cumulativeVolume: built.cumulativeVolume,
    length: built.price.length,
  };
}

function bestBid(side: DepthSideView): number | null {
  return side.length === 0 ? null : side.price[side.length - 1]!;
}

function bestAsk(side: DepthSideView): number | null {
  return side.length === 0 ? null : side.price[0]!;
}

function explicitMidPrice(snapshot: DepthSnapshot): number | null {
  if (snapshot.midPrice === undefined) return null;
  if (!Number.isFinite(snapshot.midPrice) || snapshot.midPrice <= 0) {
    throw new ValidationError('[depth] midPrice must be a finite positive number');
  }
  return snapshot.midPrice;
}

export class DepthBuffer {
  private _bids: DepthSideView = emptySide('bid');
  private _asks: DepthSideView = emptySide('ask');
  private _snapshot: DepthSnapshot | null = null;
  private _explicitMidPrice: number | null = null;
  private _version = 0;

  get version(): number {
    return this._version;
  }

  setSnapshot(snapshot: DepthSnapshot, options: DepthBufferOptions = {}): void {
    const bidSide = buildSide(snapshot.bids, 'bid', options);
    const askSide = buildSide(snapshot.asks, 'ask', options);
    const nextExplicitMidPrice = explicitMidPrice(snapshot);
    const nextSnapshot: DepthSnapshot = {
      bids: cloneLevels(snapshot.bids),
      asks: cloneLevels(snapshot.asks),
    };
    if (snapshot.midPrice !== undefined) nextSnapshot.midPrice = snapshot.midPrice;
    if (snapshot.timestamp !== undefined) nextSnapshot.timestamp = snapshot.timestamp;
    if (snapshot.sequence !== undefined) nextSnapshot.sequence = snapshot.sequence;

    this._bids = viewSide('bid', bidSide);
    this._asks = viewSide('ask', askSide);
    this._snapshot = nextSnapshot;
    this._explicitMidPrice = nextExplicitMidPrice;
    this._version++;
  }

  getSnapshot(): DepthSnapshot | null {
    if (!this._snapshot) return null;
    const snapshot: DepthSnapshot = {
      bids: cloneLevels(this._snapshot.bids),
      asks: cloneLevels(this._snapshot.asks),
    };
    if (this._snapshot.midPrice !== undefined) snapshot.midPrice = this._snapshot.midPrice;
    if (this._snapshot.timestamp !== undefined) snapshot.timestamp = this._snapshot.timestamp;
    if (this._snapshot.sequence !== undefined) snapshot.sequence = this._snapshot.sequence;
    return snapshot;
  }

  getView(): DepthView {
    const bid = bestBid(this._bids);
    const ask = bestAsk(this._asks);
    const explicitMid = this._explicitMidPrice;
    const mid = explicitMid ?? (bid !== null && ask !== null ? (bid + ask) / 2 : null);
    const spread = bid !== null && ask !== null ? ask - bid : null;
    const view: DepthView = {
      bids: this._bids,
      asks: this._asks,
      bestBid: bid,
      bestAsk: ask,
      midPrice: mid,
      spread,
    };
    if (this._snapshot?.timestamp !== undefined) view.timestamp = this._snapshot.timestamp;
    if (this._snapshot?.sequence !== undefined) view.sequence = this._snapshot.sequence;
    return view;
  }

  domain(): PriceDomain {
    let min = Infinity;
    let max = -Infinity;
    for (const side of [this._bids, this._asks]) {
      if (side.length === 0) continue;
      min = Math.min(min, side.price[0]!);
      max = Math.max(max, side.price[side.length - 1]!);
    }
    if (min === Infinity || max === -Infinity) return { min: 0, max: 1 };
    if (min === max) return { min: min - 0.5, max: max + 0.5 };
    return { min, max };
  }

  centeredDomain(): PriceDomain {
    const fit = this.domain();
    const view = this.getView();
    if (view.bestBid === null || view.bestAsk === null || view.midPrice === null) return fit;

    const distance = Math.max(
      Math.abs(view.midPrice - fit.min),
      Math.abs(fit.max - view.midPrice),
    );
    if (distance === 0) return fit;
    return {
      min: view.midPrice - distance,
      max: view.midPrice + distance,
    };
  }

  range(): VolumeRange {
    let max = 0;
    for (const side of [this._bids, this._asks]) {
      for (let i = 0; i < side.length; i++) max = Math.max(max, side.cumulativeVolume[i]!);
    }
    return { min: 0, max };
  }

  renderDomain(options: DepthRenderDomainOptions = {}): DepthDomain {
    const prices =
      (options.priceDomainMode ?? 'centered') === 'fit' ? this.domain() : this.centeredDomain();
    const volumes = this.range();
    return {
      minPrice: prices.min,
      maxPrice: prices.max,
      minVolume: volumes.min,
      maxVolume: volumes.max,
    };
  }

  midPrice(): number | null {
    return this.getView().midPrice;
  }

  spread(): number | null {
    return this.getView().spread;
  }

  metrics(): DepthMetrics {
    const view = this.getView();
    const bidTotal =
      view.bids.length === 0 ? 0 : view.bids.cumulativeVolume[0]!;
    const askTotal =
      view.asks.length === 0 ? 0 : view.asks.cumulativeVolume[view.asks.length - 1]!;
    const totalVolume = bidTotal + askTotal;
    const imbalance = totalVolume === 0 ? 0 : (bidTotal - askTotal) / totalVolume;
    const spreadBps =
      view.spread !== null && view.midPrice !== null && view.midPrice > 0
        ? (view.spread / view.midPrice) * 10_000
        : null;
    return {
      bestBid: view.bestBid,
      bestAsk: view.bestAsk,
      midPrice: view.midPrice,
      spread: view.spread,
      spreadBps,
      bidTotal,
      askTotal,
      totalVolume,
      imbalance,
      bidLevels: view.bids.length,
      askLevels: view.asks.length,
    };
  }

  nearestByPrice(price: number): DepthPointInfo | null {
    if (!Number.isFinite(price)) return null;
    let nearest: DepthPointInfo | null = null;
    let nearestDistance = Infinity;
    for (const side of [this._bids, this._asks]) {
      for (let i = 0; i < side.length; i++) {
        const distance = Math.abs(side.price[i]! - price);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearest = {
            side: side.side,
            price: side.price[i]!,
            volume: side.volume[i]!,
            cumulativeVolume: side.cumulativeVolume[i]!,
            index: i,
          };
        }
      }
    }
    return nearest;
  }
}
