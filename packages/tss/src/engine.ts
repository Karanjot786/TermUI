// ─────────────────────────────────────────────────────
// Theme Engine — resolves variables, matches selectors
// ─────────────────────────────────────────────────────

import { tokenize } from './tokenizer.js';
import { parse, type TSSStylesheet, type TSSRule, type TSSSelector, type TSSValue } from './parser.js';
import { type Style, type Color, type BorderStyle, parseColor } from '@termuijs/core';

export function compile(source: string): string {
    const tokens = tokenize(source);
    const ast = parse(tokens);
    let output: string[] = [];

    function serializeSelector(sel: TSSSelector): string {
        let s = sel.widget === '*' ? '' : sel.widget;
        if (sel.className) s += '.' + sel.className;
        if (sel.pseudo) s += ':' + sel.pseudo;
        return s || '*';
    }

    function processRule(rule: TSSRule, parentSelStr: string) {
        const selStr = serializeSelector(rule.selector);
        const fullSelStr = parentSelStr ? `${parentSelStr} ${selStr}` : selStr;
        
        if (rule.properties.length > 0) {
            let block = `${fullSelStr} {`;
            for (const prop of rule.properties) {
                let valStr = '';
                if (prop.value.kind === 'var') valStr = `var(${prop.value.name})`;
                else valStr = String(prop.value.value);
                block += ` ${prop.name}: ${valStr};`;
            }
            block += ` }`;
            output.push(block);
        }

        if (rule.nested) {
            for (const child of rule.nested) {
                processRule(child, fullSelStr);
            }
        }
    }

    for (const rule of ast.rules) {
        processRule(rule, '');
    }

    return output.join('\n');
}

export interface ThemeVariables {
    [key: string]: string;
}

export interface ResolvedRule {
    selector: TSSSelector;
    properties: Record<string, string>;
}

export class ThemeEngine {
    private _stylesheet: TSSStylesheet | null = null;
    private _activeTheme: string = 'default';
    private _variables: ThemeVariables = {};
    private _resolvedRules: ResolvedRule[] = [];
    private _listeners: Set<() => void> = new Set();

    /** Load and parse a .tss source string */
    load(source: string): void {
        const tokens = tokenize(source);
        this._stylesheet = parse(tokens);
        this._applyTheme();
    }

    /** Load multiple .tss sources (merged) */
    loadAll(sources: string[]): void {
        const merged: TSSStylesheet = { themes: [], rules: [] };
        for (const src of sources) {
            const tokens = tokenize(src);
            const ast = parse(tokens);
            merged.themes.push(...ast.themes);
            merged.rules.push(...ast.rules);
        }
        this._stylesheet = merged;
        this._applyTheme();
    }

    /** Switch active theme */
    setTheme(name: string): void {
        this._activeTheme = name;
        this._applyTheme();
    }

    get activeTheme(): string { return this._activeTheme; }
    get variables(): ThemeVariables { return { ...this._variables }; }
    get rules(): ResolvedRule[] { return this._resolvedRules; }

    /** Get list of available theme names */
    get availableThemes(): string[] {
        return this._stylesheet?.themes.map(t => t.name) ?? [];
    }

    /** Subscribe to theme changes */
    onChange(fn: () => void): () => void {
        this._listeners.add(fn);
        return () => this._listeners.delete(fn);
    }

    /** Resolve a style for a given widget type + optional class + state */
    resolveStyle(widgetType: string, className?: string, pseudo?: string): Partial<Style> {
        const style: Partial<Style> = {};
        for (const rule of this._resolvedRules) {
            if (!this._matchesSelector(rule.selector, widgetType, className, pseudo)) continue;
            this._applyProperties(rule.properties, style);
        }
        return style;
    }

    /** Get a variable value (resolved) */
    getVariable(name: string): string | undefined {
        return this._variables[name];
    }

    // ── Internal ──

    private _applyTheme(): void {
        if (!this._stylesheet) return;
        // Find active theme and merge variables
        this._variables = {};
        // Default theme first
        const defaultTheme = this._stylesheet.themes.find(t => t.name === 'default');
        if (defaultTheme) Object.assign(this._variables, defaultTheme.variables);
        // Then active theme on top
        if (this._activeTheme !== 'default') {
            const active = this._stylesheet.themes.find(t => t.name === this._activeTheme);
            if (active) Object.assign(this._variables, active.variables);
        }
        // Resolve top-level rules only.
        // Nested rules (rule.nested) are supported by the parser and compile()
        // but ThemeEngine's selector matching is flat and does not support
        // descendant combinators. Nested rules are intentionally skipped here
        // to avoid silently applying child selectors at the wrong scope.
        this._resolvedRules = this._stylesheet.rules.map(rule => ({
            selector: rule.selector,
            properties: this._resolveProperties(rule),
        }));

        // Notify listeners
        for (const fn of this._listeners) fn();
    }

    private _resolveProperties(rule: TSSRule): Record<string, string> {
        const result: Record<string, string> = {};
        for (const prop of rule.properties) {
            result[prop.name] = this._resolveValue(prop.value);
        }
        return result;
    }

    private _resolveValue(value: TSSValue): string {
        switch (value.kind) {
            case 'var': {
                const resolved = this._variables[value.name];
                return resolved ?? '';
            }
            case 'color': return value.value;
            case 'number': return String(value.value);
            case 'literal': return value.value;
        }
    }

    private _matchesSelector(sel: TSSSelector, widgetType: string, className?: string, pseudo?: string): boolean {
        // Widget type match (* = universal)
        if (sel.widget !== '*' && sel.widget.toLowerCase() !== widgetType.toLowerCase()) return false;
        // Class name match
        if (sel.className && sel.className !== className) return false;
        // Pseudo-class match
        if (sel.pseudo && sel.pseudo !== pseudo) return false;
        return true;
    }

    private _applyProperties(props: Record<string, string>, style: Partial<Style>): void {
        for (const [key, val] of Object.entries(props)) {
            switch (key) {
                case 'color':
                case 'fg':
                    style.fg = this._parseColor(val);
                    break;
                case 'background':
                case 'bg':
                    style.bg = this._parseColor(val);
                    break;
                case 'border':
                    style.border = val as BorderStyle;
                    break;
                case 'border-color':
                    // Border color applied via fg on border chars
                    style.fg = this._parseColor(val);
                    break;
                case 'bold':
                    style.bold = val === 'true';
                    break;
                case 'dim':
                    style.dim = val === 'true';
                    break;
                case 'italic':
                    style.italic = val === 'true';
                    break;
                case 'underline':
                    style.underline = val === 'true';
                    break;
                case 'padding':
                    const parts = val.split(/\s+/).map(Number);
                    if (parts.length === 1) style.padding = parts[0];
                    else if (parts.length === 2) style.padding = { top: parts[0], bottom: parts[0], left: parts[1], right: parts[1] };
                    else if (parts.length === 4) style.padding = { top: parts[0], right: parts[1], bottom: parts[2], left: parts[3] };
                    break;
                case 'margin':
                    const mparts = val.split(/\s+/).map(Number);
                    if (mparts.length === 1) style.margin = mparts[0];
                    else if (mparts.length === 2) style.margin = { top: mparts[0], bottom: mparts[0], left: mparts[1], right: mparts[1] };
                    else if (mparts.length === 4) style.margin = { top: mparts[0], right: mparts[1], bottom: mparts[2], left: mparts[3] };
                    break;
                case 'width':
                    style.width = parseInt(val);
                    break;
                case 'height':
                    style.height = parseInt(val);
                    break;
                case 'flex-grow':
                    style.flexGrow = parseFloat(val);
                    break;
            }
        }
    }

    private _parseColor(val: string): Color | undefined {
        try {
            const color = parseColor(val);
            return color.type === 'none' ? undefined : color;
        } catch {
            return undefined;
        }
    }
}
