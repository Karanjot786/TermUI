// ─────────────────────────────────────────────────────
// @termuijs/ui — TagInput widget
//
// A text input that tokenizes typed entries into removable
// chips (tags).
// - Typing characters appends to the pending draft text
// - enter commits the draft as a chip and clears the draft
// - backspace on an empty draft removes the last chip
// - Committed chips render as bracketed tokens before the
//   draft text
// ─────────────────────────────────────────────────────

import { Widget } from '@termuijs/widgets';
import { type Style, type Screen, type KeyEvent, mergeStyles, defaultStyle, styleToCellAttrs, stringWidth, truncate, caps, splitGraphemes } from '@termuijs/core';

export interface TagInputOptions {
    placeholder?: string;
    defaultTags?: string[];
    onChange?: (tags: string[]) => void;
}

export class TagInput extends Widget {
    private _tags: string[] = [];
    private _draft = '';
    private _placeholder: string;
    private _onChange?: (tags: string[]) => void;

    focusable = true;

    constructor(
        style: Partial<Style> = {},
        options: TagInputOptions = {},
    ) {
        super(mergeStyles(defaultStyle(), { border: 'single', height: 3, ...style }));
        this._placeholder = options.placeholder ?? '';
        if (options.defaultTags) {
            this._tags = [...options.defaultTags];
        }
        this._onChange = options.onChange;
    }

    /** The current list of committed tags. */
    get tags(): string[] {
        return [...this._tags];
    }

    /** Add a tag to the list. Empty/whitespace-only strings are ignored. */
    addTag(tag: string): void {
        const trimmed = tag.trim();
        if (trimmed.length === 0) return;
        this._tags.push(trimmed);
        this._onChange?.(this.tags);
        this.markDirty();
    }

    /** Remove the last tag from the list. No-op if the list is empty. */
    removeLast(): void {
        if (this._tags.length === 0) return;
        this._tags.pop();
        this._onChange?.(this.tags);
        this.markDirty();
    }

    /**
     * Handle key events. Call this from your input loop.
     */
    handleKey(event: KeyEvent): void {
        switch (event.key) {
            case 'return':
            case 'enter':
                if (this._draft.trim().length > 0) {
                    this.addTag(this._draft);
                    this._draft = '';
                    this.markDirty();
                }
                break;

            case 'backspace':
                if (this._draft.length > 0) {
                    this._draft = splitGraphemes(this._draft).slice(0, -1).join('');
                    this.markDirty();
                } else {
                    this.removeLast();
                }
                break;

            default:
                if (event.key && event.key.length === 1 && !event.ctrl && !event.alt) {
                    this._draft += event.key;
                    this.markDirty();
                }
        }
    }

    /** Format a single chip token using caps.unicode for glyph choice. */
    private _formatChip(tag: string): string {
        if (caps.unicode) {
            return ` \u2039${tag}\u203a `;
        }
        return ` [${tag}] `;
    }

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width, height } = rect;
        if (width <= 0 || height <= 0) return;

        const attrs = styleToCellAttrs(this._style);

        // Show placeholder when empty
        if (this._tags.length === 0 && this._draft.length === 0) {
            screen.writeString(x, y, truncate(this._placeholder, width), { ...attrs, dim: true });
            return;
        }

        // Build the display string: chips followed by draft
        let display = '';
        for (const tag of this._tags) {
            display += this._formatChip(tag);
        }
        display += this._draft;

        // Handle horizontal scrolling if content exceeds width
        const displayWidth = stringWidth(display);
        const visibleWidth = width;
        let scrollCols = 0;
        if (displayWidth > visibleWidth) {
            scrollCols = displayWidth - visibleWidth;
        }

        // Width-aware slice: iterate graphemes and accumulate until
        // we have skipped scrollCols columns and collected visibleWidth columns.
        const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
        let skipped = 0;
        let accumulated = 0;
        let visibleText = '';
        for (const { segment } of segmenter.segment(display)) {
            const w = stringWidth(segment);
            if (skipped < scrollCols) {
                skipped += w;
                continue;
            }
            if (accumulated + w > visibleWidth) break;
            visibleText += segment;
            accumulated += w;
        }

        screen.writeString(x, y, visibleText, attrs);

        // Show cursor at draft position when focused
        if (this.isFocused) {
            const cursorPos = x + displayWidth - scrollCols;
            if (cursorPos >= x && cursorPos < x + width) {
                screen.setCell(cursorPos, y, {
                    char: ' ',
                    ...attrs,
                    inverse: true,
                });
            }
        }
    }
}
