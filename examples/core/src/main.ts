import {
  DepthChart,
  formatPrice,
  formatVolume,
  type DepthHoverInfo,
  type DepthMetrics,
  type DepthSnapshot,
  type DepthView,
} from '@rekurt/depth';
import { buildCenteredLadder, type CenteredLadderRow } from './orderBookView';
import './styles.css';

interface SymbolConfig {
  id: string;
  label: string;
  venue: string;
  basePrice: number;
  seed: number;
}

const SYMBOLS: readonly SymbolConfig[] = [
  { id: 'BTCUSDT', label: 'BTC/USDT', venue: 'Composite Spot', basePrice: 68000, seed: 11 },
  { id: 'ETHUSDT', label: 'ETH/USDT', venue: 'Composite Spot', basePrice: 3600, seed: 23 },
  { id: 'SOLUSDT', label: 'SOL/USDT', venue: 'Composite Spot', basePrice: 158, seed: 37 },
];

function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function roundPrice(price: number): number {
  if (price >= 1000) return Math.round(price * 10) / 10;
  if (price >= 1) return Math.round(price * 100) / 100;
  return Math.round(price * 10000) / 10000;
}

function generateDepth(symbol: SymbolConfig, levels: number, skew: number, nonce: number): DepthSnapshot {
  const rng = mulberry32(symbol.seed * 1009 + nonce * 9176 + levels * 13 + Math.round(skew * 100));
  const spread = symbol.basePrice * (0.00045 + rng() * 0.00075);
  const tick = symbol.basePrice >= 1000 ? 2.5 : symbol.basePrice >= 100 ? 0.05 : 0.005;
  const midPrice = symbol.basePrice * (1 + (rng() - 0.5) * 0.003);
  const bestBid = midPrice - spread / 2;
  const bestAsk = midPrice + spread / 2;
  const bids = [];
  const asks = [];

  for (let i = 0; i < levels; i++) {
    const distance = (i + 1) * tick * (1 + rng() * 1.6);
    const bidWall = rng() > 0.91 ? 5 + rng() * 11 : 1;
    const askWall = rng() > 0.91 ? 5 + rng() * 11 : 1;
    const bidBase = (0.35 + rng() * 2.4) * (1 + Math.max(0, skew) * 1.7);
    const askBase = (0.35 + rng() * 2.4) * (1 + Math.max(0, -skew) * 1.7);

    bids.push({
      price: roundPrice(bestBid - distance),
      volume: Math.round(bidBase * bidWall * 100) / 100,
    });
    asks.push({
      price: roundPrice(bestAsk + distance),
      volume: Math.round(askBase * askWall * 100) / 100,
    });
  }

  return {
    bids,
    asks,
    midPrice: roundPrice(midPrice),
    timestamp: Math.floor(Date.now() / 1000),
    sequence: `${symbol.id}-${nonce}`,
  };
}

const container = document.getElementById('chart') as HTMLDivElement;
const symbolSelect = document.getElementById('symbol-select') as HTMLSelectElement;
const depthRange = document.getElementById('depth-range') as HTMLInputElement;
const skewRange = document.getElementById('skew-range') as HTMLInputElement;
const refreshBtn = document.getElementById('refresh-btn') as HTMLButtonElement;
const themeBtn = document.getElementById('theme-btn') as HTMLButtonElement;
const hoverLabel = document.getElementById('hover-label') as HTMLSpanElement;
const symbolLabel = document.getElementById('symbol-label') as HTMLSpanElement;
const venueLabel = document.getElementById('venue-label') as HTMLSpanElement;
const sequenceLabel = document.getElementById('sequence-label') as HTMLSpanElement;
const metricsGrid = document.getElementById('metrics-grid') as HTMLDivElement;
const asksList = document.getElementById('asks-list') as HTMLDivElement;
const bidsList = document.getElementById('bids-list') as HTMLDivElement;
const spreadValue = document.getElementById('spread-value') as HTMLSpanElement;
const imbalanceValue = document.getElementById('imbalance-value') as HTMLSpanElement;
const imbalanceBar = document.getElementById('imbalance-bar') as HTMLSpanElement;

for (const symbol of SYMBOLS) {
  const option = document.createElement('option');
  option.value = symbol.id;
  option.textContent = symbol.label;
  symbolSelect.appendChild(option);
}

let currentSymbol = SYMBOLS[0]!;
let currentTheme: 'dark' | 'light' = 'dark';
let nonce = 1;

const chart = new DepthChart({
  container,
  data: currentSnapshot(),
  theme: currentTheme,
  maxLevels: Number(depthRange.value),
  priceDomainMode: 'centered',
  showSpread: true,
  showLabels: true,
  emptyMessage: 'Waiting for order book snapshot',
  onHover: renderHover,
});

function currentSnapshot(): DepthSnapshot {
  return generateDepth(
    currentSymbol,
    Number(depthRange.value),
    Number(skewRange.value) / 100,
    nonce,
  );
}

function replaceChildren(node: HTMLElement, children: Node[]): void {
  while (node.firstChild) node.removeChild(node.firstChild);
  for (const child of children) node.appendChild(child);
}

function metricTile(label: string, value: string, tone: 'neutral' | 'bid' | 'ask' = 'neutral'): HTMLDivElement {
  const tile = document.createElement('div');
  tile.className = `metric metric-${tone}`;
  const labelNode = document.createElement('span');
  labelNode.textContent = label;
  const valueNode = document.createElement('b');
  valueNode.textContent = value;
  tile.append(labelNode, valueNode);
  return tile;
}

function renderMetrics(metrics: DepthMetrics): void {
  const imbalancePct = Math.round(metrics.imbalance * 100);
  replaceChildren(metricsGrid, [
    metricTile('Mid', metrics.midPrice === null ? '-' : formatPrice(metrics.midPrice)),
    metricTile('Spread', metrics.spread === null ? '-' : formatPrice(metrics.spread)),
    metricTile('Bps', metrics.spreadBps === null ? '-' : metrics.spreadBps.toFixed(1)),
    metricTile('Bid depth', formatVolume(metrics.bidTotal), 'bid'),
    metricTile('Ask depth', formatVolume(metrics.askTotal), 'ask'),
    metricTile('Imbalance', `${imbalancePct > 0 ? '+' : ''}${imbalancePct}%`, imbalancePct >= 0 ? 'bid' : 'ask'),
  ]);
  spreadValue.textContent =
    metrics.spread === null || metrics.spreadBps === null
      ? '-'
      : `${formatPrice(metrics.spread)} / ${metrics.spreadBps.toFixed(1)} bps`;
  const imbalanceSide = imbalancePct >= 0 ? 'bid' : 'ask';
  imbalanceValue.textContent = `${imbalancePct > 0 ? '+' : ''}${imbalancePct}%`;
  imbalanceValue.dataset.side = imbalanceSide;
  imbalanceBar.className = `imbalance-marker ${imbalanceSide}`;
  imbalanceBar.style.left = `${50 + Math.max(-44, Math.min(44, imbalancePct * 0.44))}%`;
}

function ladderRow(rowData: CenteredLadderRow, maxTotal: number): HTMLDivElement {
  const row = document.createElement('div');
  row.className = `ladder-row ${rowData.side}`;
  const bar = document.createElement('span');
  bar.className = 'ladder-bar';
  bar.style.transform = `scaleX(${maxTotal > 0 ? Math.min(1, rowData.total / maxTotal) : 0})`;
  const priceNode = document.createElement('b');
  priceNode.textContent = formatPrice(rowData.price);
  const sizeNode = document.createElement('span');
  sizeNode.textContent = formatVolume(rowData.size);
  const totalNode = document.createElement('span');
  totalNode.textContent = formatVolume(rowData.total);
  row.append(bar, priceNode, sizeNode, totalNode);
  return row;
}

function renderLadder(view: DepthView, metrics: DepthMetrics): void {
  const maxTotal = Math.max(metrics.bidTotal, metrics.askTotal, 1);
  const listHeight = Math.min(
    asksList.clientHeight || 288,
    bidsList.clientHeight || 288,
  );
  const rowCount = Math.max(4, Math.floor(listHeight / 24));
  const ladder = buildCenteredLadder({
    asks: view.asks,
    bids: view.bids,
    visibleRowsPerSide: rowCount,
  });
  const asks = ladder.asks.map((rowData) => ladderRow(rowData, maxTotal));
  const bids = ladder.bids.map((rowData) => ladderRow(rowData, maxTotal));

  replaceChildren(asksList, asks);
  replaceChildren(bidsList, bids);
}

function renderHover(info: DepthHoverInfo | null): void {
  if (!info) {
    hoverLabel.textContent = 'Snapshot stable | cumulative liquidity';
    return;
  }
  const side = info.side === 'bid' ? 'Bid' : 'Ask';
  hoverLabel.textContent = `${side} ${formatPrice(info.price)} | size ${formatVolume(info.volume)} | cumulative ${formatVolume(info.cumulativeVolume)}`;
}

function renderAll(): void {
  const view = chart.getView();
  const metrics = chart.getMetrics();
  symbolLabel.textContent = currentSymbol.label;
  venueLabel.textContent = currentSymbol.venue;
  sequenceLabel.textContent = String(view.sequence ?? '-');
  renderMetrics(metrics);
  renderLadder(view, metrics);
}

function reload(): void {
  const snapshot = currentSnapshot();
  chart.updateOptions({
    data: snapshot,
    maxLevels: Number(depthRange.value),
  });
  renderAll();
}

symbolSelect.addEventListener('change', () => {
  const next = SYMBOLS.find((symbol) => symbol.id === symbolSelect.value);
  if (!next) return;
  currentSymbol = next;
  nonce++;
  reload();
});

depthRange.addEventListener('input', reload);
skewRange.addEventListener('input', reload);

refreshBtn.addEventListener('click', () => {
  nonce++;
  reload();
});

themeBtn.addEventListener('click', () => {
  currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
  chart.setTheme(currentTheme);
  themeBtn.textContent = currentTheme === 'dark' ? 'Dark' : 'Light';
  document.documentElement.dataset.theme = currentTheme;
});

window.addEventListener('resize', renderAll);

document.documentElement.dataset.theme = currentTheme;
renderAll();
