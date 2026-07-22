// ─────────────────────────────────────────────────────
// @termuijs/ui — KeyboardShortcuts display widget
//
// Renders a grid of keyboard shortcut bindings.
// Groups by category if provided.
//
// Layout (2-column):
//   [key]  description       [key]  description
// ─────────────────────────────────────────────────────

import { Widget } from '@termuijs/widgets';
import { type Style, type Screen, styleToCellAttrs, caps } from '@termuijs/core';

export interface ShortcutBinding {
    key: string;
    description: string;
    category?: string;
}

export interface KeyboardShortcutsOptions {
    /** Color for the key label boxes */
    keyColor?: Style['fg'];
    /** Color for category headings */
    categoryColor?: Style['fg'];
    /** Number of columns (default 2) */
    columns?: number;
    /** Show category headings (default true) */
    showCategories?: boolean;
}

/** A group of bindings belonging to the same category. */
interface BindingGroup {
    category: string | undefined;
    bindings: ShortcutBinding[];
}

export class KeyboardShortcuts extends Widget {
    private _bindings: ShortcutBinding[];
    private _keyColor: Style['fg'];
    private _categoryColor: Style['fg'];
    private _columns: number;
    private _showCategories: boolean;

    constructor(bindings: ShortcutBinding[], options: KeyboardShortcutsOptions = {}) {
        super({});
        this._bindings = bindings;
        this._keyColor = options.keyColor ?? { type: 'named', name: 'cyan' };
        this._categoryColor = options.categoryColor ?? { type: 'named', name: 'yellow' };
        this._columns = Math.max(1, options.columns ?? 2);
        this._showCategories = options.showCategories ?? true;
    }

    /** Replace all bindings and trigger a re-render. */
    setBindings(bindings: ShortcutBinding[]): void {
        this._bindings = bindings;
        this.markDirty();
    }

    /** Group bindings by category, preserving insertion order. */
    private _groupBindings(): BindingGroup[] {
        const groups: BindingGroup[] = [];
        const indexMap = new Map<string, number>();

        for (const b of this._bindings) {
            const cat = b.category ?? '';
            const key = cat;
            if (!indexMap.has(key)) {
                indexMap.set(key, groups.length);
                groups.push({ category: b.category, bindings: [] });
            }
            groups[indexMap.get(key)!].bindings.push(b);
        }
        return groups;
    }

    /**
     * Render a key label in a bordered box style:
     *   ┌─────┐
     *   │ key │
     *   └─────┘
     *
     * We fit it on one line: [ key ] — box drawing characters or ASCII fallback.
     */
    private _renderKeyLabel(screen: Screen, kx: number, ky: number, key: string, attrs: ReturnType<typeof styleToCellAttrs>): number {
        const label = `[${key}]`;
        screen.writeString(kx, ky, label, { ...attrs, fg: this._keyColor, bold: true });
        return label.length;
    }

    protected _renderSelf(screen: Screen): void {
        const { x, y, width, height } = this._rect;
        if (width <= 0 || height <= 0) return;

        const attrs = styleToCellAttrs(this._style);
        const groups = this._groupBindings();

        let row = y;
        const colWidth = Math.floor(width / this._columns);

        for (const group of groups) {
            if (row >= y + height) break;

            // Category heading
            if (this._showCategories && group.category) {
                const heading = group.category.toUpperCase();
                const divider = caps.unicode ? '─' : '-';
                const line = heading + ' ' + divider.repeat(Math.max(0, width - heading.length - 1));
                screen.writeString(x, row, line.slice(0, width), {
                    ...attrs,
                    fg: this._categoryColor,
                    bold: true,
                });
                row++;
                if (row >= y + height) break;
            }

            // Render bindings in a grid of _columns
            for (let i = 0; i < group.bindings.length; i += this._columns) {
                if (row >= y + height) break;

                for (let col = 0; col < this._columns; col++) {
                    const binding = group.bindings[i + col];
                    if (!binding) continue;

                    const cx = x + col * colWidth;
                    const availWidth = colWidth - 1; // 1 char gap between columns

                    if (availWidth <= 0) continue;

                    // Render key label
                    const labelLen = this._renderKeyLabel(screen, cx, row, binding.key, attrs);

                    // Render description after the label (with a space gap)
                    const descX = cx + labelLen + 1;
                    const descWidth = availWidth - labelLen - 1;
                    if (descWidth > 0) {
                        const desc = binding.description.slice(0, descWidth);
                        screen.writeString(descX, row, desc, attrs);
                    }
                }
                row++;
            }

            // Blank line between groups
            if (this._showCategories && group.category) {
                row++;
            }
        }
    }
}
