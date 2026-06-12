import { DepthBuffer } from './data/DepthBuffer';
import { DepthViewport } from './interaction/DepthViewport';
import { DepthRenderer } from './rendering/DepthRenderer';
import type {
  DepthChartOptions,
  DepthChartUpdateOptions,
  DepthErrorWhere,
  DepthHoverInfo,
  DepthMetrics,
  DepthSnapshot,
  DepthThemeColors,
  DepthView,
  ThemeMode,
  DepthBufferOptions,
  DepthRenderDomainOptions,
} from './types';
import {
  containerSize,
  createLayerCanvas,
  resizeHiDPICanvas,
  resolveTheme,
  toError,
} from './utils';

type RafHandle = ReturnType<typeof setTimeout> | number;

export class DepthChart {
  private readonly _container: HTMLElement;
  private readonly _chartCanvas: HTMLCanvasElement;
  private readonly _interactionCanvas: HTMLCanvasElement;
  private _chartCtx: CanvasRenderingContext2D;
  private _interactionCtx: CanvasRenderingContext2D;
  private readonly _buffer = new DepthBuffer();
  private readonly _viewport: DepthViewport;
  private readonly _renderer = new DepthRenderer();
  private _options: DepthChartOptions;
  private _theme: DepthThemeColors;
  private _themeMode: ThemeMode | DepthThemeColors | undefined;
  private _resizeObserver: ResizeObserver | null = null;
  private _raf: RafHandle | null = null;
  private _destroyed = false;
  private _hover: DepthHoverInfo | null = null;

  constructor(options: DepthChartOptions) {
    if (typeof document === 'undefined') {
      throw new Error('[depth] DepthChart requires a browser environment');
    }
    this._options = options;
    this._container = options.container;
    this._themeMode = options.theme;
    this._theme = resolveTheme(options.theme);

    const size = containerSize(this._container);
    this._viewport = new DepthViewport(size);

    this._container.style.position = this._container.style.position || 'relative';
    this._container.style.overflow = 'hidden';
    this._container.style.backgroundColor = this._theme.background;

    this._chartCanvas = createLayerCanvas(1);
    this._interactionCanvas = createLayerCanvas(2);
    this._interactionCanvas.tabIndex = 0;
    this._interactionCanvas.setAttribute('role', 'img');
    this._interactionCanvas.setAttribute('aria-label', 'Order book depth chart');

    this._container.appendChild(this._chartCanvas);
    this._container.appendChild(this._interactionCanvas);

    this._chartCtx = resizeHiDPICanvas(this._chartCanvas, size.width, size.height);
    this._interactionCtx = resizeHiDPICanvas(
      this._interactionCanvas,
      size.width,
      size.height,
    );

    this._interactionCanvas.addEventListener('pointermove', this._handlePointerMove);
    this._interactionCanvas.addEventListener('pointerleave', this._handlePointerLeave);

    if (typeof ResizeObserver !== 'undefined') {
      this._resizeObserver = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (!entry) return;
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) this.resize(width, height);
      });
      this._resizeObserver.observe(this._container);
    }

    if (options.data) this.setData(options.data);
    else this._render();
  }

  setData(snapshot: DepthSnapshot): void {
    try {
      this._buffer.setSnapshot(snapshot, this._bufferOptions());
      this.fitAll();
    } catch (error) {
      this._handleError('setData', error, true);
    }
  }

  updateOptions(options: DepthChartUpdateOptions): void {
    const previousMaxLevels = this._options.maxLevels;
    const previousPriceDomainMode = this._options.priceDomainMode;
    this._options = { ...this._options, ...options };
    if (options.theme !== undefined) {
      this._themeMode = options.theme;
      this._theme = resolveTheme(options.theme);
      this._container.style.backgroundColor = this._theme.background;
    }
    if (options.data) {
      this.setData(options.data);
      return;
    }
    if (options.maxLevels !== undefined && options.maxLevels !== previousMaxLevels) {
      const snapshot = this._buffer.getSnapshot();
      if (snapshot) {
        this.setData(snapshot);
        return;
      }
    }
    if (
      options.priceDomainMode !== undefined &&
      options.priceDomainMode !== previousPriceDomainMode
    ) {
      this.fitAll();
      return;
    }
    this._requestRender();
  }

  setTheme(theme: ThemeMode | DepthThemeColors): void {
    this._themeMode = theme;
    this._theme = resolveTheme(theme);
    this._container.style.backgroundColor = this._theme.background;
    this._requestRender();
  }

  fitAll(): void {
    this._viewport.setDomain(this._buffer.renderDomain(this._domainOptions()));
    this._requestRender();
  }

  resize(width: number, height: number): void {
    if (this._destroyed) return;
    this._viewport.setSize(width, height);
    this._chartCtx = resizeHiDPICanvas(this._chartCanvas, width, height);
    this._interactionCtx = resizeHiDPICanvas(this._interactionCanvas, width, height);
    this._requestRender();
  }

  getSnapshot(): DepthSnapshot | null {
    return this._buffer.getSnapshot();
  }

  getView(): DepthView {
    return this._buffer.getView();
  }

  getMetrics(): DepthMetrics {
    return this._buffer.metrics();
  }

  destroy(): void {
    if (this._destroyed) return;
    this._destroyed = true;
    if (this._raf !== null) this._cancelFrame(this._raf);
    this._resizeObserver?.disconnect();
    this._interactionCanvas.removeEventListener('pointermove', this._handlePointerMove);
    this._interactionCanvas.removeEventListener('pointerleave', this._handlePointerLeave);
    this._chartCanvas.remove();
    this._interactionCanvas.remove();
  }

  private readonly _handlePointerMove = (event: PointerEvent): void => {
    if (this._destroyed) return;
    try {
      const rect = this._interactionCanvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      if (!this._viewport.containsPoint(x, y)) {
        this._setHover(null);
        return;
      }
      const price = this._viewport.xToPrice(x);
      const point = this._buffer.nearestByPrice(price);
      if (!point) {
        this._setHover(null);
        return;
      }
      this._setHover({
        ...point,
        x: this._viewport.priceToX(point.price),
        y: this._viewport.volumeToY(point.cumulativeVolume),
      });
    } catch (error) {
      this._handleError('interaction', error, false);
    }
  };

  private readonly _handlePointerLeave = (): void => {
    this._setHover(null);
  };

  private _setHover(next: DepthHoverInfo | null): void {
    this._hover = next;
    this._options.onHover?.(next);
    this._renderCrosshair();
  }

  private _requestRender(): void {
    if (this._destroyed || this._raf !== null) return;
    this._raf = this._scheduleFrame(() => {
      this._raf = null;
      this._render();
    });
  }

  private _render(): void {
    try {
      this._renderer.render(this._chartCtx, this._buffer.getView(), this._viewport, this._theme, {
        shape: this._options.shape ?? 'step',
        showGrid: this._options.showGrid,
        showSpread: this._options.showSpread,
        showMidLine: this._options.showMidLine,
        showLabels: this._options.showLabels,
        emptyMessage: this._options.emptyMessage,
        priceFormat: this._options.priceFormat,
        volumeFormat: this._options.volumeFormat,
      });
      this._renderCrosshair();
    } catch (error) {
      this._handleError('render', error, false);
    }
  }

  private _renderCrosshair(): void {
    this._renderer.renderCrosshair(
      this._interactionCtx,
      this._hover,
      this._viewport,
      this._theme,
      {
        shape: this._options.shape ?? 'step',
        showGrid: this._options.showGrid,
        showSpread: this._options.showSpread,
        showMidLine: this._options.showMidLine,
        showLabels: this._options.showLabels,
        emptyMessage: this._options.emptyMessage,
        priceFormat: this._options.priceFormat,
        volumeFormat: this._options.volumeFormat,
      },
    );
  }

  private _bufferOptions(): DepthBufferOptions {
    const options: DepthBufferOptions = {};
    if (this._options.maxLevels !== undefined) options.maxLevels = this._options.maxLevels;
    return options;
  }

  private _domainOptions(): DepthRenderDomainOptions {
    const options: DepthRenderDomainOptions = {};
    if (this._options.priceDomainMode !== undefined) {
      options.priceDomainMode = this._options.priceDomainMode;
    }
    return options;
  }

  private _handleError(where: DepthErrorWhere, error: unknown, fatal: boolean): void {
    const wrapped = toError(error);
    if (this._options.onError) {
      this._options.onError({ where, error: wrapped, fatal });
      return;
    }
    if (fatal) throw wrapped;
    throw wrapped;
  }

  private _scheduleFrame(callback: () => void): RafHandle {
    if (typeof requestAnimationFrame === 'function') return requestAnimationFrame(callback);
    return setTimeout(callback, 0);
  }

  private _cancelFrame(handle: RafHandle): void {
    if (typeof cancelAnimationFrame === 'function' && typeof handle === 'number') {
      cancelAnimationFrame(handle);
      return;
    }
    clearTimeout(handle as ReturnType<typeof setTimeout>);
  }
}
