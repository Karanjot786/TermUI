// Form — compound input container with validation
import { Widget } from '@termuijs/widgets';
import { type Style, type Screen, type KeyEvent, mergeStyles, defaultStyle, styleToCellAttrs } from '@termuijs/core';
import { validateInput, type InputValidator } from './validation.js';

export interface FormField {
    name: string; label: string; type: 'text' | 'select' | 'checkbox';
    placeholder?: string; required?: boolean; options?: string[];
    validate?: InputValidator;
}
export interface FormOptions {
    labelColor?: Style['fg']; errorColor?: Style['fg']; activeColor?: Style['fg'];
    onSubmit?: (values: Record<string, string>) => void;
}

export class Form extends Widget {
    private _fields: FormField[];
    private _values: Map<string, string> = new Map();
    private _errors: Map<string, string> = new Map();
    private _activeField = 0;
    private _cursorPos = 0;
    private _labelColor: Style['fg'];
    private _errorColor: Style['fg'];
    private _activeColor: Style['fg'];
    private _onSubmit?: (values: Record<string, string>) => void;
    focusable = true;

    constructor(fields: FormField[], options: FormOptions = {}) {
        super(mergeStyles(defaultStyle(), { height: fields.length * 2 + 1, flexGrow: 1 }));
        this._fields = fields;
        this._labelColor = options.labelColor ?? { type: 'named', name: 'cyan' };
        this._errorColor = options.errorColor ?? { type: 'named', name: 'red' };
        this._activeColor = options.activeColor ?? { type: 'named', name: 'cyan' };
        this._onSubmit = options.onSubmit;
        for (const f of fields) this._values.set(f.name, '');
        // Wire key events from the App/event system into this widget's handlers.
        // Minimal: only route printable chars and backspace to existing methods.
        this.events.on('key', (event: KeyEvent) => this.handleKey(event));
    }

    get values(): Record<string, string> { const r: Record<string, string> = {}; for (const [k, v] of this._values) r[k] = v; return r; }
    nextField(): void { if (this._activeField < this._fields.length) { this._activeField++; this._cursorPos = 0; this.markDirty(); } }
    prevField(): void { if (this._activeField > 0) { this._activeField--; this._cursorPos = (this._values.get(this._fields[this._activeField].name) ?? '').length; this.markDirty(); } }
    insertChar(ch: string): void {
        if (this._activeField >= this._fields.length) return;
        const f = this._fields[this._activeField]; const cur = this._values.get(f.name) ?? '';
        this._values.set(f.name, cur.slice(0, this._cursorPos) + ch + cur.slice(this._cursorPos));
        this._cursorPos++; this._errors.delete(f.name); this.markDirty();
    }
    deleteBack(): void {
        if (this._activeField >= this._fields.length) return;
        const f = this._fields[this._activeField]; const cur = this._values.get(f.name) ?? '';
        if (this._cursorPos > 0) { this._values.set(f.name, cur.slice(0, this._cursorPos - 1) + cur.slice(this._cursorPos)); this._cursorPos--; this.markDirty(); }
    }
    submit(): void {
        this._errors.clear(); let hasErr = false;
        for (const f of this._fields) {
            const v = this._values.get(f.name) ?? '';
            if (f.required && !v.trim()) { this._errors.set(f.name, `${f.label} is required`); hasErr = true; }
            const e = validateInput(f.validate, v);
            if (e) {
                this._errors.set(f.name, e);
                hasErr = true;}
        }
        if (!hasErr) this._onSubmit?.(this.values);
        this.markDirty();
    }

    /** Minimal key router — printable chars -> insertChar, backspace -> deleteBack */
    handleKey(event: KeyEvent): void {
        if (event.key === 'backspace') {
            this.deleteBack();
            return;
        }

        if (event.key && event.key.length === 1 && !event.ctrl && !event.alt) {
            this.insertChar(event.key);
        }
    }

    protected _renderSelf(screen: Screen): void {
        const { x, y, width, height } = this._rect;
        if (width <= 0 || height <= 0) return;
        const attrs = styleToCellAttrs(this.style);
        let row = 0;
        for (let i = 0; i < this._fields.length && row < height - 1; i++) {
            const f = this._fields[i]; const active = i === this._activeField;
            const val = this._values.get(f.name) ?? ''; const err = this._errors.get(f.name);
            screen.writeString(x, y + row, `${f.label}${f.required ? ' *' : ''}:`.slice(0, width), { ...attrs, fg: err ? this._errorColor : this._labelColor, bold: active }); row++;
            if (row >= height) break;
            const display = val || (f.placeholder ?? '');
            const msg = err ? `  - ${err}` : '';
            const displayText = `${active ? '❯ ' : '  '}${display}${msg}`;
            screen.writeString(x, y + row, displayText.slice(0, width), { ...attrs, fg: active ? this._activeColor : attrs.fg, dim: !val && !!f.placeholder }); row++;
        }
        if (row < height) {
            const isSub = this._activeField >= this._fields.length;
            screen.writeString(x, y + row, isSub ? '  [ Submit ]' : '    Submit  ', { ...attrs, fg: isSub ? { type: 'named', name: 'green' } : attrs.fg, bold: isSub });
        }
    }
}
