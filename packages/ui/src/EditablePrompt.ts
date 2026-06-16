import { Widget } from '@termuijs/widgets';
import {
    type Screen,
    type KeyEvent,
    mergeStyles,
    defaultStyle,
    styleToCellAttrs,
    caps,
} from '@termuijs/core';

export interface EditablePromptChoice {
    type: 'checkbox' | 'text';
    name: string;
    message: string;
    initial?: string;
    disabled?: boolean;
}

export interface EditablePromptResult {
    selected: string[];
    values: Record<string, string>;
}

export interface EditablePromptOptions {
    message?: string;
    choices: EditablePromptChoice[];
    onChange?: (result: EditablePromptResult) => void;
}

export class EditablePrompt extends Widget {
    private _message: string;
    private _choices: EditablePromptChoice[];
    private _checkedNames: Set<string>;
    private _textValues: Record<string, string>;
    private _focusedIndex = 0;
    private _editingIndex = -1;
    private _editingValue = '';
    private _onChange?: (result: EditablePromptResult) => void;

    focusable = true;

    constructor(options: EditablePromptOptions) {
        super(
            mergeStyles(defaultStyle(), {
                height: Math.max(options.choices.length + (options.message ? 1 : 0), 1),
            })
        );

        this._message = options.message ?? '';
        this._choices = options.choices;
        this._onChange = options.onChange;

        // Initialize checked items and text values
        this._checkedNames = new Set();
        this._textValues = {};

        for (const choice of this._choices) {
            if (choice.type === 'text' && choice.initial !== undefined) {
                this._textValues[choice.name] = choice.initial;
            }
        }
    }

    get result(): EditablePromptResult {
        return {
            selected: this._choices
                .filter(choice => choice.type === 'checkbox' && this._checkedNames.has(choice.name))
                .map(choice => choice.name),
            values: { ...this._textValues }, // shallow copy to prevent external mutation
        };
    }

    private emitChange(): void {
        this._onChange?.(this.result);
    }

    selectNext(): void {
        if (this._editingIndex >= 0) return; // Don't navigate while editing

        if (this._focusedIndex < this._choices.length - 1) {
            this._focusedIndex++;
            this.markDirty();
        }
    }

    selectPrev(): void {
        if (this._editingIndex >= 0) return; // Don't navigate while editing

        if (this._focusedIndex > 0) {
            this._focusedIndex--;
            this.markDirty();
        }
    }

    toggleCheckbox(): void {
        const choice = this._choices[this._focusedIndex];
        if (!choice || choice.type !== 'checkbox' || choice.disabled) return;

        if (this._checkedNames.has(choice.name)) {
            this._checkedNames.delete(choice.name);
        } else {
            this._checkedNames.add(choice.name);
        }

        this.emitChange();
        this.markDirty();
    }

    enterEditMode(): void {
        const choice = this._choices[this._focusedIndex];
        if (!choice || choice.type !== 'text' || choice.disabled) return;

        this._editingIndex = this._focusedIndex;
        this._editingValue = this._textValues[choice.name] ?? choice.initial ?? '';
        this.markDirty();
    }

    submitEdit(): void {
        if (this._editingIndex < 0) return;

        const choice = this._choices[this._editingIndex];
        if (choice) {
            this._textValues[choice.name] = this._editingValue;
            this.emitChange();
        }

        this._editingIndex = -1;
        this._editingValue = '';
        this.markDirty();
    }

    cancelEdit(): void {
        this._editingIndex = -1;
        this._editingValue = '';
        this.markDirty();
    }

    handleKey(event: KeyEvent): void {
        // Handle editing keys
        if (this._editingIndex >= 0) {
            switch (event.key) {
                case 'enter':
                    this.submitEdit();
                    break;

                case 'escape':
                    this.cancelEdit();
                    break;

                case 'backspace':
                    if (this._editingValue.length > 0) {
                        this._editingValue = this._editingValue.slice(0, -1);
                        this.markDirty();
                    }
                    break;

                default:
                    // Handle regular character input (single printable character without modifiers)
                    if (
                        event.key &&
                        event.key.length === 1 &&
                        !event.ctrl &&
                        !event.alt
                    ) {
                        this._editingValue += event.key;
                        this.markDirty();
                    }
                    break;
            }
            return;
        }

        // Handle navigation and selection keys
        switch (event.key) {
            case 'up':
                this.selectPrev();
                break;

            case 'down':
                this.selectNext();
                break;

            case 'space':
                this.toggleCheckbox();
                break;

            case 'enter':
                this.enterEditMode();
                break;
        }
    }

    protected _renderSelf(screen: Screen): void {
        const { x, y, width, height } = this._rect;

        if (width <= 0 || height <= 0) return;

        const attrs = styleToCellAttrs(this.style);
        let line = 0;

        // Render message if provided
        if (this._message) {
            screen.writeString(x, y + line, this._message.slice(0, width), {
                ...attrs,
                bold: true,
            });
            line++;
        }

        // Render each choice
        for (let i = 0; i < this._choices.length && line < height; i++) {
            const choice = this._choices[i];
            const isFocused = i === this._focusedIndex;
            const isEditing = i === this._editingIndex;

            let text = '';

            if (choice.type === 'checkbox') {
                const checked = this._checkedNames.has(choice.name);
                const prefix = isFocused ? (caps.unicode ? '❯ ' : '> ') : '  ';
                const checkbox = checked ? '[x]' : '[ ]';
                text = `${prefix}${checkbox} ${choice.message}`;
            } else {
                // Text field
                const prefix = isFocused ? (caps.unicode ? '❯ ' : '> ') : '  ';
                const label = choice.message;
                const value = isEditing ? this._editingValue : (this._textValues[choice.name] ?? choice.initial ?? '');
                const displayValue = isEditing ? value + '_' : `"${value}"`;
                text = `${prefix}${label}: ${displayValue}`;
            }

            screen.writeString(x, y + line, text.slice(0, width), {
                ...attrs,
                bold: isFocused || isEditing,
                fg: choice.disabled ? { type: 'named', name: 'brightBlack' } : attrs.fg,
                dim: choice.disabled,
            });

            line++;
        }
    }
}