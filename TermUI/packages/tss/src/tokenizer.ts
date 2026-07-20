// ─────────────────────────────────────────────────────
// TSS Tokenizer — Lexes .tss files into tokens
// ─────────────────────────────────────────────────────

export enum TokenType {
    // Structure
    AtTheme = 'AT_THEME',
    AtMixin = 'AT_MIXIN',      // @mixin
    AtInclude = 'AT_INCLUDE',  // @include
    LBrace = 'LBRACE',
    RBrace = 'RBRACE',
    Colon = 'COLON',
    Semicolon = 'SEMICOLON',
    Dot = 'DOT',
    Comma = 'COMMA',

    // Values
    Ident = 'IDENT',
    String = 'STRING',
    Number = 'NUMBER',
    Color = 'COLOR',           // #rrggbb or #rgb
    Var = 'VAR',               // var(--name)
    Variable = 'VARIABLE',     // --name

    // Pseudo-selectors
    PseudoClass = 'PSEUDO',    // :focused, :hover, :active

    // Misc
    Comment = 'COMMENT',
    EOF = 'EOF',
}

export interface Token {
    type: TokenType;
    value: string;
    line: number;
    col: number;
}

export function tokenize(source: string): Token[] {
    const tokens: Token[] = [];
    let pos = 0;
    let line = 1;
    let col = 1;

    const peek = () => pos < source.length ? source[pos] : '\0';
    const advance = () => { const ch = source[pos++]; if (ch === '\n') { line++; col = 1; } else { col++; } return ch; };
    const at = (i: number) => i < source.length ? source[i] : '\0';

    while (pos < source.length) {
        const ch = peek();

        // Whitespace
        if (/\s/.test(ch)) { advance(); continue; }

        // Comments: /* ... */ or // ...
        if (ch === '/' && at(pos + 1) === '*') {
            const startLine = line, startCol = col;
            let comment = '';
            advance(); advance(); // skip /*
            while (pos < source.length && !(peek() === '*' && at(pos + 1) === '/')) {
                comment += advance();
            }
            if (pos < source.length) { advance(); advance(); } // skip */
            tokens.push({ type: TokenType.Comment, value: comment.trim(), line: startLine, col: startCol });
            continue;
        }
        if (ch === '/' && at(pos + 1) === '/') {
            const startLine = line, startCol = col;
            let comment = '';
            advance(); advance(); // skip //
            while (pos < source.length && peek() !== '\n') comment += advance();
            tokens.push({ type: TokenType.Comment, value: comment.trim(), line: startLine, col: startCol });
            continue;
        }

        // Symbols
        if (ch === '{') { tokens.push({ type: TokenType.LBrace, value: '{', line, col }); advance(); continue; }
        if (ch === '}') { tokens.push({ type: TokenType.RBrace, value: '}', line, col }); advance(); continue; }
        if (ch === ':') {
            if (/[a-zA-Z]/.test(at(pos + 1))) {
                const startCol = col;
                advance();
                let pseudo = '';
                while (pos < source.length && /[a-zA-Z-]/.test(peek())) pseudo += advance();
                tokens.push({ type: TokenType.PseudoClass, value: pseudo, line, col: startCol });
                continue;
            }
            tokens.push({ type: TokenType.Colon, value: ':', line, col }); advance(); continue;
        }
        if (ch === ';') { tokens.push({ type: TokenType.Semicolon, value: ';', line, col }); advance(); continue; }
        if (ch === '.') { tokens.push({ type: TokenType.Dot, value: '.', line, col }); advance(); continue; }
        if (ch === ',') { tokens.push({ type: TokenType.Comma, value: ',', line, col }); advance(); continue; }

        // @ directives: @theme, @mixin, @include
        if (ch === '@') {
            const startCol = col;
            advance();
            let word = '';
            while (pos < source.length && /[a-zA-Z]/.test(peek())) word += advance();
            if (word === 'theme') {
                tokens.push({ type: TokenType.AtTheme, value: '@theme', line, col: startCol });
            } else if (word === 'mixin') {
                tokens.push({ type: TokenType.AtMixin, value: '@mixin', line, col: startCol });
            } else if (word === 'include') {
                tokens.push({ type: TokenType.AtInclude, value: '@include', line, col: startCol });
            } else {
                tokens.push({ type: TokenType.Ident, value: '@' + word, line, col: startCol });
            }
            continue;
        }

        // Colors: #rrggbb or #rgb
        if (ch === '#') {
            const startCol = col;
            advance();
            let hex = '';
            while (pos < source.length && /[0-9a-fA-F]/.test(peek())) hex += advance();
            tokens.push({ type: TokenType.Color, value: '#' + hex, line, col: startCol });
            continue;
        }

        // Strings
        if (ch === '"' || ch === "'") {
            const quote = ch;
            const startCol = col;
            advance();
            let str = '';
            while (pos < source.length && peek() !== quote) {
                if (peek() === '\\') { advance(); str += advance(); }
                else str += advance();
            }
            if (pos < source.length) advance();
            tokens.push({ type: TokenType.String, value: str, line, col: startCol });
            continue;
        }

        // Numbers
        if (/[0-9]/.test(ch)) {
            const startCol = col;
            let num = '';
            while (pos < source.length && /[0-9.]/.test(peek())) num += advance();
            tokens.push({ type: TokenType.Number, value: num, line, col: startCol });
            continue;
        }

        // var(--name) or CSS variables --name
        if (ch === '-' && at(pos + 1) === '-') {
            const startCol = col;
            advance(); advance();
            let name = '';
            while (pos < source.length && /[a-zA-Z0-9_-]/.test(peek())) name += advance();
            tokens.push({ type: TokenType.Variable, value: '--' + name, line, col: startCol });
            continue;
        }

        // Identifiers (and var() function)
        if (/[a-zA-Z_]/.test(ch)) {
            const startCol = col;
            let ident = '';
            while (pos < source.length && /[a-zA-Z0-9_-]/.test(peek())) ident += advance();

            if (ident === 'var' && peek() === '(') {
                advance();
                while (pos < source.length && /\s/.test(peek())) advance();
                let varName = '';
                while (pos < source.length && peek() !== ')') varName += advance();
                if (pos < source.length) advance();
                tokens.push({ type: TokenType.Var, value: varName.trim(), line, col: startCol });
            } else {
                tokens.push({ type: TokenType.Ident, value: ident, line, col: startCol });
            }
            continue;
        }

        // Unknown character — skip
        advance();
    }

    tokens.push({ type: TokenType.EOF, value: '', line, col });
    return tokens.filter(t => t.type !== TokenType.Comment);
}