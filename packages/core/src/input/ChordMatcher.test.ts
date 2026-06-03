import { afterEach, describe, it, expect, vi } from 'vitest';
import { ChordMatcher } from './ChordMatcher.js';
import { createKeyEvent } from '../events/types.js';

// Helper to create mock key events
function pressKey(key: string, modifiers: { ctrl?: boolean; alt?: boolean; shift?: boolean } = {}) {
  return createKeyEvent({
    key,
    raw: Buffer.from(key),
    ctrl: modifiers.ctrl ?? false,
    alt: modifiers.alt ?? false,
    shift: modifiers.shift ?? false,
  });
}

describe('ChordMatcher', () => {
  afterEach(() => {
    vi.useRealTimers();
  });
  it('g g fires the handler', () => {
    const matcher = new ChordMatcher();
    const handler = vi.fn();

    matcher.bind(['g', 'g'], handler);

    // First key: g
    const res1 = matcher.feed(pressKey('g'));
    expect(res1).toBe(true);
    expect(handler).not.toHaveBeenCalled();

    // Second key: g
    const res2 = matcher.feed(pressKey('g'));
    expect(res2).toBe(true);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('g x resets and does not fire', () => {
    const matcher = new ChordMatcher();
    const handler = vi.fn();

    matcher.bind(['g', 'g'], handler);

    // First key: g
    const res1 = matcher.feed(pressKey('g'));
    expect(res1).toBe(true);

    // Second key: x
    const res2 = matcher.feed(pressKey('x'));
    expect(res2).toBe(false);
    expect(handler).not.toHaveBeenCalled();

    // Third key: g
    const res3 = matcher.feed(pressKey('g'));
    expect(res3).toBe(true);
    expect(handler).not.toHaveBeenCalled();
  });

  it('timeout between keys aborts the chord', () => {
    vi.useFakeTimers();
    const matcher = new ChordMatcher({ timeoutMs: 500 });
    const handler = vi.fn();

    matcher.bind(['g', 'g'], handler);

    matcher.feed(pressKey('g'));
    expect(handler).not.toHaveBeenCalled();

    // Wait for 600ms (timeout is 500ms)
    vi.advanceTimersByTime(600);

    // Feed g again
    matcher.feed(pressKey('g'));
    // Since first g timed out, this g is treated as a new start of chord, so it shouldn't fire yet
    expect(handler).not.toHaveBeenCalled();

    // Feed another g
    matcher.feed(pressKey('g'));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('ctrl+k s matches a modified chord', () => {
    const matcher = new ChordMatcher();
    const handler = vi.fn();

    matcher.bind(['ctrl+k', 's'], handler);

    // First key: ctrl+k
    const res1 = matcher.feed(pressKey('k', { ctrl: true }));
    expect(res1).toBe(true);
    expect(handler).not.toHaveBeenCalled();

    // Second key: s
    const res2 = matcher.feed(pressKey('s'));
    expect(res2).toBe(true);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('unbind prevents firing', () => {
    const matcher = new ChordMatcher();
    const handler = vi.fn();

    const unbind = matcher.bind(['g', 'g'], handler);

    // First key: g
    matcher.feed(pressKey('g'));

    // Unbind during sequence
    unbind();

    // Second key: g
    const res = matcher.feed(pressKey('g'));
    expect(res).toBe(false); // Should not match anymore
    expect(handler).not.toHaveBeenCalled();
  });
});
