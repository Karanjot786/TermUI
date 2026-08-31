import { describe, it, expect } from 'bun:test';
import { wrapTextWithWidth } from '../src/utils/textWrap';

describe('wrapTextWithWidth Unit Tests', () => {
  it('should wrap basic ASCII text without breaking words unnecessarily', () => {
    const lines = wrapTextWithWidth('Hello World Test', 12, { trim: true });
    expect(lines.length).toBeGreaterThan(1);
    expect(lines[0]).toBe('Hello World');
  });

  it('should preserve multi-byte emoji boundaries when wrapping', () => {
    const text = '🚀🎉⭐🔥💡';
    const lines = wrapTextWithWidth(text, 4);
    // Each emoji has a visual width of 2 columns. Max width 4 holds 2 emojis per line.
    expect(lines.length).toBe(3);
    expect(lines[0]).toBe('🚀🎉');
    expect(lines[1]).toBe('⭐🔥');
    expect(lines[2]).toBe('💡');
  });

  it('should handle newline characters properly', () => {
    const text = 'Line 1\nLine 2';
    const lines = wrapTextWithWidth(text, 20);
    expect(lines).toEqual(['Line 1', 'Line 2']);
  });

  it('should handle zero or negative maxWidth gracefully', () => {
    expect(wrapTextWithWidth('Test', 0)).toEqual([]);
    expect(wrapTextWithWidth('', 10)).toEqual([]);
  });
});
