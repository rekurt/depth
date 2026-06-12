import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LIGHT_THEME } from './constants';

const demoStyles = readFileSync(
  join(process.cwd(), 'examples/core/src/styles.css'),
  'utf8',
);

function lightToken(name: string) {
  const lightBlock = demoStyles.match(/:root\[data-theme="light"\]\s*\{(?<body>[\s\S]*?)\n\}/)
    ?.groups?.body;
  expect(lightBlock).toBeDefined();

  const token = lightBlock?.match(new RegExp(`--${name}:\\s*([^;]+);`))?.[1];
  expect(token).toBeDefined();

  return token?.trim() ?? '';
}

describe('light institutional theme', () => {
  it('keeps the demo light theme away from pure white panels', () => {
    expect(lightToken('bg')).not.toMatch(/^#fff(?:fff)?$/i);
    expect(lightToken('panel')).not.toMatch(/^#fff(?:fff)?$/i);
    expect(lightToken('panel-2')).not.toMatch(/^#fff(?:fff)?$/i);
    expect(lightToken('surface')).not.toMatch(/^#fff(?:fff)?$/i);
  });

  it('uses subdued library light fills instead of loud chart blocks', () => {
    expect(LIGHT_THEME.background).not.toMatch(/^#fff(?:fff)?$/i);
    expect(LIGHT_THEME.bidFill).toMatch(/rgba\([^,]+,[^,]+,[^,]+,\s*0\.1[0-2]\)/);
    expect(LIGHT_THEME.askFill).toMatch(/rgba\([^,]+,[^,]+,[^,]+,\s*0\.1[0-2]\)/);
  });
});
