// ─────────────────────────────────────────────────────
// TSS Parser — Parses tokens into AST
// ─────────────────────────────────────────────────────

import { type Token, TokenType } from './tokenizer.js';

// ── AST Node Types ──

export interface TSSStylesheet {
    themes: TSSTheme[];
    rules: TSSRule[];
}

export interface TSSTheme {
    name: string;
    variables: Record<string, string>;
}

export interface TSSSelector {
    widget: string;          // e.g., "Gauge", "Table", "*"
    className?: string;      // e.g., ".dashboard"
    pseudo?: string;         // e.g., "focused", "active"
}

export interface TSSProperty {
    name: string;
    value: TSSValue;
}

export type TSSValue =
    | { kind: 'literal'; value: string }
    | { kind: 'number'; value: number }
    | { kind: 'color'; value: string }
    | { kind: 'var'; name: string };

export interface TSSRule {
    selector: TSSSelector;
    properties: TSSProperty[];
    nested?: TSSRule[];
}

// ── Parser ──

export function parse(tokens: Token[]): TSSStylesheet {
    let pos = 0;
    const stylesheet: TSSStylesheet = { themes: [], rules: [] };

    const peek = () => tokens[pos] ?? { type: TokenType.EOF, value: '', line: 0, col: 0 };
    const advance = () => tokens[pos++];
    const expect = (type: TokenType) => {
        const t = advance();
        if (t.type !== type) throw new Error(`TSS Parse Error: expected ${type}, got ${t.type} "${t.value}" at line ${t.line}:${t.col}`);
        return t;
    };

    while (peek().type !== TokenType.EOF) {
        if (peek().type === TokenType.AtTheme) {
            stylesheet.themes.push(parseTheme());
        } else if (peek().type === TokenType.Ident || peek().type === TokenType.Dot || peek().type === TokenType.PseudoClass) {
            stylesheet.rules.push(parseRule());
        } else {
            advance(); // skip unknown
        }
    }

    return stylesheet;

    function parseTheme(): TSSTheme {
        expect(TokenType.AtTheme);
        const name = expect(TokenType.Ident).value;
        expect(TokenType.LBrace);
        const variables: Record<string, string> = {};
        while (peek().type !== TokenType.RBrace && peek().type !== TokenType.EOF) {
            if (peek().type === TokenType.Variable) {
                const varName = advance().value;
                expect(TokenType.Colon);
                const val = parseRawValue();
                variables[varName] = val;
                if (peek().type === TokenType.Semicolon) advance();
            } else {
                advance();
            }
        }
        expect(TokenType.RBrace);
        return { name, variables };
    }

    function parseRule(): TSSRule {
        const selector = parseSelector();
        expect(TokenType.LBrace);
        const properties: TSSProperty[] = [];
        const nested: TSSRule[] = [];
        while (peek().type !== TokenType.RBrace && peek().type !== TokenType.EOF) {
            if (peek().type === TokenType.Ident && tokens[pos + 1]?.type === TokenType.Colon) {
                const propName = advance().value;
                advance(); // skip Colon
                const value = parseValue();
                properties.push({ name: propName, value });
                if (peek().type === TokenType.Semicolon) advance();
            } else if (peek().type === TokenType.Ident || peek().type === TokenType.Dot || peek().type === TokenType.PseudoClass) {
                nested.push(parseRule());
            } else {
                advance(); // skip unknown
            }
        }
        expect(TokenType.RBrace);
        return { selector, properties, nested: nested.length > 0 ? nested : undefined };
    }

    function parseSelector(): TSSSelector {
        let widget = '*';
        let className: string | undefined;
        let pseudo: string | undefined;

        if (peek().type === TokenType.Ident) {
            widget = advance().value;
        }

        if (peek().type === TokenType.Dot) {
            advance();
            className = expect(TokenType.Ident).value;
        }
        if (peek().type === TokenType.PseudoClass) {
            pseudo = advance().value;
        }
        return { widget, className, pseudo };
    }

    function parseValue(): TSSValue {
        const t = peek();
        if (t.type === TokenType.Var) {
            advance();
            return { kind: 'var', name: t.value };
        }
        if (t.type === TokenType.Color) {
            advance();
            return { kind: 'color', value: t.value };
        }
        if (t.type === TokenType.Number) {
            advance();
            return { kind: 'number', value: parseFloat(t.value) };
        }
        if (t.type === TokenType.String) {
            advance();
            return { kind: 'literal', value: t.value };
        }
        if (t.type === TokenType.Ident) {
            advance();
            return { kind: 'literal', value: t.value };
        }
        advance();
        return { kind: 'literal', value: t.value };
    }

    function parseRawValue(): string {
        let val = '';
        while (peek().type !== TokenType.Semicolon && peek().type !== TokenType.RBrace && peek().type !== TokenType.EOF) {
            val += advance().value;
        }
        return val.trim();
    }
}
