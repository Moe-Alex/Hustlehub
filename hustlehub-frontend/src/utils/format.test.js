import { describe, expect, it } from 'vitest';
import { formatWait, formatZAR } from './format';

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
