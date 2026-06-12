import { DepthBuffer } from './DepthBuffer';
import { ValidationError } from './validation';
import type { DepthSnapshot } from '../types';

const snapshot: DepthSnapshot = {
  bids: [
    { price: 99, volume: 2 },
    { price: 100, volume: 1 },
    { price: 99, volume: 3 },
    { price: 98, volume: 4 },
  ],
  asks: [
    { price: 101, volume: 2 },
    { price: 103, volume: 3 },
    { price: 102, volume: 1 },
    { price: 102, volume: 2 },
  ],
};

describe('DepthBuffer', () => {
  it('merges duplicate prices and computes bid cumulative depth from best bid outward', () => {
    const buffer = new DepthBuffer();

    buffer.setSnapshot(snapshot);
    const view = buffer.getView();

    expect(Array.from(view.bids.price)).toEqual([98, 99, 100]);
    expect(Array.from(view.bids.volume)).toEqual([4, 5, 1]);
    expect(Array.from(view.bids.cumulativeVolume)).toEqual([10, 6, 1]);
  });

  it('merges duplicate prices and computes ask cumulative depth from best ask outward', () => {
    const buffer = new DepthBuffer();

    buffer.setSnapshot(snapshot);
    const view = buffer.getView();

    expect(Array.from(view.asks.price)).toEqual([101, 102, 103]);
    expect(Array.from(view.asks.volume)).toEqual([2, 3, 3]);
    expect(Array.from(view.asks.cumulativeVolume)).toEqual([2, 5, 8]);
  });

  it('calculates price domain, cumulative range, midpoint, and spread', () => {
    const buffer = new DepthBuffer();

    buffer.setSnapshot(snapshot);

    expect(buffer.domain()).toEqual({ min: 98, max: 103 });
    expect(buffer.range()).toEqual({ min: 0, max: 10 });
    expect(buffer.midPrice()).toBe(100.5);
    expect(buffer.spread()).toBe(1);
  });

  it('uses explicit midPrice when provided', () => {
    const buffer = new DepthBuffer();

    buffer.setSnapshot({ ...snapshot, midPrice: 100.75 });

    expect(buffer.midPrice()).toBe(100.75);
  });

  it('rejects non-finite prices and negative volumes without mutating current data', () => {
    const buffer = new DepthBuffer();
    buffer.setSnapshot(snapshot);

    expect(() =>
      buffer.setSnapshot({
        bids: [{ price: Number.NaN, volume: 1 }],
        asks: [{ price: 101, volume: -1 }],
      }),
    ).toThrow(ValidationError);

    expect(buffer.domain()).toEqual({ min: 98, max: 103 });
  });

  it('finds the nearest level by price across both sides', () => {
    const buffer = new DepthBuffer();
    buffer.setSnapshot(snapshot);

    expect(buffer.nearestByPrice(99.2)).toMatchObject({
      side: 'bid',
      price: 99,
      volume: 5,
      cumulativeVolume: 6,
      index: 1,
    });
    expect(buffer.nearestByPrice(101.7)).toMatchObject({
      side: 'ask',
      price: 102,
      volume: 3,
      cumulativeVolume: 5,
      index: 1,
    });
  });

  it('limits each side to the best N merged levels before computing cumulative volume', () => {
    const buffer = new DepthBuffer();

    buffer.setSnapshot(snapshot, { maxLevels: 2 });
    const view = buffer.getView();

    expect(Array.from(view.bids.price)).toEqual([99, 100]);
    expect(Array.from(view.bids.volume)).toEqual([5, 1]);
    expect(Array.from(view.bids.cumulativeVolume)).toEqual([6, 1]);
    expect(Array.from(view.asks.price)).toEqual([101, 102]);
    expect(Array.from(view.asks.volume)).toEqual([2, 3]);
    expect(Array.from(view.asks.cumulativeVolume)).toEqual([2, 5]);
  });

  it('removes zero-volume merged levels from the render view', () => {
    const buffer = new DepthBuffer();

    buffer.setSnapshot({
      bids: [
        { price: 99, volume: 0 },
        { price: 100, volume: 1.5 },
      ],
      asks: [
        { price: 101, volume: 0 },
        { price: 102, volume: 2.5 },
      ],
    });
    const view = buffer.getView();

    expect(Array.from(view.bids.price)).toEqual([100]);
    expect(Array.from(view.bids.volume)).toEqual([1.5]);
    expect(Array.from(view.asks.price)).toEqual([102]);
    expect(Array.from(view.asks.volume)).toEqual([2.5]);
    expect(buffer.metrics()).toMatchObject({
      bidLevels: 1,
      askLevels: 1,
      bidTotal: 1.5,
      askTotal: 2.5,
    });
  });

  it('uses null implicit midPrice when one side of the book is missing', () => {
    const buffer = new DepthBuffer();

    buffer.setSnapshot({
      bids: [{ price: 100, volume: 1 }],
      asks: [],
    });

    expect(buffer.getView()).toMatchObject({
      bestBid: 100,
      bestAsk: null,
      midPrice: null,
      spread: null,
    });
    expect(buffer.metrics().spreadBps).toBeNull();
  });

  it('uses explicit midPrice even when one side of the book is missing', () => {
    const buffer = new DepthBuffer();

    buffer.setSnapshot({
      bids: [{ price: 100, volume: 1 }],
      asks: [],
      midPrice: 100.25,
    });

    expect(buffer.getView().midPrice).toBe(100.25);
  });

  it('centers the render price domain around midPrice by default', () => {
    const buffer = new DepthBuffer();

    buffer.setSnapshot({
      bids: [
        { price: 99, volume: 1 },
        { price: 100, volume: 1 },
      ],
      asks: [
        { price: 101, volume: 1 },
        { price: 110, volume: 1 },
      ],
    });

    expect(buffer.renderDomain()).toMatchObject({
      minPrice: 91,
      maxPrice: 110,
    });
  });

  it('can render with a fit price domain when requested', () => {
    const buffer = new DepthBuffer();

    buffer.setSnapshot({
      bids: [
        { price: 99, volume: 1 },
        { price: 100, volume: 1 },
      ],
      asks: [
        { price: 101, volume: 1 },
        { price: 110, volume: 1 },
      ],
    });

    expect(buffer.renderDomain({ priceDomainMode: 'fit' })).toMatchObject({
      minPrice: 99,
      maxPrice: 110,
    });
  });

  it('reports production-ready aggregate metrics for host UIs', () => {
    const buffer = new DepthBuffer();

    buffer.setSnapshot(snapshot);

    expect(buffer.metrics()).toEqual({
      bestBid: 100,
      bestAsk: 101,
      midPrice: 100.5,
      spread: 1,
      spreadBps: expect.closeTo(99.5024875622, 8),
      bidTotal: 10,
      askTotal: 8,
      totalVolume: 18,
      imbalance: expect.closeTo(0.1111111111, 8),
      bidLevels: 3,
      askLevels: 3,
    });
  });

  it('returns neutral metrics for an empty snapshot', () => {
    const buffer = new DepthBuffer();

    buffer.setSnapshot({ bids: [], asks: [] });

    expect(buffer.metrics()).toEqual({
      bestBid: null,
      bestAsk: null,
      midPrice: null,
      spread: null,
      spreadBps: null,
      bidTotal: 0,
      askTotal: 0,
      totalVolume: 0,
      imbalance: 0,
      bidLevels: 0,
      askLevels: 0,
    });
  });
});
