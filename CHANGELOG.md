# Changelog

## v0.1.0 - 2026-06-12

Initial public release of `@rekurt/depth`.

### Added

- Framework-agnostic `DepthChart` canvas renderer.
- `DepthBuffer` order-book normalization with duplicate-price merging and
  zero-volume filtering.
- `DepthViewport` autoscaling with centered and fit price-domain modes.
- Correct best-level selection and cumulative depth direction for bids/asks.
- Spread, midpoint, bps, total-depth, and imbalance metrics.
- Dark and light themes tuned for institutional trading UIs.
- Neutral spread band, restrained hover tooltip, and subtle solid area fills.
- Vanilla Vite example with chart, order-book ladder, controls, and responsive
  desktop/mobile layouts.
- ESM/CJS builds with TypeScript declarations.

### Verified

- `npm test`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run build:example`
- `npm pack --dry-run`
