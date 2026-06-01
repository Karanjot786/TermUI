// ─────────────────────────────────────────────────────
// @termuijs/ui — Wizard widget
//
// A multi-step form flow wizard.
// ─────────────────────────────────────────────────────

import { Widget } from '@termuijs/widgets';
import {
    type Style,
    type Screen,
    type KeyEvent,
    mergeStyles,
    defaultStyle,
    normalizeEdges,
    styleToCellAttrs,
    truncate,
} from '@termuijs/core';

export interface WizardStep {
    title: string;
    render: () => Widget;
    validate?: () => boolean | string;
}

export interface WizardOptions {
    style?: Partial<Style>;
    onComplete?: (stepData: unknown[]) => void;
}

export class Wizard extends Widget {
    private _steps: WizardStep[];
    private _stepWidgets: Widget[];
    private _currentStepIndex = 0;
    private _error = '';
    private _onComplete?: (stepData: unknown[]) => void;
    focusable = true;

    constructor(steps: WizardStep[], options: WizardOptions = {}) {
        const topPadding = 2;
        const userPadding = normalizeEdges(options.style?.padding);
        const style = mergeStyles(defaultStyle(), {
            flexDirection: 'column',
            flexGrow: 1,
            ...options.style,
            padding: {
                top: topPadding,
                right: userPadding.right,
                bottom: userPadding.bottom,
                left: userPadding.left,
            },
        });
        super(style);
        this._steps = steps;
        this._onComplete = options.onComplete;

        // Instantiate all step widgets so widget state persists while navigating
        this._stepWidgets = steps.map((s) => s.render());

        // Keep only the active widget attached as a child
        if (this._stepWidgets[0]) {
            this.addChild(this._stepWidgets[0]);
        }

        // Register default key listener
        this.events.on('key', (event) => this.handleKey(event));
    }

    get currentStepIndex(): number {
        return this._currentStepIndex;
    }

    get error(): string {
        return this._error;
    }

    get stepWidgets(): ReadonlyArray<Widget> {
        return this._stepWidgets;
    }

    nextStep(): void {
        const step = this._steps[this._currentStepIndex];
        if (step && step.validate) {
            const validationResult = step.validate();
            if (typeof validationResult === 'string') {
                this._error = validationResult;
                this.markDirty();
                return;
            } else if (validationResult === false) {
                // block silently
                this.markDirty();
                return;
            }
        }

        // Validation passed
        this._error = '';
        if (this._currentStepIndex < this._steps.length - 1) {
            this._showStep(this._currentStepIndex + 1);
        }
    }

    prevStep(): void {
        this._error = '';
        if (this._currentStepIndex > 0) {
            this._showStep(this._currentStepIndex - 1);
        }
    }

    complete(): void {
        this._onComplete?.(this._getStepData());
    }

    private _showStep(index: number): void {
        const currentWidget = this._stepWidgets[this._currentStepIndex];
        if (currentWidget) {
            this.removeChild(currentWidget);
        }
        this._currentStepIndex = index;
        const nextWidget = this._stepWidgets[index];
        if (nextWidget) {
            this.addChild(nextWidget);
        }
        this.markDirty();
    }

    private _getStepData(): unknown[] {
        return this._stepWidgets.map((widget) => {
            if ('value' in widget) {
                return (widget as { value: unknown }).value;
            }
            if ('values' in widget) {
                return (widget as { values: unknown }).values;
            }
            if ('numericValue' in widget) {
                return (widget as { numericValue: unknown }).numericValue;
            }
            if ('selectedOption' in widget) {
                return (widget as { selectedOption: unknown }).selectedOption;
            }
            if ('selectedOptions' in widget) {
                return (widget as { selectedOptions: unknown }).selectedOptions;
            }
            return undefined;
        });
    }

    handleKey(event: KeyEvent): void {
        if (event._propagationStopped || event._defaultPrevented) return;

        // Bypassing letters if an input widget is focused within the active step
        const isFocusInInput = (widget: Widget): boolean => {
            if (widget.isFocused && ('insertChar' in widget || 'value' in widget)) {
                return true;
            }
            for (const child of widget.children) {
                if (isFocusInInput(child)) return true;
            }
            return false;
        };

        const activeWidget = this._stepWidgets[this._currentStepIndex];
        const inputFocused = activeWidget ? isFocusInInput(activeWidget) : false;

        switch (event.key) {
            case 'right':
                if (!inputFocused) {
                    this.nextStep();
                    event.stopPropagation?.();
                }
                break;
            case 'n':
                if (!event.ctrl && !event.alt && !inputFocused) {
                    this.nextStep();
                    event.stopPropagation?.();
                }
                break;
            case 'left':
                if (!inputFocused) {
                    this.prevStep();
                    event.stopPropagation?.();
                }
                break;
            case 'b':
                if (!event.ctrl && !event.alt && !inputFocused) {
                    this.prevStep();
                    event.stopPropagation?.();
                }
                break;
            case 'enter':
            case 'return':
                if (this._currentStepIndex === this._steps.length - 1) {
                    this.complete();
                    event.stopPropagation?.();
                }
                break;
        }
    }

    protected _renderSelf(screen: Screen): void {
        const { x, y, width, height } = this._rect;
        if (width <= 0 || height <= 0) return;

        const attrs = styleToCellAttrs(this.style);
        const border = this._style.border && this._style.border !== 'none' ? 1 : 0;

        const step = this._steps[this._currentStepIndex];
        if (!step) return;

        const stepNum = this._currentStepIndex + 1;
        const total = this._steps.length;
        const indicatorText = `Step ${stepNum} of ${total}: ${step.title}`;
        const contentWidth = Math.max(0, width - border * 2);

        // Write the step indicator on row 0 of the content area
        screen.writeString(
            x + border,
            y + border,
            truncate(indicatorText, contentWidth),
            { ...attrs, bold: true }
        );

        // Write validation error if present on row 1 of the content area
        if (this._error) {
            screen.writeString(
                x + border,
                y + border + 1,
                truncate(this._error, contentWidth),
                { ...attrs, fg: { type: 'named', name: 'red' } }
            );
        } else {
            // Write blank line to clear any old error
            screen.writeString(
                x + border,
                y + border + 1,
                ' '.repeat(contentWidth),
                attrs
            );
        }
    }
}
