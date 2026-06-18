// ─────────────────────────────────────────────────────
// Theme Engine — resolves variables, matches selectors
// ─────────────────────────────────────────────────────

import { tokenize } from './tokenizer.js';
import { parse, type TSSStylesheet, type TSSRule, type TSSSelector, type TSSValue } from './parser.js';
import { type Style, type Color, type BorderStyle, parseColor } from '@termuijs/core';
import { evalCalc } from './calc.js';
import { matchesPseudo } from './pseudo.js';
import { extractKeyframes, type KeyframesDeclaration } from './animations.js';

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
    private _themeVariables: ThemeVariables = {};
    private _overrides: ThemeVariables = {};
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
        const merged: TSSStylesheet = { themes: [], rules: [], mixins: new Map(), keyframes: [] };
        for (const src of sources) {
            const tokens = tokenize(src);
            const ast = parse(tokens);
            merged.themes.push(...ast.themes);
            merged.rules.push(...ast.rules);
            merged.keyframes.push(...ast.keyframes);
            for (const [name, props] of ast.mixins) {
                merged.mixins.set(name, props);
            }
        }
        this._stylesheet = merged;
        this._applyTheme();
    }

    /** Switch active theme */
    setTheme(name: string): void {
        this._activeTheme = name;
        this._overrides = {}; // clear overrides only when explicitly changing theme
        this._applyTheme();
    }

    get activeTheme(): string { return this._activeTheme; }
    get variables(): ThemeVariables { return { ...this._variables }; }
    get rules(): ResolvedRule[] { return this._resolvedRules; }

    /** Get list of available theme names */
    get availableThemes(): string[] {
        return this._stylesheet?.themes.map(t => t.name) ?? [];
    }

    /** Get parsed @keyframes declarations from the loaded stylesheet */
    getKeyframes(): KeyframesDeclaration[] {
        return this._stylesheet ? extractKeyframes(this._stylesheet) : [];
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

    /** Override a theme variable at runtime and re-resolve rules */
    setVariable(name: string, value: string): void {
        this._overrides[name] = value;
        this._rebuildVariablesAndRules();
    }

    /** Remove a runtime override, falling back to the theme value */
    clearVariable(name: string): void {
        delete this._overrides[name];
        this._rebuildVariablesAndRules();
    }

    // ── Internal ──

    private _applyTheme(): void {
        if (!this._stylesheet) return;
        // Find active theme and merge variables
        this._themeVariables = {};
        // Default theme first
        const defaultTheme = this._stylesheet.themes.find(t => t.name === 'default');
        if (defaultTheme) Object.assign(this._themeVariables, defaultTheme.variables);
        // Then active theme on top
        if (this._activeTheme !== 'default') {
            const active = this._stylesheet.themes.find(t => t.name === this._activeTheme);
            if (active) Object.assign(this._themeVariables, active.variables);
        }

        this._rebuildVariablesAndRules();
    }

    private _rebuildVariablesAndRules(): void {
        this._variables = { ...this._themeVariables, ...this._overrides };

        // Resolve top-level rules — expand mixin includes at compile time.
        // NOTE: ThemeEngine's selector matching is flat. Rules nested inside another rule
        // in the TSS source are silently ignored here. Only top-level rules are resolved.
        this._resolvedRules = this._stylesheet?.rules.map(rule => ({
            selector: rule.selector,
            properties: this._resolveProperties(rule),
        })) ?? [];

        for (const fn of this._listeners) fn();
    }

    private _resolveProperties(rule: TSSRule): Record<string, string> {
        const result: Record<string, string> = {};
        // Expand included mixins first
        for (const mixinName of rule.includes) {
            const mixinProps = this._stylesheet?.mixins.get(mixinName);
            if (mixinProps) {
                for (const prop of mixinProps) {
                    result[prop.name] = this._resolveValue(prop.value);
                }
            }
        }
        // Own properties applied on top — override mixin properties if same name
        for (const prop of rule.properties) {
            result[prop.name] = this._resolveValue(prop.value);
        }
        return result;
    }

    private _resolveValue(value: TSSValue, _visited: Set<string> = new Set()): string {
        switch (value.kind) {
            case 'var': {
                if (_visited.has(value.name)) return ''; // circular guard
                const rawValue = this._variables[value.name];
                if (!rawValue) return '';
                _visited.add(value.name);
                // If stored value is itself a var() reference, resolve recursively
                const varMatch = rawValue.match(/^var\(--([^)]+)\)$/);
                if (varMatch) {
                    return this._resolveValue({ kind: 'var', name: varMatch[1] }, _visited);
                }
                return rawValue;
            }
            case 'color': return value.value;
            case 'number': return String(value.value);
            case 'literal': {
                if (value.value.startsWith('calc(') && value.value.endsWith(')')) {
                    return String(evalCalc(value.value, this._variables));
                }
                return value.value;
            }
        }
    }

    private _matchesSelector(sel: TSSSelector, widgetType: string, className?: string, pseudo?: string): boolean {
        // Widget type match (* = universal)
        if (sel.widget !== '*' && sel.widget.toLowerCase() !== widgetType.toLowerCase()) return false;
        // Class name match
        if (sel.className && sel.className !== className) return false;
        if (!matchesPseudo(sel.pseudo, pseudo)) return false;
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
                    style.borderColor = this._parseColor(val);
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

/** Compile a TSS source string and return resolved rules with mixins expanded */
export function compileRules(source: string): ResolvedRule[] {
    const engine = new ThemeEngine();
    engine.load(source);
    return engine.rules;
}