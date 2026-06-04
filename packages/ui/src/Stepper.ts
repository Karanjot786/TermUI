import { Widget } from '@termuijs/widgets';
import { type Style, type Screen, mergeStyles, defaultStyle, styleToCellAttrs, caps } from '@termuijs/core';

export interface StepperOptions {
    completedColor?: Style['fg'];
    activeColor?: Style['fg'];
    pendingColor?: Style['fg'];
    connectorChar?: string;
}

export class Stepper extends Widget {
    private _labels: string[];
    private _activeStep: number = 0;
    private _completedColor: Style['fg'];
    private _activeColor: Style['fg'];
    private _pendingColor: Style['fg'];
    private _connectorChar: string;

    constructor(labels: string[], style?: Partial<Style>, opts?: StepperOptions) {
        super(mergeStyles(defaultStyle(), style ?? {}));
        this._labels = labels;
        this._completedColor = opts?.completedColor ?? { type: 'named', name: 'green' };
        this._activeColor = opts?.activeColor ?? { type: 'named', name: 'yellow' };
        this._pendingColor = opts?.pendingColor ?? { type: 'named', name: 'brightBlack' };
        this._connectorChar = opts?.connectorChar ?? (caps.unicode ? '─' : '-');
    }

    get activeStep(): number { return this._activeStep; }

    setActiveStep(index: number): void {
        if (index >= 0 && index < this._labels.length) {
            this._activeStep = index;
            this.markDirty();
        }
    }

    protected _renderSelf(screen: Screen): void {
        const { x, y, width, height } = this._rect;
        if (width <= 0 || height <= 0) return;

        const attrs = styleToCellAttrs(this.style);
        let col = x;

        for (let i = 0; i < this._labels.length; i++) {
            const label = this._labels[i];
            let stepText: string;
            let color: Style['fg'];

            if (i < this._activeStep) {
                // Completed step - show checkmark
                const checkmark = caps.unicode ? '✓' : 'v';
                stepText = `${checkmark} ${label}`;
                color = this._completedColor;
            } else if (i === this._activeStep) {
                // Active step
                stepText = `${i + 1} ${label}`;
                color = this._activeColor;
            } else {
                // Pending step
                stepText = `${i + 1} ${label}`;
                color = this._pendingColor;
            }

            const isActive = i === this._activeStep;
            screen.writeString(col, y, stepText, {
                ...attrs,
                fg: color,
                bold: isActive,
                dim: !isActive && i > this._activeStep,
            });

            col += stepText.length;

            // Add connector between steps (not after the last one)
            if (i < this._labels.length - 1) {
                screen.writeString(col, y, this._connectorChar, { ...attrs, dim: true });
                col++;
            }
        }
    }
}
