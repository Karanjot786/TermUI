// ─────────────────────────────────────────────────────
// TSS Parser — Parses tokens into AST
// ─────────────────────────────────────────────────────

import { type Token, TokenType } from './tokenizer.js';

// ── AST Node Types ──

export interface TSSStylesheet {
    themes: TSSTheme[];
    rules: TSSRule[];
    mixins: Map<string, TSSProperty[]>;
    keyframes: TSSKeyframes[];
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
    includes: string[];
    nested?: TSSRule[];
}

export interface TSSAnimationFrame {
    /** Percentage string, e.g. '0%', '50%', '100%' */
    offset: string;
    /** Property declarations at this keyframe */
    properties: TSSProperty[];
}

export interface TSSKeyframes {
    name: string;
    frames: TSSAnimationFrame[];
}

// ── Parser ──

export function parse(tokens: Token[]): TSSStylesheet {
    let pos = 0;
    const stylesheet: TSSStylesheet = { themes: [], rules: [], mixins: new Map(), keyframes: [] };

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
        } else if (peek().type === TokenType.AtMixin) {
            const { name, properties } = parseMixin();
            stylesheet.mixins.set(name, properties);
        } else if (peek().type === TokenType.AtKeyframes) {
            stylesheet.keyframes.push(parseKeyframes());
        } else if (peek().type === TokenType.Ident || peek().type === TokenType.Dot || peek().type === TokenType.PseudoClass) {
            stylesheet.rules.push(parseRule());
        } else {
            advance();
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

    function parseMixin(): { name: string; properties: TSSProperty[] } {
        expect(TokenType.AtMixin);
        const name = expect(TokenType.Ident).value;
        expect(TokenType.LBrace);
        const properties: TSSProperty[] = [];
        while (peek().type !== TokenType.RBrace && peek().type !== TokenType.EOF) {
            if (peek().type === TokenType.Ident && tokens[pos + 1]?.type === TokenType.Colon) {
                const propName = advance().value;
                advance(); // skip Colon
                const value = parseValue();
                properties.push({ name: propName, value });
                if (peek().type === TokenType.Semicolon) advance();
            } else {
                advance();
            }
        }
        expect(TokenType.RBrace);
        return { name, properties };
    }

    function parseKeyframes(): TSSKeyframes {
        expect(TokenType.AtKeyframes);
        const name = expect(TokenType.Ident).value;
        expect(TokenType.LBrace);
        const frames: TSSAnimationFrame[] = [];
        while (peek().type !== TokenType.RBrace && peek().type !== TokenType.EOF) {
            const offsetNum = expect(TokenType.Number).value;
            expect(TokenType.Percent);
            const offset = offsetNum + '%';
            expect(TokenType.LBrace);
            const properties: TSSProperty[] = [];
            while (peek().type !== TokenType.RBrace && peek().type !== TokenType.EOF) {
                if (peek().type === TokenType.Ident && tokens[pos + 1]?.type === TokenType.Colon) {
                    const propName = advance().value;
                    advance(); // skip Colon
                    const value = parseValue();
                    properties.push({ name: propName, value });
                    if (peek().type === TokenType.Semicolon) advance();
                } else {
                    advance();
                }
            }
            expect(TokenType.RBrace);
            frames.push({ offset, properties });
        }

        expect(TokenType.RBrace);
        return { name, frames };
    }

    function parseRule(): TSSRule {
        const selector = parseSelector();
        expect(TokenType.LBrace);
        const properties: TSSProperty[] = [];
        const includes: string[] = [];
        const nested: TSSRule[] = [];
        while (peek().type !== TokenType.RBrace && peek().type !== TokenType.EOF) {
            if (peek().type === TokenType.AtInclude) {
                advance(); // consume @include
                const mixinName = expect(TokenType.Ident).value;
                includes.push(mixinName);
                if (peek().type === TokenType.Semicolon) advance();
            } else if (peek().type === TokenType.Ident && tokens[pos + 1]?.type === TokenType.Colon) {
                // property: value
                const propName = advance().value;
                expect(TokenType.Colon);
                const value = parseValue();
                properties.push({ name: propName, value });
                if (peek().type === TokenType.Semicolon) advance();
            } else if (peek().type === TokenType.Ident || peek().type === TokenType.Dot || peek().type === TokenType.PseudoClass) {
                nested.push(parseRule());
            } else {
                advance();
            }
        }
        expect(TokenType.RBrace);
        return { selector, properties, includes, nested: nested.length > 0 ? nested : undefined };
    }

    function parseSelector(): TSSSelector {
        // Pseudo-only selector: :hover { }
        if (peek().type === TokenType.PseudoClass) {
            const pseudo = advance().value;
            return { widget: '*', pseudo };
        }
        // Class-only selector: .className { }
        if (peek().type === TokenType.Dot) {
            advance();
            const className = expect(TokenType.Ident).value;
            let pseudo: string | undefined;
            if (peek().type === TokenType.PseudoClass) {
                pseudo = advance().value;
            }
            return { widget: '*', className, pseudo };
        }
        const widget = expect(TokenType.Ident).value;
        let className: string | undefined;
        let pseudo: string | undefined;

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
        const valueTokens: Token[] = [];
        while (peek().type !== TokenType.Semicolon && peek().type !== TokenType.RBrace && peek().type !== TokenType.EOF) {
            valueTokens.push(advance());
        }

        if (valueTokens.length === 1) {
            const t = valueTokens[0];
            if (t.type === TokenType.Var) {
                return { kind: 'var', name: t.value };
            }
            if (t.type === TokenType.Color) {
                return { kind: 'color', value: t.value };
            }
            if (t.type === TokenType.Number) {
                return { kind: 'number', value: parseFloat(t.value) };
            }
            if (t.type === TokenType.String || t.type === TokenType.Ident) {
                return { kind: 'literal', value: t.value };
            }
        }

        return {
            kind: 'literal',
            value: valueTokens.map(tokenToRawValue).join(' ').trim(),
        };
    }

    function tokenToRawValue(token: Token): string {
        switch (token.type) {
            case TokenType.Color:
            case TokenType.Ident:
            case TokenType.Number:
            case TokenType.String:
            case TokenType.Var:
            case TokenType.Variable:
            case TokenType.Percent:
                return token.value;
            case TokenType.Colon:
                return ':';
            case TokenType.Comma:
                return ',';
            case TokenType.Dot:
                return '.';
            default:
                return token.value;
        }
    }

    function parseRawValue(): string {
        let val = '';
        while (peek().type !== TokenType.Semicolon && peek().type !== TokenType.RBrace && peek().type !== TokenType.EOF) {
            val += advance().value;
        }
        return val.trim();
    }
}
