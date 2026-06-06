// ─────────────────────────────────────────────────────
// @termuijs/core — Event types
// ─────────────────────────────────────────────────────

/**
 * Keyboard event emitted when a key is pressed.
 */
export interface KeyEvent {
    /** Human-readable key name: 'a', 'enter', 'up', 'f1', 'tab', etc. */
    key: string;
    /** Raw byte sequence from stdin */
    raw: Buffer;
    /** Ctrl modifier held */
    ctrl: boolean;
    /** Alt/Meta modifier held */
    alt: boolean;
    /** Shift modifier held */
    shift: boolean;
    /** The widget ID that currently has focus (target of the event) */
    targetId?: string;
    /** Whether propagation has been stopped */
    _propagationStopped?: boolean;
    /** Whether the default action has been prevented */
    _defaultPrevented?: boolean;
    /** Stop this event from bubbling to parent widgets */
    stopPropagation(): void;
    /** Prevent the default action for this event */
    preventDefault(): void;
}

/**
 * Create a KeyEvent with propagation control methods attached.
 */
export function createKeyEvent(base: {
    key: string;
    raw: Buffer;
    ctrl: boolean;
    alt: boolean;
    shift: boolean;
    targetId?: string;
}): KeyEvent {
    const event: KeyEvent = {
        ...base,
        _propagationStopped: false,
        _defaultPrevented: false,
        stopPropagation() { this._propagationStopped = true; },
        preventDefault() { this._defaultPrevented = true; },
    };
    return event;
}

/**
 * Mouse event types.
 */
export type MouseEventType =
    | 'mousedown' | 'mouseup' | 'mousemove' | 'scroll'
    | 'dblclick' | 'drag' | 'dragend';
export type MouseButton = 'left' | 'middle' | 'right' | 'none';

/**
 * Mouse event emitted when mouse activity is detected.
 */
export interface MouseEvent {
    /** x (column) position, 0-indexed */
    x: number;
    /** y (row) position, 0-indexed */
    y: number;
    /** Which mouse button */
    button: MouseButton;
    /** Type of mouse event */
    type: MouseEventType;
    /** Scroll direction (-1 = up, 1 = down) */
    scrollDelta?: number;
    /** Ctrl modifier held during the mouse event. SGR bit 0b10000. */
    ctrl?: boolean;
    /** Alt/Meta modifier held during the mouse event. SGR bit 0b1000. */
    alt?: boolean;
    /** Shift modifier held during the mouse event. SGR bit 0b100. */
    shift?: boolean;
}

/**
 * Resize event emitted when the terminal is resized.
 */
export interface ResizeEvent {
    cols: number;
    rows: number;
}

/**
 * Focus event emitted when a widget gains or loses focus.
 */
export interface FocusEvent {
    /** Widget ID that is gaining or losing focus */
    targetId: string;
    /** Type of focus event */
    type: 'focus' | 'blur';
}

/**
 * Map of all event types to their data shapes.
 */
export interface EventMap {
    'key': KeyEvent;
    'mouse': MouseEvent;
    'resize': ResizeEvent;
    'focus': FocusEvent;
    'blur': FocusEvent;
    'render': void;
    'mount': void;
    'unmount': void;
    'tick': number; // delta ms
}
