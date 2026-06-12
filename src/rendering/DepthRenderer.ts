import type {
  DepthShape,
  DepthThemeColors,
  DepthView,
  DepthSide,
  DepthSideView,
  DepthPointInfo,
} from '../types';
import { formatPrice, formatVolume, niceGridValues } from '../utils';
import type { DepthViewport } from '../interaction/DepthViewport';

export interface DepthRendererOptions {
  shape: DepthShape;
  showGrid?: boolean | undefined;
  showSpread?: boolean | undefined;
  showMidLine?: boolean | undefined;
  showLabels?: boolean | undefined;
  emptyMessage?: string | undefined;
  priceFormat?: ((price: number) => string) | undefined;
  volumeFormat?: ((volume: number) => string) | undefined;
}

function sideLineColor(theme: DepthThemeColors, side: DepthSide): string {
  return side === 'bid' ? theme.bidLine : theme.askLine;
}

function sideFillColor(theme: DepthThemeColors, side: DepthSide): string {
  return side === 'bid' ? theme.bidFill : theme.askFill;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export class DepthRenderer {
  render(
    ctx: CanvasRenderingContext2D,
    view: DepthView,
    viewport: DepthViewport,
    theme: DepthThemeColors,
    options: DepthRendererOptions,
  ): void {
    ctx.clearRect(0, 0, viewport.width, viewport.height);
    ctx.fillStyle = theme.background;
    ctx.fillRect(0, 0, viewport.width, viewport.height);
    if (view.bids.length === 0 && view.asks.length === 0) {
      this.renderEmptyState(ctx, viewport, theme, options.emptyMessage);
      this.renderAxes(ctx, viewport, theme);
      return;
    }
    if (options.showGrid !== false) this.renderGrid(ctx, viewport, theme, options);
    if (options.showSpread !== false) this.renderSpread(ctx, view, viewport, theme);
    this.renderSide(ctx, view.bids, viewport, theme, options.shape);
    this.renderSide(ctx, view.asks, viewport, theme, options.shape);
    if (options.showLabels !== false) this.renderSideLabels(ctx, view, viewport, theme, options);
    if (options.showMidLine !== false) this.renderMidLine(ctx, view, viewport, theme);
    this.renderAxes(ctx, viewport, theme);
  }

  renderCrosshair(
    ctx: CanvasRenderingContext2D,
    hover: DepthPointInfo | null,
    viewport: DepthViewport,
    theme: DepthThemeColors,
    options: DepthRendererOptions,
  ): void {
    ctx.clearRect(0, 0, viewport.width, viewport.height);
    if (!hover) return;
    const x = viewport.priceToX(hover.price);
    const y = viewport.volumeToY(hover.cumulativeVolume);
    const plot = viewport.plot;
    ctx.save();
    ctx.strokeStyle = theme.crosshair;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(x, plot.top);
    ctx.lineTo(x, plot.bottom);
    ctx.moveTo(plot.left, y);
    ctx.lineTo(plot.right, y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = sideLineColor(theme, hover.side);
    ctx.beginPath();
    ctx.arc(x, y, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
    const price = (options.priceFormat ?? formatPrice)(hover.price);
    const volume = (options.volumeFormat ?? formatVolume)(hover.cumulativeVolume);
    const label = `${hover.side.toUpperCase()} ${price}  ${volume}`;
    const labelWidth = ctx.measureText(label).width + 22;
    const boxX = clamp(x + 12, plot.left + 8, plot.right - labelWidth - 8);
    const boxY = clamp(y - 36, plot.top + 8, plot.bottom - 34);
    ctx.fillStyle = theme.background;
    ctx.globalAlpha = 0.96;
    roundedRect(ctx, boxX, boxY, labelWidth, 28, 5);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = sideLineColor(theme, hover.side);
    roundedRect(ctx, boxX + 5, boxY + 6, 3, 16, 1.5);
    ctx.fill();
    ctx.strokeStyle = theme.axis;
    ctx.globalAlpha = 0.65;
    roundedRect(ctx, boxX, boxY, labelWidth, 28, 5);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = theme.text;
    ctx.textBaseline = 'middle';
    ctx.fillText(label, boxX + 14, boxY + 14);
    ctx.restore();
  }

  private renderEmptyState(
    ctx: CanvasRenderingContext2D,
    viewport: DepthViewport,
    theme: DepthThemeColors,
    message = 'No depth data',
  ): void {
    const plot = viewport.plot;
    ctx.save();
    ctx.fillStyle = theme.mutedText;
    ctx.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(message, plot.left + plot.width / 2, plot.top + plot.height / 2);
    ctx.restore();
  }

  private renderGrid(
    ctx: CanvasRenderingContext2D,
    viewport: DepthViewport,
    theme: DepthThemeColors,
    options: DepthRendererOptions,
  ): void {
    const plot = viewport.plot;
    const volumeFormat = options.volumeFormat ?? formatVolume;
    const priceFormat = options.priceFormat ?? formatPrice;
    const yValues = niceGridValues(0, viewport.domain.maxVolume, 4);
    ctx.save();
    ctx.strokeStyle = theme.grid;
    ctx.fillStyle = theme.mutedText;
    ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.lineWidth = 1;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    for (const value of yValues) {
      const y = viewport.volumeToY(value);
      ctx.beginPath();
      ctx.moveTo(plot.left, y);
      ctx.lineTo(plot.right, y);
      ctx.stroke();
      ctx.fillText(volumeFormat(value), plot.right + 10, y);
    }
    const priceValues = niceGridValues(viewport.domain.minPrice, viewport.domain.maxPrice, 5);
    let previousLabelRight = -Infinity;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'center';
    for (const value of priceValues) {
      const x = viewport.priceToX(value);
      ctx.beginPath();
      ctx.moveTo(x, plot.top);
      ctx.lineTo(x, plot.bottom);
      ctx.stroke();
      const label = priceFormat(value);
      const labelWidth = ctx.measureText(label).width;
      const labelX = clamp(x, plot.left + labelWidth / 2, plot.right - labelWidth / 2);
      if (labelX - labelWidth / 2 < previousLabelRight + 8) continue;
      previousLabelRight = labelX + labelWidth / 2;
      ctx.fillText(label, labelX, plot.bottom + 12);
    }
    ctx.restore();
  }

  private renderAxes(
    ctx: CanvasRenderingContext2D,
    viewport: DepthViewport,
    theme: DepthThemeColors,
  ): void {
    const plot = viewport.plot;
    ctx.save();
    ctx.strokeStyle = theme.axis;
    ctx.globalAlpha = 0.75;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(plot.left, plot.top);
    ctx.lineTo(plot.left, plot.bottom);
    ctx.lineTo(plot.right, plot.bottom);
    ctx.lineTo(plot.right, plot.top);
    ctx.stroke();
    ctx.restore();
  }

  private renderSide(
    ctx: CanvasRenderingContext2D,
    side: DepthSideView,
    viewport: DepthViewport,
    theme: DepthThemeColors,
    shape: DepthShape,
  ): void {
    if (side.length === 0) return;
    const plot = viewport.plot;
    ctx.save();
    ctx.beginPath();
    const firstX = viewport.priceToX(side.price[0]!);
    ctx.moveTo(firstX, plot.bottom);
    this.traceSidePath(ctx, side, viewport, shape, 'line');
    const lastX = viewport.priceToX(side.price[side.length - 1]!);
    ctx.lineTo(lastX, plot.bottom);
    ctx.closePath();
    ctx.fillStyle = sideFillColor(theme, side.side);
    ctx.fill();

    ctx.beginPath();
    this.traceSidePath(ctx, side, viewport, shape);
    ctx.strokeStyle = sideLineColor(theme, side.side);
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.restore();
  }

  private traceSidePath(
    ctx: CanvasRenderingContext2D,
    side: DepthSideView,
    viewport: DepthViewport,
    shape: DepthShape,
    startMode: 'move' | 'line' = 'move',
  ): void {
    const firstX = viewport.priceToX(side.price[0]!);
    const firstY = viewport.volumeToY(side.cumulativeVolume[0]!);
    if (startMode === 'move') ctx.moveTo(firstX, firstY);
    else ctx.lineTo(firstX, firstY);
    for (let i = 1; i < side.length; i++) {
      const prevY = viewport.volumeToY(side.cumulativeVolume[i - 1]!);
      const x = viewport.priceToX(side.price[i]!);
      const y = viewport.volumeToY(side.cumulativeVolume[i]!);
      if (shape === 'step') {
        ctx.lineTo(x, prevY);
        ctx.lineTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
  }

  private renderSpread(
    ctx: CanvasRenderingContext2D,
    view: DepthView,
    viewport: DepthViewport,
    theme: DepthThemeColors,
  ): void {
    if (view.bestBid === null || view.bestAsk === null) return;
    const plot = viewport.plot;
    const bidX = viewport.priceToX(view.bestBid);
    const askX = viewport.priceToX(view.bestAsk);
    const midX = viewport.priceToX((view.bestBid + view.bestAsk) / 2);
    const bandWidth = clamp(Math.abs(askX - bidX), 3, 28);
    ctx.save();
    ctx.fillStyle = theme.midLine;
    ctx.globalAlpha = 0.1;
    ctx.fillRect(midX - bandWidth / 2, plot.top, bandWidth, plot.height);
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.moveTo(midX, plot.top);
    ctx.lineTo(midX, plot.bottom);
    ctx.strokeStyle = theme.midLine;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  private renderSideLabels(
    ctx: CanvasRenderingContext2D,
    view: DepthView,
    viewport: DepthViewport,
    theme: DepthThemeColors,
    options: DepthRendererOptions,
  ): void {
    const volumeFormat = options.volumeFormat ?? formatVolume;
    const plot = viewport.plot;
    const y = plot.top + plot.height / 2;
    ctx.save();
    ctx.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textBaseline = 'middle';
    const bidTotal =
      view.bids.length > 0 ? volumeFormat(view.bids.cumulativeVolume[0]!) : '';
    const askTotal =
      view.asks.length > 0 ? volumeFormat(view.asks.cumulativeVolume[view.asks.length - 1]!) : '';
    const compactLabels = ctx.measureText(`BID DEPTH ${bidTotal}`).width +
      ctx.measureText(`ASK DEPTH ${askTotal}`).width +
      40 > plot.width;
    if (view.bids.length > 0) {
      const label = compactLabels ? `BID ${bidTotal}` : `BID DEPTH ${bidTotal}`;
      ctx.fillStyle = theme.bidLine;
      ctx.globalAlpha = 0.82;
      ctx.fillText(label, plot.left + 10, y);
    }
    if (view.asks.length > 0) {
      const label = compactLabels ? `ASK ${askTotal}` : `ASK DEPTH ${askTotal}`;
      ctx.fillStyle = theme.askLine;
      ctx.globalAlpha = 0.82;
      ctx.fillText(label, plot.right - ctx.measureText(label).width - 10, y);
    }
    ctx.restore();
  }

  private renderMidLine(
    ctx: CanvasRenderingContext2D,
    view: DepthView,
    viewport: DepthViewport,
    theme: DepthThemeColors,
  ): void {
    if (view.midPrice === null) return;
    const plot = viewport.plot;
    const x = viewport.priceToX(view.midPrice);
    ctx.save();
    ctx.strokeStyle = theme.midLine;
    ctx.globalAlpha = 0.62;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 5]);
    ctx.beginPath();
    ctx.moveTo(x, plot.top);
    ctx.lineTo(x, plot.bottom);
    ctx.stroke();
    ctx.restore();
  }
}
