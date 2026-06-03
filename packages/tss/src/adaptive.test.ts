import { afterEach, describe, expect, it, vi } from 'vitest';
import { adaptive } from './adaptive.js';
import { caps } from '@termuijs/core';

describe('adaptive', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns light color when background is light', () => {
    const spy = vi.spyOn(caps, 'background', 'get').mockReturnValue('light');
    expect(adaptive({ light: '#ffffff', dark: '#000000' })).toBe('#ffffff');
    expect(spy).toHaveBeenCalled();
  });

  it('returns dark color when background is dark', () => {
    const spy = vi.spyOn(caps, 'background', 'get').mockReturnValue('dark');
    expect(adaptive({ light: '#ffffff', dark: '#000000' })).toBe('#000000');
    expect(spy).toHaveBeenCalled();
  });

  it('never mutates caps directly', () => {
    const spy = vi.spyOn(caps, 'background', 'get').mockReturnValue('light');
    expect(() => adaptive({ light: '#ffffff', dark: '#000000' })).not.toThrow();
    expect(spy).toHaveBeenCalled();
  });
});
