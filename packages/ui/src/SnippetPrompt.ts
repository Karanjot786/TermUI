// SnippetPrompt — parse template placeholders and manage prompt values
import { Widget } from '@termuijs/widgets';
import { type Screen, mergeStyles, defaultStyle } from '@termuijs/core';

export interface SnippetPromptOptions {
    validate?: Record<string, (value: string) => string | null>;
}

export class SnippetPrompt extends Widget {
    private _placeholders: string[];
    private _values: Map<string, string>;
    private _errors: Map<string, string> = new Map();
    private _validators: Map<string, (value: string) => string | null>;
    private _activeIndex = 0;

    constructor(template: string, options: SnippetPromptOptions = {}) {
        super(mergeStyles(defaultStyle(), { height: 1 }));
        this._placeholders = this._parsePlaceholders(template);
        this._values = new Map(this._placeholders.map((key) => [key, '']));
        this._validators = new Map(Object.entries(options.validate ?? {}));
        this.template = template;
    }

    readonly template: string;

    get placeholders(): string[] {
        return [...this._placeholders];
    }

    get activeField(): string | undefined {
        return this._placeholders[this._activeIndex];
    }

    get values(): Record<string, string> {
        const record: Record<string, string> = {};
        for (const [key, value] of this._values) record[key] = value;
        return record;
    }

    get errors(): Record<string, string> {
        const record: Record<string, string> = {};
        for (const [key, value] of this._errors) record[key] = value;
        return record;
    }

    setValue(field: string, value: string): void {
        if (!this._values.has(field)) return;
        this._values.set(field, value);
        this._errors.delete(field);
        this.markDirty();
    }

    nextField(): void {
        if (this._activeIndex < this._placeholders.length - 1) {
            this._activeIndex++;
            this.markDirty();
        }
    }

    prevField(): void {
        if (this._activeIndex > 0) {
            this._activeIndex--;
            this.markDirty();
        }
    }

    validate(): boolean {
        this._errors.clear();

        for (const field of this._placeholders) {
            const validator = this._validators.get(field);
            if (!validator) continue;
            const value = this._values.get(field) ?? '';
            const error = validator(value);
            if (error) {
                this._errors.set(field, error);
            }
        }

        this.markDirty();
        return this._errors.size === 0;
    }

    buildResult(): string {
        return this.template.replace(/{{\s*([^}]+?)\s*}}/g, (_match, name) => {
            return this._values.get(name) ?? '';
        });
    }

    protected _renderSelf(_screen: Screen): void {
        // Container only
    }

    private _parsePlaceholders(template: string): string[] {
        const placeholders: string[] = [];
        const seen = new Set<string>();
        const matcher = /{{\s*([^}]+?)\s*}}/g;
        let match: RegExpExecArray | null;

        while ((match = matcher.exec(template)) !== null) {
            const key = match[1].trim();
            if (!seen.has(key)) {
                seen.add(key);
                placeholders.push(key);
            }
        }

        return placeholders;
    }
}
