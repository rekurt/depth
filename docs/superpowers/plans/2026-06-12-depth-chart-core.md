# Depth Chart Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone `@rekurt/depth` package for canvas order-book depth charts.

**Architecture:** A `DepthChart` facade owns lifecycle and event wiring, while pure data helpers normalize snapshots into typed arrays and renderers draw two canvas layers. The package mirrors `@rekurt/ohlcv-core` patterns but keeps the initial scope small: depth areas, axes, hover, themes, and vanilla demo.

**Tech Stack:** TypeScript, Canvas 2D, TypedArray buffers, Vitest/jsdom, tsup, Vite.

---

### Task 1: Package Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsup.config.ts`
- Create: `vitest.config.ts`
- Create: `eslint.config.js`
- Create: `src/test-utils/canvasStub.ts`

- [ ] Add package scripts matching `ohlcv-front`: `build`, `dev`, `test`, `typecheck`, `lint`.
- [ ] Configure `tsup` for ESM/CJS + declarations from `src/index.ts`.
- [ ] Configure Vitest in `jsdom`.

### Task 2: Data Model

**Files:**
- Create: `src/types.ts`
- Create: `src/data/DepthBuffer.test.ts`
- Create: `src/data/DepthBuffer.ts`
- Create: `src/data/validation.ts`

- [ ] Write failing tests for invalid levels, duplicate price merge, sorted sides, and cumulative volumes.
- [ ] Implement `DepthBuffer.setSnapshot`, `getView`, `domain`, `range`, and `nearestByPrice`.
- [ ] Re-run targeted tests until green.

### Task 3: Rendering Core

**Files:**
- Create: `src/constants.ts`
- Create: `src/utils.ts`
- Create: `src/rendering/DepthRenderer.ts`
- Create: `src/interaction/DepthViewport.test.ts`
- Create: `src/interaction/DepthViewport.ts`

- [ ] Write failing tests for price-to-x, cumulative-to-y, hover bounds, and autoscale padding.
- [ ] Implement layout, theme resolution, Hi-DPI canvas helpers, viewport transforms, and area path generation.
- [ ] Re-run targeted tests until green.

### Task 4: Public Facade

**Files:**
- Create: `src/DepthChart.test.ts`
- Create: `src/DepthChart.ts`
- Create: `src/index.ts`

- [ ] Write failing tests for construction, data update, theme update, hover callback clearing, and idempotent destroy.
- [ ] Implement the facade, two canvas layers, resize observer support, render scheduling, and pointer handling.
- [ ] Re-run targeted tests until green.

### Task 5: Example And Docs

**Files:**
- Create: `examples/core/package.json`
- Create: `examples/core/index.html`
- Create: `examples/core/src/main.ts`
- Create: `examples/core/src/styles.css`
- Create: `README.md`

- [ ] Add deterministic mock order-book data and controls for symbol, theme, and spread shift.
- [ ] Document installation, minimal usage, data contract, methods, and verification commands.
- [ ] Run `npm run typecheck`, `npm test`, `npm run build`.
