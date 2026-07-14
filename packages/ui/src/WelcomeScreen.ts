// ─────────────────────────────────────────────────────
// @termuijs/ui — WelcomeScreen
// Splash/welcome screen composing BigText + subtitle + keymap
// ─────────────────────────────────────────────────────

import {
    type Screen,
    type Style,
    styleToCellAttrs,
    truncate,
    stringWidth,
    mergeStyles,
    defaultStyle,
} from '@termuijs/core';
import { BigText, Widget } from '@termuijs/widgets';

export interface KeymapHint {
    key: string;
    action: string;
}

export interface WelcomeScreenOptions {
    title: string;
    subtitle?: string;
    tagline?: string;
    keymap?: KeymapHint[];
    style?: Partial<Style>;
}

export class WelcomeScreen extends Widget {
    private _subtitle: string;
    private _tagline: string;
    private _keymap: KeymapHint[];
    private _bigText: BigText;

    constructor(options: WelcomeScreenOptions) {
        super(mergeStyles(defaultStyle(), { flexGrow: 1, ...options.style }));
        this._subtitle = options.subtitle ?? '';
        this._tagline  = options.tagline  ?? '';
        this._keymap   = options.keymap   ?? [];
        this._bigText  = new BigText(options.title);
    }

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width, height } = rect;
        if (width <= 0 || height <= 0) return;

        const attrs = styleToCellAttrs(this._style);
        let row = y;

        // ── BigText title ──────────────────────────────
        const bigHeight = Math.min(5, height - 2);
        this._bigText.updateRect({ x, y: row, width, height: bigHeight });
        this._bigText.render(screen);
        row += bigHeight + 1;

        if (row >= y + height) return;

        // ── Subtitle ───────────────────────────────────
        if (this._subtitle) {
            const sub = truncate(this._subtitle, width);
            const subX = x + Math.max(0, Math.floor((width - stringWidth(sub)) / 2));
            screen.writeString(subX, row, sub, { ...attrs, bold: true });
            row++;
        }

        // ── Tagline ────────────────────────────────────
        if (this._tagline && row < y + height) {
            const tag = truncate(this._tagline, width);
            const tagX = x + Math.max(0, Math.floor((width - stringWidth(tag)) / 2));
            screen.writeString(tagX, row, tag, { ...attrs, dim: true });
            row++;
        }

        // ── Keymap at bottom ───────────────────────────
        if (this._keymap.length > 0) {
            const keymapRow = y + height - 1;
            if (keymapRow > row) {
                const parts = this._keymap.map(({ key, action }) => `[${key}] ${action}`);
                const hint = parts.join('  ');
                const hintX = x + Math.max(0, Math.floor((width - stringWidth(hint)) / 2));
                screen.writeString(hintX, keymapRow, hint, { ...attrs, dim: true });
            }
        }
    }
}
