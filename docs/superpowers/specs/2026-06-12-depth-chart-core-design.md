# Depth Chart Core Design

## Goal

Build a framework-agnostic TypeScript canvas library for order-book depth charts, in the same spirit as `@rekurt/ohlcv-core`: no Highcharts runtime dependency, typed public API, deterministic data processing, tests, and a small vanilla example.

## Package Shape

The package is a standalone npm library named `@rekurt/depth`.

- `src/index.ts` exports the public facade and types.
- `src/DepthChart.ts` owns lifecycle, DOM mounting, data updates, resize handling, hover callbacks, and public methods.
- `src/data/*` validates and normalizes raw order-book levels into typed-array views.
- `src/rendering/*` draws chart layers on Hi-DPI canvas.
- `src/interaction/*` maps pointer coordinates to the nearest depth level.
- `examples/core` is a Vite vanilla demo.

The current `depth` directory is not a git repository, so this spec cannot be committed here.

## Data Contract

Callers pass snapshots:

```ts
interface DepthSnapshot {
  bids: DepthLevel[];
  asks: DepthLevel[];
  midPrice?: number;
  timestamp?: number;
  sequence?: number | string;
}

interface DepthLevel {
  price: number;
  volume: number;
}
```

Validation requires finite positive prices and finite non-negative volumes. Duplicate prices are merged. Bids are rendered left of the spread, asks right of the spread. Cumulative bid depth is computed from best bid outward and then displayed in ascending price order; cumulative ask depth is computed from best ask outward in ascending price order.

## Rendering

The chart uses two stacked canvases:

- a main chart canvas for grid, axes, bid/ask depth areas, and labels;
- an interaction canvas for crosshair and hover markers.

Defaults use a trading UI palette with green bids, red asks, neutral grid/text, and dark/light/auto theme support. Rendering uses step areas by default because order-book levels are discrete, but the option can switch to linear joins.

## Interaction

Pointer move emits `DepthHoverInfo | null`:

```ts
interface DepthHoverInfo {
  side: 'bid' | 'ask';
  price: number;
  volume: number;
  cumulativeVolume: number;
  index: number;
  x: number;
  y: number;
}
```

The nearest level is selected by x-distance within the chart plotting area. Leaving the chart clears hover.

## Public API

```ts
const chart = new DepthChart({
  container,
  data,
  theme: 'auto',
  priceFormat,
  volumeFormat,
  onHover,
  onError,
});

chart.setData(nextSnapshot);
chart.setTheme('dark');
chart.fitAll();
chart.resize(width, height);
chart.destroy();
```

Errors are routed through `onError` when provided; otherwise constructor/data validation throws synchronously so invalid feeds do not silently render corrupt charts.

## Testing

Vitest covers:

- validation and duplicate-price merge;
- bid/ask cumulative depth direction;
- domain/range calculation;
- hover hit testing;
- facade lifecycle with jsdom canvas stubs.

Build verification is `npm run typecheck`, `npm test`, and `npm run build`.
