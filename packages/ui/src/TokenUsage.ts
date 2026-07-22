import { Widget } from '@termuijs/widgets';
import {
    type Style,
    type Screen,
    mergeStyles,
    defaultStyle,
    styleToCellAttrs,
    truncate,
} from '@termuijs/core';

export interface TokenUsageOptions {
    style?: Partial<Style>;
    inputTokens?: number;
    outputTokens?: number;
}

export class TokenUsage extends Widget {
    private _inputTokens: number;
    private _outputTokens: number;

    constructor(options: TokenUsageOptions = {}) {
        const style = mergeStyles(defaultStyle(), {
            height: 1,
            ...options.style,
        });
        super(style);
        this._inputTokens = options.inputTokens ?? 0;
        this._outputTokens = options.outputTokens ?? 0;
    }

    get inputTokens(): number {
        return this._inputTokens;
    }

    get outputTokens(): number {
        return this._outputTokens;
    }

    setUsage(input: number, output: number): void {
        this._inputTokens = input;
        this._outputTokens = output;
        this.markDirty();
    }

    setInputTokens(input: number): void {
        this._inputTokens = input;
        this.markDirty();
    }

    setOutputTokens(output: number): void {
        this._outputTokens = output;
        this.markDirty();
    }

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width, height } = rect;
        if (width <= 0 || height <= 0) return;

        const attrs = styleToCellAttrs(this.style);
        const text = `Tokens: in: ${this._inputTokens} | out: ${this._outputTokens}`;
        screen.writeString(x, y, truncate(text, width), attrs);
    }
}
