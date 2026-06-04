import { describe, expect, it } from 'vitest';
import { formatFrame, frameSerializer } from './frame-serializer.js';

describe('formatFrame', () => {
  it('pads rows to equal width and draws a border', () => {
    const result = formatFrame(['ab', 'c']);
    expect(result).toBe('┌──┐\n│ab│\n│c │\n└──┘');
  });

  it('handles a single row', () => {
    const result = formatFrame(['hello']);
    expect(result).toBe('┌─────┐\n│hello│\n└─────┘');
  });

  it('handles empty frame without throwing', () => {
    const result = formatFrame([]);
    expect(result).toBe('┌┐\n└┘');
  });

  it('produces deterministic output for same input', () => {
    const frame = ['foo', 'ba'];
    expect(formatFrame(frame)).toBe(formatFrame(frame));
  });
});

describe('frameSerializer', () => {
  it('accepts a string[] frame', () => {
    expect(frameSerializer.test(['hello', 'world'])).toBe(true);
  });

  it('accepts an empty string[]', () => {
    expect(frameSerializer.test([])).toBe(true);
  });

  it('rejects non-array values', () => {
    expect(frameSerializer.test('hello')).toBe(false);
    expect(frameSerializer.test(42)).toBe(false);
    expect(frameSerializer.test(null)).toBe(false);
    expect(frameSerializer.test(undefined)).toBe(false);
    expect(frameSerializer.test({ frame: [] })).toBe(false);
  });

  it('rejects array with non-string values', () => {
    expect(frameSerializer.test([1, 2, 3])).toBe(false);
    expect(frameSerializer.test(['ok', 42])).toBe(false);
  });

  it('serialize produces stable deterministic output', () => {
    const frame = ['ab', 'c'];
    expect(frameSerializer.serialize(frame)).toBe(frameSerializer.serialize(frame));
  });

  it('can be passed to expect.addSnapshotSerializer without error', () => {
    expect(() => expect.addSnapshotSerializer(frameSerializer)).not.toThrow();
  });
});