import { describe, expect, it } from 'vitest';
import { formatPercent, formatRand, formatWait, formatZAR } from './format';

describe('formatZAR', () => {
  it('shows rand with the amount', () => {
    const text = formatZAR(450);
    expect(text).toContain('R');
    expect(text).toContain('450');
  });

  it('treats missing values as zero', () => {
    expect(formatZAR(undefined)).toContain('0');
  });
});

describe('formatWait', () => {
  it('uses seconds for short waits and minutes for longer ones', () => {
    expect(formatWait(30)).toBe('30 seconds');
    expect(formatWait(600)).toBe('10 minutes');
    expect(formatWait(61)).toBe('2 minutes');
  });
});

describe('formatRand and formatPercent', () => {
  it('formats whole rands without cents', () => {
    expect(formatRand(245100)).toBe('R 245 100');
    expect(formatRand(0)).toBe('R 0');
  });

  it('formats rates as percentages and drops needless decimals', () => {
    expect(formatPercent(0.18)).toBe('18%');
    expect(formatPercent(0.1968)).toBe('19.7%');
    expect(formatPercent(0.18, 0)).toBe('18%');
  });
});
