// ─────────────────────────────────────────────────────
// @termuijs/core — Mouse event parser (SGR mode)
// ─────────────────────────────────────────────────────

import type { MouseEvent, MouseButton, MouseEventType } from '../events/types.js';

/**
 * Parse an SGR mouse event escape sequence.
 *
 * SGR format: ESC [ < Cb ; Cx ; Cy M  (button press)
 *             ESC [ < Cb ; Cx ; Cy m  (button release)
 *
 * Where Cb encodes the button and modifiers, Cx/Cy are 1-based coordinates.
 *
 * @returns Parsed MouseEvent or null if not a mouse sequence.
 */
export function parseMouseEvent(data: string): MouseEvent | null {
    // SGR mouse: \x1b[<Cb;Cx;Cy[Mm]
    const match = data.match(/^\x1b\[<(\d+);(\d+);(\d+)([Mm])$/);
    if (!match) return null;

    const cb = parseInt(match[1], 10);
    const cx = parseInt(match[2], 10) - 1; // Convert to 0-based
    const cy = parseInt(match[3], 10) - 1;
    const isRelease = match[4] === 'm';

    let button: MouseButton;
    let type: MouseEventType;
    let scrollDelta: number | undefined;

    // Decode button from low 2 bits
    const buttonBits = cb & 0b11;
    const motion = (cb & 0b100000) !== 0;
    const isScroll = (cb & 0b1000000) !== 0;

    const shift = (cb & 0b100)   !== 0;
    const alt   = (cb & 0b1000)  !== 0;
    const ctrl  = (cb & 0b10000) !== 0;

    if (isScroll) {
        button = 'none';
        type = 'scroll';
        scrollDelta = buttonBits === 0 ? -1 : 1; // 0 = scroll up, 1 = scroll down
    } else if (motion) {
        type = 'mousemove';
        button = decodeButton(buttonBits);
    } else if (isRelease) {
        type = 'mouseup';
        button = decodeButton(buttonBits);
    } else {
        type = 'mousedown';
        button = decodeButton(buttonBits);
    }

    return {
        x: cx,
        y: cy,
        button,
        type,
        scrollDelta,
        shift,   
        alt,     
        ctrl,
    };
}

function decodeButton(bits: number): MouseButton {
    switch (bits) {
        case 0: return 'left';
        case 1: return 'middle';
        case 2: return 'right';
        default: return 'none';
    }
}

/**
 * Check if a string looks like it could be a mouse sequence.
 */
export function isMouseSequence(data: string): boolean {
    return data.startsWith('\x1b[<');
}
