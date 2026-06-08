// ─────────────────────────────────────────────────────
// @termuijs/widgets — ShortcutBar widget
// ─────────────────────────────────────────────────────

import {
    type Screen,
    type Style,
    type KeyEvent,
    styleToCellAttrs,
    mergeStyles,
    stringWidth,
    truncate,
} from '@termuijs/core';
import { Widget } from '../base/Widget.js';

/**
 * Represents an individual shortcut item in the shortcut bar.
 */
export interface ShortcutItem {
    /** Keyboard key character/name (e.g. 'F1', 'q', 'ctrl+c') */
    key: string;
    /** Labeled explanation (e.g. 'Help', 'Quit') */
    label: string;
    /** Optional callback triggered on matching key press */
    action?: () => void;
}

/**
 * Options to configure styling and behavior of the ShortcutBar.
 */
export interface ShortcutBarOptions {
    /** Custom styles for the key (e.g., fg/bg colors). Default: cyan, bold */
    keyStyle?: Partial<Style>;
    /** Custom styles for the label text. Default: white */
    labelStyle?: Partial<Style>;
    /** Horizontal separator string. Default: '   ' (three spaces) */
    separator?: string;
}

/**
 * ShortcutBar — a horizontal footer bar that displays quick key bindings.
 * Matches design aesthetics of classic terminal tools (like nano, htop).
 */
export class ShortcutBar extends Widget {
    private _items: ShortcutItem[];
    private _keyStyle: Partial<Style>;
    private _labelStyle: Partial<Style>;
    private _separator: string;

    /**
     * Creates an instance of ShortcutBar.
     * @param items Initial list of shortcut items.
     * @param style Partial widget style object.
     * @param opts Custom options for key styling, label styling, and separator.
     */
    constructor(
        items: ShortcutItem[] = [],
        style: Partial<Style> = {},
        opts: ShortcutBarOptions = {},
    ) {
        super(style);
        this._items = items;
        this._keyStyle = opts.keyStyle ?? { fg: { type: 'named', name: 'cyan' }, bold: true };
        this._labelStyle = opts.labelStyle ?? { fg: { type: 'named', name: 'white' } };
        this._separator = opts.separator ?? '   ';
        this.focusable = false; // Usually not focused; key events are delegated or run globally
    }

    /**
     * Sets or replaces the current list of shortcut items.
     * @param items The new list of shortcut items.
     */
    setItems(items: ShortcutItem[]): void {
        this._items = items;
        this.markDirty();
    }

    /**
     * Retrieves the current list of shortcut items.
     * @returns The list of shortcut items.
     */
    getItems(): ShortcutItem[] {
        return this._items;
    }

    /**
     * Updates the horizontal separator string printed between shortcut segments.
     * @param separator The new separator string.
     */
    setSeparator(separator: string): void {
        this._separator = separator;
        this.markDirty();
    }

    /**
     * Retrieves the current horizontal separator string.
     * @returns The separator string.
     */
    getSeparator(): string {
        return this._separator;
    }

    /**
     * Updates the custom styles applied to keys and label segments.
     * @param keyStyle Partial styling to apply to keys.
     * @param labelStyle Partial styling to apply to labels.
     */
    setStyles(keyStyle?: Partial<Style>, labelStyle?: Partial<Style>): void {
        if (keyStyle) this._keyStyle = keyStyle;
        if (labelStyle) this._labelStyle = labelStyle;
        this.markDirty();
    }

    /**
     * Handles keyboard keypress events. Triggers the action callback of the
     * shortcut item matching the pressed key (case-insensitively).
     * @param event The key event triggered by the user.
     */
    handleKey(event: KeyEvent): void {
        const matchingItem = this._items.find(
            item => item.key.toLowerCase() === event.key.toLowerCase(),
        );
        if (matchingItem && matchingItem.action) {
            matchingItem.action();
        }
    }


    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width, height } = rect;
        if (width <= 0 || height <= 0) return;

        const baseAttrs = styleToCellAttrs(this._style);
        const keyAttrs = styleToCellAttrs(mergeStyles(this._style, this._keyStyle));
        const labelAttrs = styleToCellAttrs(mergeStyles(this._style, this._labelStyle));

        let currentX = x;
        const separatorWidth = stringWidth(this._separator);

        for (let i = 0; i < this._items.length; i++) {
            const item = this._items[i];

            const keyText = `[${item.key}]`;
            const labelText = item.label;

            const keyLen = stringWidth(keyText);
            const labelLen = stringWidth(labelText);

            // Write separator if this is not the first item
            if (i > 0) {
                if (currentX + separatorWidth > x + width) break;
                screen.writeString(currentX, y, this._separator, baseAttrs);
                currentX += separatorWidth;
            }

            // Render key indicator (e.g. "[F1]")
            if (currentX + keyLen > x + width) break;
            screen.writeString(currentX, y, keyText, keyAttrs);
            currentX += keyLen;

            // Render label text (e.g. " Help")
            if (labelText) {
                if (currentX + 1 + labelLen > x + width) {
                    const spaceLeft = x + width - currentX - 1;
                    if (spaceLeft > 0) {
                        screen.writeString(currentX, y, ' ', baseAttrs);
                        currentX += 1;
                        const truncatedLabel = truncate(labelText, spaceLeft);
                        screen.writeString(currentX, y, truncatedLabel, labelAttrs);
                        currentX += stringWidth(truncatedLabel);
                    }
                    break;
                } else {
                    screen.writeString(currentX, y, ' ' + labelText, labelAttrs);
                    currentX += 1 + labelLen;
                }
            }
        }
    }
}
