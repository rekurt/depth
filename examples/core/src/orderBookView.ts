import type { DepthSideView } from '@rekurt/depth';

export interface CenteredLadderRow {
  side: 'bid' | 'ask';
  price: number;
  size: number;
  total: number;
}

export interface CenteredLadderInput {
  asks: DepthSideView;
  bids: DepthSideView;
  visibleRowsPerSide: number;
}

export interface CenteredLadder {
  asks: CenteredLadderRow[];
  bids: CenteredLadderRow[];
}

function rowAt(side: DepthSideView, index: number): CenteredLadderRow {
  return {
    side: side.side,
    price: side.price[index]!,
    size: side.volume[index]!,
    total: side.cumulativeVolume[index]!,
  };
}

export function buildCenteredLadder(input: CenteredLadderInput): CenteredLadder {
  const rowsPerSide = Math.max(0, Math.floor(input.visibleRowsPerSide));
  const askRows: CenteredLadderRow[] = [];
  const bidRows: CenteredLadderRow[] = [];

  const askLimit = Math.min(input.asks.length, rowsPerSide);
  for (let i = askLimit - 1; i >= 0; i--) askRows.push(rowAt(input.asks, i));

  const bidStart = Math.max(0, input.bids.length - rowsPerSide);
  for (let i = input.bids.length - 1; i >= bidStart; i--) bidRows.push(rowAt(input.bids, i));

  return {
    asks: askRows,
    bids: bidRows,
  };
}
