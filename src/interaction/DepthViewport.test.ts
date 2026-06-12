import { DEFAULT_LAYOUT } from '../constants';
import type { DepthDomain } from '../types';
import { DepthViewport } from './DepthViewport';

const domain: DepthDomain = {
  minPrice: 98,
  maxPrice: 103,
  minVolume: 0,
  maxVolume: 10,
};

describe('DepthViewport', () => {
  it('maps prices and cumulative volume into the plot area', () => {
    const viewport = new DepthViewport({ width: 600, height: 300 });
    viewport.setDomain(domain);

    const left = DEFAULT_LAYOUT.paddingLeft;
    const right = 600 - DEFAULT_LAYOUT.paddingRight;
    const bottom = 300 - DEFAULT_LAYOUT.paddingBottom;

    expect(viewport.priceToX(98)).toBeCloseTo(left);
    expect(viewport.priceToX(103)).toBeCloseTo(right);
    expect(viewport.volumeToY(0)).toBeCloseTo(bottom);
    expect(viewport.volumeToY(10)).toBeGreaterThan(DEFAULT_LAYOUT.paddingTop);
  });

  it('adds y-axis padding so max cumulative depth does not touch the top edge', () => {
    const viewport = new DepthViewport({ width: 600, height: 300 });
    viewport.setDomain(domain);

    expect(viewport.volumeToY(10)).toBeGreaterThan(DEFAULT_LAYOUT.paddingTop);
  });

  it('converts x coordinates back to price and reports plot bounds', () => {
    const viewport = new DepthViewport({ width: 600, height: 300 });
    viewport.setDomain(domain);

    expect(viewport.xToPrice(DEFAULT_LAYOUT.paddingLeft)).toBeCloseTo(98);
    expect(viewport.xToPrice(600 - DEFAULT_LAYOUT.paddingRight)).toBeCloseTo(103);
    expect(viewport.containsPoint(10, 10)).toBe(false);
    expect(viewport.containsPoint(300, 150)).toBe(true);
  });

  it('handles collapsed domains with stable finite transforms', () => {
    const viewport = new DepthViewport({ width: 100, height: 80 });
    viewport.setDomain({
      minPrice: 10,
      maxPrice: 10,
      minVolume: 0,
      maxVolume: 0,
    });

    expect(Number.isFinite(viewport.priceToX(10))).toBe(true);
    expect(Number.isFinite(viewport.volumeToY(0))).toBe(true);
    expect(Number.isFinite(viewport.xToPrice(50))).toBe(true);
  });
});
