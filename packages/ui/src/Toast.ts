// Toast - auto-dismiss notification
import { Widget } from '@termuijs/widgets';
import { type Screen, stripAnsiControl, mergeStyles, defaultStyle, styleToCellAttrs, caps } from '@termuijs/core';

export type ToastType = 'info' | 'success' | 'warning' | 'error';

export interface ToastMessage {
  text: string;
  type: ToastType;
  expireAt: number;
  createdAt: number;
}

export interface ToastOptions {
  position?: 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left';
  durationMs?: number;
  maxVisible?: number;
  announce?: boolean;
  animationMs?: number;
}

const ICONS_UNICODE: Record<ToastType, string> = { info: 'ℹ', success: '✓', warning: '⚠', error: '✗' };
const ICONS_ASCII: Record<ToastType, string> = { info: 'i', success: '+', warning: '!', error: 'x' };
const COLORS: Record<ToastType, string> = { info: 'cyan', success: 'green', warning: 'yellow', error: 'red' };

export class Toast extends Widget {
  private _messages: ToastMessage[] = [];
  private _position: string;
  private _durationMs: number;
  private _maxVisible: number;
  private _announce: boolean;
  private _animationMs: number;
  private _animationTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(options: ToastOptions = {}) {
    super(mergeStyles(defaultStyle(), {}));
    this._position = options.position ?? 'top-right';
    this._durationMs = options.durationMs ?? 3000;
    this._maxVisible = options.maxVisible ?? 5;
    this._announce = options.announce ?? true;
    this._animationMs = options.animationMs ?? 300;
  }

  push(text: string, type: ToastType = 'info'): void {
    const now = Date.now();
    this._messages.push({ text, type, expireAt: now + this._durationMs, createdAt: now });
    this.markDirty();
    if (this._announce) this._announceToScreenReader(text, type);
  }

  info(text: string): void { this.push(text, 'info'); }
  success(text: string): void { this.push(text, 'success'); }
  warning(text: string): void { this.push(text, 'warning'); }
  error(text: string): void { this.push(text, 'error'); }

  private _announceToScreenReader(text: string, _type: ToastType): void {
    try {
      const safeText = stripAnsiControl(text);
      process.stderr.write('\x1b]777;notify;TermUI;[' + safeText + ']\x07');
    } catch { }
  }

  private _getAnimationProgress(createdAt: number, expireAt: number): number {
    const now = Date.now();
    const elapsed = now - createdAt;
    const remaining = expireAt - now;
    if (remaining < this._animationMs) return Math.max(0, remaining / this._animationMs);
    if (elapsed < this._animationMs) return elapsed / this._animationMs;
    return 1;
  }

  protected _renderSelf(screen: Screen): void {
    if (this._animationTimer !== undefined) {
      clearTimeout(this._animationTimer);
      this._animationTimer = undefined;
    }
    const now = Date.now();
    this._messages = this._messages.filter(m => m.expireAt > now);
    if (this._messages.length === 0) return;
    const { x, y, width, height } = this._rect;
    if (width <= 2 || height <= 0) return;

    const visible = this._messages.slice(-this._maxVisible);
    const tw = Math.min(40, width - 2);
    const isRight = this._position.includes('right');
    const isBottom = this._position.includes('bottom');
    const sx = isRight ? x + width - tw - 1 : x + 1;
    const sy = isBottom ? y + height - visible.length - 1 : y + 1;
    const icons = caps.unicode ? ICONS_UNICODE : ICONS_ASCII;
    const attrs = styleToCellAttrs(this.style);
    for (let i = 0; i < visible.length; i++) {
      const m = visible[i];
      const progress = this._getAnimationProgress(m.createdAt, m.expireAt);
      const fullLabel = (' ' + icons[m.type] + ' ' + m.text + ' ').slice(0, tw).padEnd(tw);
      const visibleChars = Math.floor(progress * tw);
      const label = fullLabel.slice(0, visibleChars).padEnd(tw);
      screen.writeString(sx, sy + i, label, { ...attrs, fg: { type: 'named', name: COLORS[m.type] as any }, bold: true });
    }
    const anyAnimating = visible.some(m => {
      const elapsed = now - m.createdAt;
      const remaining = m.expireAt - now;
      return elapsed < this._animationMs || remaining < this._animationMs;
    });
    const nextExitStart = Math.min(...visible.map(m => m.expireAt - this._animationMs));
    const delay = anyAnimating ? 16 : Math.max(0, nextExitStart - now);
    this._animationTimer = setTimeout(() => {
      this._animationTimer = undefined;
      this.markDirty();
    }, delay);
  }

  /** Lifecycle: stop the pending animation re-render timer. */
  unmount(): void {
    if (this._animationTimer !== undefined) {
      clearTimeout(this._animationTimer);
      this._animationTimer = undefined;
    }
    super.unmount();
  }
}
