/**
 * Evaluate a CSS-like `calc(...)` expression with optional `var(--name)` lookups.
 *
 * @param expression - The expression, e.g. `calc(10 + var(gap) * 2)`.
 * @param variables - Map of variable names to their string values.
 * @returns The computed numeric result.
 * @throws Error if the expression is malformed or a variable is missing.
 */
export function evalCalc(
    expression: string,
    variables: Record<string, string>,
): number {
    let expr = expression.trim();
    if (expr.startsWith('calc(') && expr.endsWith(')')) {
        expr = expr.substring(5, expr.length - 1);
    } else {
        throw new Error(`calc() error: Malformed input (missing calc() wrapper)`);
    }

    if (expr.trim() === '') {
        throw new Error(`calc() error: Malformed input (empty expression)`);
    }

    const tokenizer = new Tokenizer(expr);
    const parser = new Parser(tokenizer, variables);
    return parser.parse();
}

type TokenType = 'NUMBER' | 'VAR' | '+' | '-' | '*' | '/' | '(' | ')' | 'EOF';

interface Token {
    type: TokenType;
    value: string;
    pos: number;
}

class Tokenizer {
    private pos = 0;
    constructor(private input: string) { }

    private peek(): string {
        return this.pos < this.input.length ? this.input[this.pos] : '';
    }

    private advance(): string {
        return this.pos < this.input.length ? this.input[this.pos++] : '';
    }

    private skipWhitespace() {
        while (this.pos < this.input.length && /\s/.test(this.input[this.pos])) {
            this.pos++;
        }
    }

    nextToken(): Token {
        this.skipWhitespace();
        if (this.pos >= this.input.length) {
            return { type: 'EOF', value: '', pos: this.pos };
        }

        const startPos = this.pos;
        const char = this.peek();

        if (char === '+' || char === '-' || char === '*' || char === '/' || char === '(' || char === ')') {
            this.advance();
            return { type: char as TokenType, value: char, pos: startPos };
        }

        if (/[0-9.]/.test(char)) {
            let value = '';
            let hasDot = false;
            while (this.pos < this.input.length && /[0-9.]/.test(this.peek())) {
                const c = this.peek();
                if (c === '.') {
                    if (hasDot) {
                        throw new Error(`calc() error: Malformed input, multiple decimal points at position ${this.pos}`);
                    }
                    hasDot = true;
                }
                value += this.advance();
            }
            if (value === '.') {
                throw new Error(`calc() error: Unexpected token '.' at position ${startPos}`);
            }
            return { type: 'NUMBER', value, pos: startPos };
        }

        if (this.input.startsWith('var(', this.pos)) {
            this.pos += 4;
            let varName = '';
            while (this.pos < this.input.length && this.peek() !== ')') {
                if (this.peek() === '') {
                    break;
                }
                varName += this.advance();
            }
            if (this.peek() === ')') {
                this.advance();
            } else {
                throw new Error(`calc() error: Malformed input, unclosed var() at position ${startPos}`);
            }
            return { type: 'VAR', value: varName.trim(), pos: startPos };
        }

        throw new Error(`calc() error: Unexpected token '${char}' at position ${startPos}`);
    }
}

class Parser {
    private currentToken!: Token;

    constructor(private tokenizer: Tokenizer, private variables: Record<string, string>) {
        this.consume();
    }

    private consume() {
        this.currentToken = this.tokenizer.nextToken();
    }

    parse(): number {
        const result = this.parseExpression();
        if (this.currentToken.type !== 'EOF') {
            throw new Error(`calc() error: Unexpected token '${this.currentToken.value}' at position ${this.currentToken.pos}`);
        }
        return result;
    }

    private parseExpression(): number {
        let result = this.parseTerm();

        while (this.currentToken.type === '+' || this.currentToken.type === '-') {
            const op = this.currentToken.type;
            this.consume();
            const right = this.parseTerm();
            if (op === '+') result += right;
            else result -= right;
        }

        return result;
    }

    private parseTerm(): number {
        let result = this.parseFactor();

        while (this.currentToken.type === '*' || this.currentToken.type === '/') {
            const op = this.currentToken.type;
            this.consume();
            const right = this.parseFactor();
            if (op === '*') {
                result *= right;
            } else {
                if (right === 0) {
                    throw new Error("calc() error: Division by zero");
                }
                result /= right;
            }
        }

        return result;
    }

    private parseFactor(): number {
        const token = this.currentToken;

        if (token.type === '+') {
            this.consume();
            return this.parseFactor();
        }

        if (token.type === '-') {
            this.consume();
            return -this.parseFactor();
        }

        if (token.type === 'NUMBER') {
            this.consume();
            return parseFloat(token.value);
        }

        if (token.type === 'VAR') {
            this.consume();
            const varName = token.value;
            if (!(varName in this.variables)) {
                throw new Error(`calc() error: Missing variable '${varName}'`);
            }
            const val = parseFloat(this.variables[varName]);
            if (isNaN(val)) {
                throw new Error(`calc() error: Variable '${varName}' is not a valid number`);
            }
            return val;
        }

        if (token.type === '(') {
            this.consume();
            const result = this.parseExpression();
            if (this.currentToken.type !== ')') {
                throw new Error(`calc() error: Expected ')' at position ${this.currentToken.pos}`);
            }
            this.consume();
            return result;
        }

        if (token.type === 'EOF') {
            throw new Error(`calc() error: Unexpected end of expression`);
        }

        throw new Error(`calc() error: Unexpected token '${token.value}' at position ${token.pos}`);
    }
}