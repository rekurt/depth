import type { DepthLevel, DepthSide } from '../types';

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function validateLevel(level: DepthLevel, side: DepthSide, index: number): void {
  if (!Number.isFinite(level.price) || level.price <= 0) {
    throw new ValidationError(
      `[depth] ${side}[${index}].price must be a finite positive number`,
    );
  }
  if (!Number.isFinite(level.volume) || level.volume < 0) {
    throw new ValidationError(
      `[depth] ${side}[${index}].volume must be a finite non-negative number`,
    );
  }
}

export function validateLevels(levels: readonly DepthLevel[], side: DepthSide): void {
  for (let i = 0; i < levels.length; i++) validateLevel(levels[i]!, side, i);
}
