// LinearPrompt — screen-reader-friendly linear prompt rendering
import { Widget } from '@termuijs/widgets';
import { type Style, type Screen, type KeyEvent, mergeStyles, defaultStyle, styleToCellAttrs } from '@termuijs/core';

export interface LinearPromptOption {
    label: string;
    value: string;
    disabled?: boolean;
}

export interface LinearPromptOptions {
    question: string;
    activeColor?: Style['fg'];
    onSelect?: (option: LinearPromptOption, index: number) => void;
}

export class LinearPrompt extends Widget {
    private _options: LinearPromptOption[];
    private _selectedIndex = 0;
    private _question: string;
    private _activeColor: Style['fg'];
    private _onSelect?: (option: LinearPromptOption, index: number) => void;
    focusable = true;

    constructor(options: LinearPromptOption[], config: LinearPromptOptions) {
        super(mergeStyles(defaultStyle(), { height: options.length + 2 }));
        this._options = options;
        this._question = config.question;
        this._activeColor = config.activeColor ?? { type: 'named', name: 'cyan' };
        this._onSelect = config.onSelect;
    }

    get selectedOption(): LinearPromptOption | undefined {
        return this._options[this._selectedIndex];
    }

    get selectedIndex(): number {
        return this._selectedIndex;
    }

    selectNext(): void {
        let n = this._selectedIndex + 1;
        while (n < this._options.length && this._options[n].disabled) n++;
        if (n < this._options.length) {
            this._selectedIndex = n;
            this.markDirty();
        }
    }

    selectPrev(): void {
        let n = this._selectedIndex - 1;
        while (n >= 0 && this._options[n].disabled) n--;
        if (n >= 0) {
            this._selectedIndex = n;
            this.markDirty();
        }
    }

    confirm(): void {
        const opt = this._options[this._selectedIndex];
        if (opt && !opt.disabled) {
            this._onSelect?.(opt, this._selectedIndex);
            this.markDirty();
        }
    }

    handleKey(event: KeyEvent): void {
        switch (event.key) {
            case 'down':
                this.selectNext();
                break;

            case 'up':
                this.selectPrev();
                break;

            case 'enter':
                this.confirm();
                break;

            case 'tab':
                this.selectNext();
                break;

            case 'shift+tab':
                // Note: shift+tab is not directly supported in most terminals,
                // but we handle it for completeness if the platform provides it
                this.selectPrev();
                break;
        }
    }

    protected _renderSelf(screen: Screen): void {
        const { x, y, width } = this._rect;
        if (width <= 0) return;

        const attrs = styleToCellAttrs(this.style);
        let currentY = y;

        // Render question
        screen.writeString(x, currentY, this._question.slice(0, width), attrs);
        currentY++;

        // Render options sequentially without positioning codes
        for (let i = 0; i < this._options.length; i++) {
            const opt = this._options[i];
            const isSel = i === this._selectedIndex;
            const marker = isSel ? '> ' : '  ';
            const label = opt.label.slice(0, width - 2);

            screen.writeString(
                x,
                currentY,
                marker + label,
                {
                    ...attrs,
                    fg: opt.disabled
                        ? { type: 'named', name: 'brightBlack' }
                        : isSel
                        ? this._activeColor
                        : attrs.fg,
                    bold: isSel,
                    dim: opt.disabled,
                }
            );

            currentY++;
        }
    }
}
