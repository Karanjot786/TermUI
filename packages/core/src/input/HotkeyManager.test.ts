import { describe, it, expect, vi } from 'vitest';
import { HotkeyManager } from './HotkeyManager.js';
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

describe('HotkeyManager.normalizeKey', () => {
  it('lowercases a plain key with no modifiers', () => {
    expect(HotkeyManager.normalizeKey(pressKey('S'))).toBe('s');
  });

  it('prefixes ctrl for the ctrl modifier', () => {
    expect(HotkeyManager.normalizeKey(pressKey('s', { ctrl: true }))).toBe('ctrl+s');
  });

  it('prefixes alt for the alt modifier', () => {
    expect(HotkeyManager.normalizeKey(pressKey('a', { alt: true }))).toBe('alt+a');
  });

  it('omits the shift modifier for single-character keys', () => {
    // Per the implementation, shift is only recorded for named (multi-char) keys.
    expect(HotkeyManager.normalizeKey(pressKey('a', { shift: true }))).toBe('a');
  });

  it('includes the shift modifier for named multi-character keys', () => {
    expect(HotkeyManager.normalizeKey(pressKey('up', { shift: true }))).toBe('shift+up');
  });

  it('orders modifiers as ctrl, alt, shift before the key name', () => {
    expect(
      HotkeyManager.normalizeKey(pressKey('up', { ctrl: true, alt: true, shift: true }))
    ).toBe('ctrl+alt+shift+up');
  });
});

describe('HotkeyManager register/dispatch/unregister', () => {
  it('dispatch invokes a registered handler and returns true', () => {
    const handler = vi.fn();
    const unregister = HotkeyManager.register('ctrl+t1', handler);

    const handled = HotkeyManager.dispatch(pressKey('t1', { ctrl: true }));

    expect(handled).toBe(true);
    expect(handler).toHaveBeenCalledTimes(1);

    unregister();
  });

  it('the cleanup function returned by register unregisters the handler', () => {
    const handler = vi.fn();
    const unregister = HotkeyManager.register('ctrl+t2', handler);

    unregister();

    const handled = HotkeyManager.dispatch(pressKey('t2', { ctrl: true }));

    expect(handled).toBe(false);
    expect(handler).not.toHaveBeenCalled();
  });

  it('dispatch calls only the most recently registered handler (LIFO)', () => {
    const first = vi.fn();
    const second = vi.fn();
    const unregisterFirst = HotkeyManager.register('ctrl+t3', first);
    const unregisterSecond = HotkeyManager.register('ctrl+t3', second);

    const handled = HotkeyManager.dispatch(pressKey('t3', { ctrl: true }));

    expect(handled).toBe(true);
    expect(second).toHaveBeenCalledTimes(1);
    expect(first).not.toHaveBeenCalled();

    unregisterFirst();
    unregisterSecond();
  });

  it('HotkeyManager.unregister removes only the specified handler, leaving others intact', () => {
    const first = vi.fn();
    const second = vi.fn();
    HotkeyManager.register('ctrl+t4', first);
    HotkeyManager.register('ctrl+t4', second);

    // Remove the most-recently-registered handler directly via the static API.
    HotkeyManager.unregister('ctrl+t4', second);

    const handled = HotkeyManager.dispatch(pressKey('t4', { ctrl: true }));

    expect(handled).toBe(true);
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).not.toHaveBeenCalled();

    HotkeyManager.unregister('ctrl+t4', first);
  });

  it('dispatch on a shortcut with no registered handlers is a no-op and returns false', () => {
    const handler = vi.fn();
    const handled = HotkeyManager.dispatch(pressKey('t5', { ctrl: true }));

    expect(handled).toBe(false);
    expect(handler).not.toHaveBeenCalled();
  });
});
