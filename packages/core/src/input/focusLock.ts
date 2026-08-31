// ─────────────────────────────────────────────────────
// @termuijs/core — Scoped Keyboard Focus Lock & Modal Manager
// ─────────────────────────────────────────────────────

import type { FocusManager, Focusable } from '../events/FocusManager.js';

export interface TrapOptions {
  containerId: string;
}

export class FocusLockManager {
  private _focusManager: FocusManager;
  private _trapStack: string[] = [];

  constructor(focusManager: FocusManager) {
    this._focusManager = focusManager;
  }

  get isLocked(): boolean {
    return this._trapStack.length > 0;
  }

  get activeTrapContainerId(): string | null {
    if (this._trapStack.length === 0) return null;
    return this._trapStack[this._trapStack.length - 1];
  }

  pushTrap(options: TrapOptions, focusables: Focusable[] = []): void {
    this._trapStack.push(options.containerId);
    this._focusManager.trap(options.containerId, focusables);
  }

  popTrap(): string | null {
    if (this._trapStack.length === 0) return null;

    const popped = this._trapStack.pop()!;
    this._focusManager.release();

    return popped;
  }

  handleKeyDown(keyName: string, isShift: boolean = false): boolean {
    if (!this.isLocked) return false;

    if (keyName === 'escape') {
      this.popTrap();
      return true;
    }

    if (keyName === 'tab') {
      if (isShift) {
        this._focusManager.focusPrev();
      } else {
        this._focusManager.focusNext();
      }
      return true;
    }

    return false;
  }
}
