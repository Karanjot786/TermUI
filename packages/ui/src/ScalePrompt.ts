import { Widget } from '@termuijs/widgets';
import { type Color, type Style, type Screen, type KeyEvent, mergeStyles, defaultStyle, styleToCellAttrs } from '@termuijs/core';

export interface ScalePromptOptions {
    max?: number;
    question?: string;
    endLabels?: [string, string];
    activeColor?: Color;
    onSelect?: (value: number) => void;
}

export class ScalePrompt extends Widget {
    private _max: number;
    private _value: number;
    private _question?: string;
    private _endLabels?: [string, string];
    private _activeColor: Color;
    private _onSelect?: (value: number) => void;

    focusable = true;

    constructor(style?: Partial<Style>, opts: ScalePromptOptions = {}) {
        super(mergeStyles(defaultStyle(), { height: 3, flexGrow: 1, ...style }));

        this._max = Math.max(1, Math.floor(opts.max ?? 5));
        this._value = 1;
        this._question = opts.question;
        this._endLabels = opts.endLabels;
        this._activeColor = opts.activeColor ?? { type: 'named', name: 'cyan' };
        this._onSelect = opts.onSelect;
    }

    getValue(): number {
        return this._value;
    }

    private _setValue(value: number): void {
        const nextValue = Math.max(1, Math.min(this._max, value));

        if (nextValue === this._value) return;

        this._value = nextValue;
        this.markDirty();
    }

    handleKey(event: KeyEvent): void {
        switch (event.key) {
            case 'left':
                this._setValue(this._value - 1);
                break;

            case 'right':
                this._setValue(this._value + 1);
                break;

            case 'enter':
                this._onSelect?.(this._value);
                break;
        }
    }

    protected _renderSelf(screen: Screen): void {
        const { x, y, width, height } = this._rect;

        if (width <= 0 || height <= 0) return;

        const attrs = styleToCellAttrs(this.style);
        let row = 0;

        if (this._question) {
            screen.writeString(x, y + row, this._question.slice(0, width), attrs);
            row++;
        }

        if (row < height) {
            const numbers: string[] = [];

            for (let i = 1; i <= this._max; i++) {
                numbers.push(i === this._value ? `[${i}]` : String(i));
            }

            screen.writeString(
                x,
                y + row,
                numbers.join(' ').slice(0, width),
                { ...attrs, fg: this._activeColor }
            );
            row++;
        }

        if (row < height && this._endLabels) {
            const [leftLabel, rightLabel] = this._endLabels;
            const leftText = leftLabel.slice(0, width);
            const rightText = rightLabel.slice(0, width);
            const rightX = x + Math.max(0, width - rightText.length);

            screen.writeString(x, y + row, leftText, attrs);
            screen.writeString(rightX, y + row, rightText, attrs);
        }
    }
}
