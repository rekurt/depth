import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_LAYOUT } from './constants';
import { DepthChart } from './DepthChart';
import { DepthRenderer } from './rendering/DepthRenderer';
import { installCanvasStub } from './test-utils/canvasStub';
import type { DepthSnapshot } from './types';
import { DepthBuffer } from './data/DepthBuffer';
import { DepthViewport } from './interaction/DepthViewport';

const snapshot: DepthSnapshot = {
  bids: [
    { price: 99, volume: 2 },
    { price: 100, volume: 1 },
  ],
  asks: [
    { price: 101, volume: 2 },
    { price: 102, volume: 1 },
  ],
};

describe('DepthChart', () => {
  beforeEach(() => {
    installCanvasStub();
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect() {}
      },
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('mounts two canvas layers and renders initial data', () => {
    const container = document.createElement('div');
    Object.defineProperty(container, 'clientWidth', { value: 640 });
    Object.defineProperty(container, 'clientHeight', { value: 320 });

    const chart = new DepthChart({ container, data: snapshot, theme: 'dark' });

    expect(container.querySelectorAll('canvas')).toHaveLength(2);
    expect(chart.getSnapshot()?.bids).toHaveLength(2);

    chart.destroy();
  });

  it('updates data and theme without rebuilding the DOM', () => {
    const container = document.createElement('div');
    const chart = new DepthChart({ container, data: snapshot });

    chart.setData({
      bids: [{ price: 98, volume: 5 }],
      asks: [{ price: 103, volume: 7 }],
    });
    chart.setTheme('light');

    expect(container.querySelectorAll('canvas')).toHaveLength(2);
    expect(chart.getSnapshot()?.bids[0]).toEqual({ price: 98, volume: 5 });

    chart.destroy();
  });

  it('updates render/data options without reconstructing the chart', () => {
    const container = document.createElement('div');
    const chart = new DepthChart({ container, data: snapshot, maxLevels: 1 });

    expect(chart.getView().bids.length).toBe(1);
    expect(chart.getMetrics()).toMatchObject({
      bidLevels: 1,
      askLevels: 1,
      bestBid: 100,
      bestAsk: 101,
    });

    chart.updateOptions({ maxLevels: 2, shape: 'linear', showSpread: false });

    expect(container.querySelectorAll('canvas')).toHaveLength(2);
    expect(chart.getView().bids.length).toBe(2);
    expect(chart.getMetrics()).toMatchObject({
      bidLevels: 2,
      askLevels: 2,
    });

    chart.destroy();
  });

  it('uses a centered price domain by default and can switch to fit mode', () => {
    const container = document.createElement('div');
    Object.defineProperty(container, 'clientWidth', { value: 640 });
    Object.defineProperty(container, 'clientHeight', { value: 320 });
    const onHover = vi.fn();
    const chart = new DepthChart({
      container,
      data: {
        bids: [
          { price: 99, volume: 1 },
          { price: 100, volume: 1 },
        ],
        asks: [
          { price: 101, volume: 1 },
          { price: 110, volume: 1 },
        ],
      },
      onHover,
    });
    const canvas = container.querySelectorAll('canvas')[1]!;
    const plotCenterX =
      DEFAULT_LAYOUT.paddingLeft +
      (640 - DEFAULT_LAYOUT.paddingLeft - DEFAULT_LAYOUT.paddingRight) / 2;

    canvas.dispatchEvent(
      new PointerEvent('pointermove', {
        clientX: plotCenterX,
        clientY: 160,
        bubbles: true,
      }),
    );

    expect(onHover.mock.calls.at(-1)?.[0]).toMatchObject({
      side: 'bid',
      price: 100,
    });

    chart.updateOptions({ priceDomainMode: 'fit' });
    canvas.dispatchEvent(
      new PointerEvent('pointermove', {
        clientX: plotCenterX,
        clientY: 160,
        bubbles: true,
      }),
    );

    expect(onHover.mock.calls.at(-1)?.[0]).toMatchObject({
      side: 'ask',
      price: 101,
    });

    chart.destroy();
  });

  it('renders depth area fills without canvas gradients', async () => {
    const createLinearGradient = vi.fn(
      () =>
        ({
          addColorStop() {},
        }) as CanvasGradient,
    );
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    installCanvasStub({ createLinearGradient });
    const container = document.createElement('div');
    Object.defineProperty(container, 'clientWidth', { value: 640 });
    Object.defineProperty(container, 'clientHeight', { value: 320 });

    const chart = new DepthChart({ container, data: snapshot });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(createLinearGradient).not.toHaveBeenCalled();

    chart.destroy();
  });

  it('places bid and ask total labels near the vertical center of the plot', () => {
    const fillTextCalls: Array<{ text: string; x: number; y: number }> = [];
    const context = {
      beginPath() {},
      moveTo() {},
      lineTo() {},
      closePath() {},
      arc() {},
      quadraticCurveTo() {},
      fill() {},
      stroke() {},
      clearRect() {},
      fillRect() {},
      save() {},
      restore() {},
      setLineDash() {},
      fillText(text: string, x: number, y: number) {
        fillTextCalls.push({ text, x, y });
      },
      measureText: (text: string) => ({ width: text.length * 7 }),
      set fillStyle(_value: string) {},
      set strokeStyle(_value: string) {},
      set lineWidth(_value: number) {},
      set globalAlpha(_value: number) {},
      set font(_value: string) {},
      set textAlign(_value: CanvasTextAlign) {},
      set textBaseline(_value: CanvasTextBaseline) {},
    } as unknown as CanvasRenderingContext2D;
    const buffer = new DepthBuffer();
    buffer.setSnapshot(snapshot);
    const viewport = new DepthViewport({ width: 640, height: 320 });
    viewport.setDomain(buffer.renderDomain());

    new DepthRenderer().render(context, buffer.getView(), viewport, {
      background: '#000000',
      grid: '#111111',
      axis: '#222222',
      text: '#ffffff',
      mutedText: '#999999',
      bidLine: '#00ff00',
      bidFill: 'rgba(0, 255, 0, 0.1)',
      askLine: '#ff0000',
      askFill: 'rgba(255, 0, 0, 0.1)',
      midLine: '#888888',
      crosshair: '#aaaaaa',
    }, {
      shape: 'step',
      showLabels: true,
    });

    const plotCenterY = viewport.plot.top + viewport.plot.height / 2;
    const bidLabel = fillTextCalls.find((call) => call.text.startsWith('BID '));
    const askLabel = fillTextCalls.find((call) => call.text.startsWith('ASK '));

    expect(bidLabel?.y).toBeCloseTo(plotCenterY, 0);
    expect(askLabel?.y).toBeCloseTo(plotCenterY, 0);
  });

  it('keeps hover null for empty snapshots', () => {
    const container = document.createElement('div');
    Object.defineProperty(container, 'clientWidth', { value: 640 });
    Object.defineProperty(container, 'clientHeight', { value: 320 });
    const onHover = vi.fn();
    const chart = new DepthChart({
      container,
      data: { bids: [], asks: [] },
      onHover,
    });

    const canvas = container.querySelectorAll('canvas')[1]!;
    canvas.dispatchEvent(
      new PointerEvent('pointermove', {
        clientX: 320,
        clientY: 160,
        bubbles: true,
      }),
    );

    expect(onHover).toHaveBeenCalledWith(null);
    expect(chart.getMetrics()).toMatchObject({
      bidLevels: 0,
      askLevels: 0,
      totalVolume: 0,
    });

    chart.destroy();
  });

  it('emits hover info inside the plot and null when the pointer leaves', () => {
    const container = document.createElement('div');
    Object.defineProperty(container, 'clientWidth', { value: 640 });
    Object.defineProperty(container, 'clientHeight', { value: 320 });
    const onHover = vi.fn();
    const chart = new DepthChart({ container, data: snapshot, onHover });

    const canvas = container.querySelectorAll('canvas')[1]!;
    canvas.dispatchEvent(
      new PointerEvent('pointermove', {
        clientX: 320,
        clientY: 160,
        bubbles: true,
      }),
    );
    canvas.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true }));

    expect(onHover.mock.calls[0]?.[0]).toMatchObject({
      side: expect.stringMatching(/bid|ask/),
    });
    expect(onHover.mock.calls.at(-1)?.[0]).toBeNull();

    chart.destroy();
  });

  it('destroys idempotently', () => {
    const container = document.createElement('div');
    const chart = new DepthChart({ container, data: snapshot });

    chart.destroy();
    chart.destroy();

    expect(container.querySelectorAll('canvas')).toHaveLength(0);
  });
});
