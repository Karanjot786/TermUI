// ─────────────────────────────────────────────────────
// @termuijs/core — Chord Matcher
// ─────────────────────────────────────────────────────

import type { KeyEvent } from '../events/types.js';

/**
 * A single key sequence binding: an ordered list of key tokens and its handler.
 */
export interface Chord {
  keys: string[];
  handler: () => void;
}

/**
 * Configuration for a {@link ChordMatcher}.
 */
export interface ChordMatcherOptions {
  /** Idle time before an in-progress sequence is discarded. Defaults to 800ms. */
  timeoutMs?: number;
  /** Maximum number of buffered tokens before the buffer is reset. Defaults to 10. */
  maxBufferSize?: number;
}

function getKeyEventToken(event: KeyEvent): string {
  let token = '';
  if (event.ctrl) token += 'ctrl+';
  if (event.alt) token += 'alt+';
  if (event.shift) token += 'shift+';
  token += event.key.toLowerCase();
  return token;
}

/**
 * Matches multi-key "chords" (e.g. `ctrl+k ctrl+s`) from a stream of key events.
 *
 * Each call to {@link feed} advances an internal buffer and fires the handler
 * of any binding whose full sequence matches. A timeout resets the buffer if
 * the sequence is not completed in time.
 */
export class ChordMatcher {
  private _bindings: { keys: string[]; handler: () => void; id: number }[] = [];
  private _nextId = 0;
  private _buffer: string[] = [];
  private _timeoutMs: number;
  private _maxBufferSize: number;
  private _timer: ReturnType<typeof setTimeout> | null = null;

  constructor(opts?: ChordMatcherOptions) {
    this._timeoutMs = opts?.timeoutMs ?? 800;
    this._maxBufferSize = opts?.maxBufferSize ?? 10;
  }

  /**
   * Register a chord. Returns an unbind function that removes the binding.
   */
  bind(keys: string[], handler: () => void): () => void {
    const id = this._nextId++;
    this._bindings.push({ keys, handler, id });
    return () => {
      this._bindings = this._bindings.filter(b => b.id !== id);
    };
  }

  /**
   * Feed a key event into the matcher.
   * @returns `true` if the token advanced or completed a binding, `false` if it matched nothing.
   */
  feed(event: KeyEvent): boolean {
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }

    const token = getKeyEventToken(event);
    let candidate = [...this._buffer, token];

    if (candidate.length > this._maxBufferSize) {
      this._buffer = [];
      candidate = [token];
    }

    let matchingBindings = this._getMatchingBindings(candidate);

    if (matchingBindings.length === 0) {
      // Wrong key resets the buffer
      this._buffer = [];
      // Attempt to match the token as the start of a new sequence
      candidate = [token];
      matchingBindings = this._getMatchingBindings(candidate);
      if (matchingBindings.length === 0) {
        return false;
      }
    }

    this._buffer = candidate;

    const completedBindings = matchingBindings.filter(
      binding => binding.keys.length === candidate.length
    );

    if (completedBindings.length > 0) {
      // Completed chord: fires handler, clears buffer
      for (const binding of completedBindings) {
        binding.handler();
      }
      this._buffer = [];
      return true;
    }

    // If it advanced but did not complete, set the timeout to reset the buffer
    this._timer = setTimeout(() => {
      this._buffer = [];
      this._timer = null;
    }, this._timeoutMs);

    return true;
  }

  private _getMatchingBindings(candidate: string[]) {
    return this._bindings.filter(binding => {
      if (binding.keys.length < candidate.length) return false;
      for (let i = 0; i < candidate.length; i++) {
        if (binding.keys[i] !== candidate[i]) return false;
      }
      return true;
    });
  }
}
