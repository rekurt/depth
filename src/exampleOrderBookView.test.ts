import { describe, expect, it } from 'vitest';
import type { DepthSideView } from './types';
import { buildCenteredLadder } from '../examples/core/src/orderBookView';

function sideView(
  side: 'bid' | 'ask',
  prices: number[],
  volumes: number[],
  totals: number[],
): DepthSideView {
  return {
    side,
    price: new Float64Array(prices),
    volume: new Float64Array(volumes),
    cumulativeVolume: new Float64Array(totals),
    length: prices.length,
  };
}

describe('example order book view', () => {
  it('places the best ask and best bid next to the central spread row', () => {
    const ladder = buildCenteredLadder({
      asks: sideView('ask', [101, 102, 103, 104], [1, 2, 3, 4], [1, 3, 6, 10]),
      bids: sideView('bid', [97, 98, 99, 100], [4, 3, 2, 1], [10, 6, 3, 1]),
      visibleRowsPerSide: 3,
    });

    expect(ladder.asks.map((row) => row.price)).toEqual([103, 102, 101]);
    expect(ladder.bids.map((row) => row.price)).toEqual([100, 99, 98]);
  });
});
