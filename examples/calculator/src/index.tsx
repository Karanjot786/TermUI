import { App, type KeyEvent, type Screen, type Style, styleToCellAttrs, stringWidth, truncate } from '@termuijs/core';
import { Widget, Box, Text, Grid, Center } from '@termuijs/widgets';

// ── Button Widget ────────────────────────────────────────────────────────────

class Button extends Widget {
    /** Visible label on the button face. */
    readonly label: string;
    private readonly onClick: () => void;

    constructor(label: string, onClick: () => void, style: Partial<Style> = {}) {
        super({
            border: 'single',
            height: 3,
            ...style,
        });
        this.label = label;
        this.onClick = onClick;
        this.focusable = true;
    }

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width, height } = rect;
        if (width <= 0 || height <= 0) return;

        const attrs = styleToCellAttrs(this._style);

        // Focused buttons: black text on cyan background (bold) — high contrast,
        // works consistently in both dark and light terminal themes.
        const cellStyle = this.isFocused
            ? {
                  ...attrs,
                  fg: { type: 'named' as const, name: 'black' as const },
                  bg: { type: 'named' as const, name: 'cyan' as const },
                  bold: true,
                  inverse: false,
              }
            : { ...attrs, inverse: false };

        // Clear button area
        for (let r = 0; r < height; r++) {
            screen.writeString(x, y + r, ' '.repeat(width), cellStyle);
        }

        // Render centered label text
        const textLen = stringWidth(this.label);
        const paddingLeft = Math.max(0, Math.floor((width - textLen) / 2));
        const centeredLabel = ' '.repeat(paddingLeft) + this.label;
        const visibleText = truncate(centeredLabel, width);

        const labelY = y + Math.floor(height / 2);
        screen.writeString(x, labelY, visibleText, cellStyle);
    }

    click(): void {
        this.onClick();
    }
}

// ── Tokenizer ─────────────────────────────────────────────────────────────────

type Token =
    | { kind: 'number'; value: string }
    | { kind: 'op'; value: '+' | '-' | '*' | '/' }
    | { kind: 'percent' }
    | { kind: 'lparen' }
    | { kind: 'rparen' };

/**
 * Converts an infix expression string into a flat array of typed tokens.
 * Recognises: decimal numbers, +−×÷ operators, parentheses, and %.
 * Returns null if an unrecognised character is found.
 */
function tokenize(expr: string): Token[] | null {
    const tokens: Token[] = [];
    let i = 0;

    while (i < expr.length) {
        const ch = expr[i];

        // Skip spaces
        if (ch === ' ') { i++; continue; }

        // Numbers (including decimals)
        if (/\d/.test(ch) || ch === '.') {
            let num = '';
            while (i < expr.length && (/\d/.test(expr[i]) || expr[i] === '.')) {
                num += expr[i++];
            }
            tokens.push({ kind: 'number', value: num });
            continue;
        }

        // Operators
        if (ch === '+') { tokens.push({ kind: 'op', value: '+' }); i++; continue; }
        if (ch === '-') { tokens.push({ kind: 'op', value: '-' }); i++; continue; }
        if (ch === '*') { tokens.push({ kind: 'op', value: '*' }); i++; continue; }
        if (ch === '/') { tokens.push({ kind: 'op', value: '/' }); i++; continue; }

        // Percent
        if (ch === '%') { tokens.push({ kind: 'percent' }); i++; continue; }

        // Parentheses
        if (ch === '(') { tokens.push({ kind: 'lparen' }); i++; continue; }
        if (ch === ')') { tokens.push({ kind: 'rparen' }); i++; continue; }

        // Unrecognised character — signal failure
        return null;
    }

    return tokens;
}

// ── Recursive-Descent Evaluator ───────────────────────────────────────────────

/**
 * Validate that every number token has at most one decimal point.
 * Returns false when a malformed number like "3.14.15" is detected.
 */
function validateDecimals(tokens: Token[]): boolean {
    for (const tok of tokens) {
        if (tok.kind === 'number') {
            const dotCount = (tok.value.match(/\./g) ?? []).length;
            if (dotCount > 1) return false;
            // A lone "." is also invalid
            if (tok.value === '.') return false;
        }
    }
    return true;
}

/**
 * Normalise a floating-point result to remove FP dust while preserving precision.
 *
 * Strategy: toPrecision(10) kills dust like 0.30000000000000004 → 0.3.
 * Number() then strips trailing zeros so 10.00000000 → 10.
 */
function normalizeResult(n: number): string {
    if (!isFinite(n) || isNaN(n)) return 'Error';
    // Guard against very large exponents — keep the display readable
    if (Math.abs(n) > 1e15) return n.toExponential(6);
    return String(Number(n.toPrecision(10)));
}

/** Parser state shared across recursive calls. */
interface ParserState {
    tokens: Token[];
    pos: number;
}

function peek(s: ParserState): Token | undefined {
    return s.tokens[s.pos];
}

function consume(s: ParserState): Token {
    return s.tokens[s.pos++];
}

/**
 * Top-level entry: expression → term (('+' | '-') term)*
 * Throws a string message on parse error.
 */
function parseExpr(s: ParserState): number {
    let left = parseTerm(s);

    while (true) {
        const tok = peek(s);
        if (!tok || tok.kind !== 'op' || (tok.value !== '+' && tok.value !== '-')) break;
        consume(s); // eat the operator
        const right = parseTerm(s);
        left = tok.value === '+' ? left + right : left - right;
    }

    return left;
}

/**
 * term → factor (('*' | '/') factor)*
 */
function parseTerm(s: ParserState): number {
    let left = parseFactor(s);

    while (true) {
        const tok = peek(s);
        if (!tok || tok.kind !== 'op' || (tok.value !== '*' && tok.value !== '/')) break;
        consume(s);
        const right = parseFactor(s);
        if (tok.value === '/') {
            if (right === 0) throw 'Error: Div by 0';
            left = left / right;
        } else {
            left = left * right;
        }
    }

    return left;
}

/**
 * factor → '-' factor
 *         | '(' expr ')'
 *         | number ['%']
 */
function parseFactor(s: ParserState): number {
    const tok = peek(s);
    if (!tok) throw 'Error';

    // Unary minus
    if (tok.kind === 'op' && tok.value === '-') {
        consume(s);
        return -parseFactor(s);
    }

    // Grouped expression
    if (tok.kind === 'lparen') {
        consume(s); // eat '('
        const val = parseExpr(s);
        const closing = peek(s);
        if (!closing || closing.kind !== 'rparen') throw 'Error';
        consume(s); // eat ')'

        // Allow % after closing paren: (50)% → 0.5
        if (peek(s)?.kind === 'percent') {
            consume(s);
            return val / 100;
        }
        return val;
    }

    // Number literal
    if (tok.kind === 'number') {
        consume(s);
        const n = parseFloat(tok.value);
        if (isNaN(n)) throw 'Error';

        // Percent suffix: 50% → 0.5
        if (peek(s)?.kind === 'percent') {
            consume(s);
            return n / 100;
        }
        return n;
    }

    throw 'Error';
}

/**
 * Safe, eval-free expression evaluator.
 * Returns the result string, or an error string starting with "Error".
 */
function safeEval(expr: string): string {
    const trimmed = expr.trim();
    if (trimmed === '') return '0';

    const tokens = tokenize(trimmed);
    if (tokens === null) return 'Error';

    if (!validateDecimals(tokens)) return 'Error: bad decimal';

    if (tokens.length === 0) return '0';

    // Reject expressions that start or end with a binary operator
    // (unary minus is handled inside parseFactor)
    const last = tokens[tokens.length - 1];
    if (last.kind === 'op') return 'Error';

    const state: ParserState = { tokens, pos: 0 };

    let result: number;
    try {
        result = parseExpr(state);
    } catch (e) {
        return typeof e === 'string' ? e : 'Error';
    }

    // If tokens remain unconsumed, the expression was malformed
    if (state.pos < state.tokens.length) return 'Error';

    return normalizeResult(result);
}

// ── Calculator Button Layout ──────────────────────────────────────────────────

// 5 rows × 4 columns
const BUTTONS_LAYOUT: string[][] = [
    ['C', '±', '%', '/'],
    ['7', '8', '9', '*'],
    ['4', '5', '6', '-'],
    ['1', '2', '3', '+'],
    ['(', '0', '.', '='],
];

const NUM_ROWS = BUTTONS_LAYOUT.length; // 5
const NUM_COLS = BUTTONS_LAYOUT[0].length; // 4

// ── Calculator App Widget ─────────────────────────────────────────────────────

class CalculatorApp extends Widget {
    private _display: Text;
    private _focusedRow = 0;
    private _focusedCol = 0;
    private _buttons: Button[][] = [];

    /** Current infix expression being built by the user. */
    private expression = '';

    /** Non-null when a result has just been computed. Shown in the display. */
    private result: string | null = null;

    constructor() {
        super({
            flexDirection: 'column',
            // Extra height to accommodate the 5th button row (was 19)
            width: 32,
            height: 22,
            border: 'double',
            borderColor: { type: 'named', name: 'cyan' },
            padding: 1,
        });

        // 1. Title
        const title = new Text(' ⚡ TermUI Calculator ', {
            bold: true,
            height: 1,
            fg: { type: 'named', name: 'cyan' },
        }, { align: 'center' });

        // 2. Display screen area
        const displayBox = new Box({
            border: 'single',
            height: 3,
            borderColor: { type: 'named', name: 'brightBlack' },
            padding: { left: 1, right: 1, top: 0, bottom: 0 },
        });

        this._display = new Text('0', {
            bold: true,
            height: 1,
            fg: { type: 'named', name: 'white' },
        }, { align: 'right' });

        displayBox.addChild(this._display);

        // 3. Grid for calculator keys (5 rows × 4 columns)
        const grid = new Grid({ flexGrow: 1, gap: 0 }, { columns: NUM_COLS, gap: 0 });

        for (let r = 0; r < NUM_ROWS; r++) {
            const rowButtons: Button[] = [];
            for (let c = 0; c < NUM_COLS; c++) {
                const label = BUTTONS_LAYOUT[r][c];
                const buttonColor = this.getButtonColor(label);
                const button = new Button(
                    label,
                    () => this.handleButtonAction(label),
                    { fg: buttonColor }
                );
                rowButtons.push(button);
                grid.addItem(button);
            }
            this._buttons.push(rowButtons);
        }

        // Assemble layout
        this.addChild(title);
        this.addChild(new Box({ height: 1 })); // spacing
        this.addChild(displayBox);
        this.addChild(new Box({ height: 1 })); // spacing
        this.addChild(grid);

        this.updateFocus();
    }

    // ── Colour helpers ──────────────────────────────────────────────────────

    private getButtonColor(label: string) {
        if (label === 'C') {
            return { type: 'named' as const, name: 'red' as const };
        }
        if (['/', '*', '-', '+', '='].includes(label)) {
            return { type: 'named' as const, name: 'yellow' as const };
        }
        if (['±', '%', '('].includes(label)) {
            return { type: 'named' as const, name: 'green' as const };
        }
        if (label === '.') {
            return { type: 'named' as const, name: 'brightWhite' as const };
        }
        return { type: 'named' as const, name: 'white' as const };
    }

    // ── Focus management ────────────────────────────────────────────────────

    private updateFocus() {
        for (let r = 0; r < NUM_ROWS; r++) {
            for (let c = 0; c < NUM_COLS; c++) {
                this._buttons[r][c].isFocused = (r === this._focusedRow && c === this._focusedCol);
                this._buttons[r][c].markDirty();
            }
        }
        this.markDirty();
    }

    // ── Expression mutation helpers ─────────────────────────────────────────

    /** Append a digit; resets expression when entering after a result. */
    private addDigit(digit: string) {
        if (this.result !== null) {
            this.expression = '';
            this.result = null;
        }
        // Avoid leading double-zeros
        if (this.expression === '0' && digit === '0') return;
        if (this.expression === '0') {
            this.expression = digit;
        } else {
            this.expression += digit;
        }
        this.updateDisplay();
    }

    /**
     * Append a decimal point only when the current (last) number token does not
     * already contain one — preventing inputs like "3.14.15".
     */
    private addDecimal() {
        if (this.result !== null) {
            // After a result, start a fresh "0." expression
            this.expression = '0';
            this.result = null;
        }

        // Find the start of the last number segment in the expression
        const trimmed = this.expression.trimEnd();
        const lastOpIdx = Math.max(
            trimmed.lastIndexOf('+'),
            trimmed.lastIndexOf('-'),
            trimmed.lastIndexOf('*'),
            trimmed.lastIndexOf('/'),
            trimmed.lastIndexOf('('),
        );
        const lastNumberPart = trimmed.slice(lastOpIdx + 1).trim();

        // Only add a decimal if the current number segment doesn't already have one
        if (lastNumberPart.includes('.')) return;

        // If there's no current number, start with "0."
        if (lastNumberPart === '' || lastNumberPart === '-') {
            this.expression = this.expression + '0.';
        } else {
            this.expression += '.';
        }
        this.updateDisplay();
    }

    /** Append a binary operator, replacing a trailing operator if present. */
    private addOperator(op: string) {
        if (this.result !== null) {
            if (this.result.startsWith('Error')) {
                this.expression = '';
            } else {
                this.expression = this.result;
            }
            this.result = null;
        }

        const trimmed = this.expression.trim();
        if (trimmed === '') {
            // Allow starting with unary minus
            if (op === '-') {
                this.expression = '-';
            }
            this.updateDisplay();
            return;
        }

        const lastChar = trimmed[trimmed.length - 1];
        if (['+', '-', '*', '/'].includes(lastChar)) {
            // Replace the trailing operator rather than stacking
            this.expression = this.expression.replace(/\s*[\+\-\*\/]\s*$/, ` ${op} `);
        } else {
            this.expression += ` ${op} `;
        }
        this.updateDisplay();
    }

    /**
     * Append a '%' to the expression. The evaluator interprets this as ÷100
     * applied to the preceding number/group.
     */
    private addPercent() {
        if (this.result !== null) {
            if (!this.result.startsWith('Error')) {
                this.expression = this.result;
            }
            this.result = null;
        }
        const trimmed = this.expression.trim();
        if (trimmed === '' || ['+', '-', '*', '/', '('].includes(trimmed[trimmed.length - 1])) {
            return; // Cannot append % after an operator or at the start
        }
        this.expression += '%';
        this.updateDisplay();
    }

    /**
     * Toggle the sign of the last number in the expression.
     * Works on results too, converting "-5" ↔ "5".
     */
    private toggleSign() {
        // If showing a result, convert to a signed expression
        if (this.result !== null) {
            if (this.result.startsWith('Error')) return;
            this.expression = this.result;
            this.result = null;
        }

        if (this.expression === '' || this.expression === '0') return;

        // Use a regex to find and negate the last numeric token in the expression.
        // Handles: "3.14" → "-3.14", "-3.14" → "3.14", "2 + 5" → "2 + -5"
        this.expression = this.expression.replace(
            /(-?)(\d+\.?\d*)(%?)(\s*)$/,
            (_, minus, num, pct, trail) => {
                const negated = minus === '-' ? '' : '-';
                return `${negated}${num}${pct}${trail}`;
            }
        );
        this.updateDisplay();
    }

    /**
     * Append '(' or ')' to the expression, choosing intelligently.
     * - '(' when the expression is empty or last char is an operator / '('.
     * - ')' when there are unclosed parens and last char is a digit, '.', ')', or '%'.
     */
    private addParen() {
        if (this.result !== null) {
            this.expression = '';
            this.result = null;
        }

        const trimmed = this.expression.trimEnd();
        const openCount = (trimmed.match(/\(/g) ?? []).length;
        const closeCount = (trimmed.match(/\)/g) ?? []).length;
        const hasUnclosed = openCount > closeCount;

        const lastChar = trimmed[trimmed.length - 1] ?? '';
        const afterOperator = lastChar === '' || ['+', '-', '*', '/', '('].includes(lastChar);

        if (afterOperator) {
            this.expression += '(';
        } else if (hasUnclosed) {
            this.expression += ')';
        } else {
            // No unclosed parens and not after operator — start a new group
            this.expression += ' * (';
        }
        this.updateDisplay();
    }

    /** Delete the last character or operator token from the expression. */
    private backspace() {
        if (this.result !== null) {
            this.result = null;
            this.updateDisplay();
            return;
        }
        if (this.expression.length > 0) {
            // Operators are stored with surrounding spaces " + "; remove all three chars
            if (this.expression.endsWith(' ')) {
                this.expression = this.expression.slice(0, -3);
            } else {
                this.expression = this.expression.slice(0, -1);
            }
            this.updateDisplay();
        }
    }

    private clear() {
        this.expression = '';
        this.result = null;
        this.updateDisplay();
    }

    private evaluate() {
        if (this.expression.trim() === '') return;
        this.result = safeEval(this.expression);
        this.updateDisplay();
    }

    // ── Button action dispatcher ────────────────────────────────────────────

    private handleButtonAction(action: string) {
        switch (action) {
            case 'C':  this.clear();             break;
            case '=':  this.evaluate();          break;
            case '±':  this.toggleSign();        break;
            case '%':  this.addPercent();        break;
            case '(':  this.addParen();          break;
            case '.':  this.addDecimal();        break;
            default:
                if (['+', '-', '*', '/'].includes(action)) {
                    this.addOperator(action);
                } else if (/\d/.test(action)) {
                    this.addDigit(action);
                }
        }
    }

    // ── Display ─────────────────────────────────────────────────────────────

    private updateDisplay() {
        const text = this.result !== null ? this.result : (this.expression || '0');
        this._display.setContent(text);
        this.markDirty();
    }

    // ── Key handling ────────────────────────────────────────────────────────

    handleKey(event: KeyEvent): boolean {
        // Quit
        if (event.key === 'q' || (event.ctrl && event.key === 'c')) {
            return false;
        }

        const key = event.key;

        // ── Arrow-key grid navigation ──
        if (key === 'left') {
            this._focusedCol = (this._focusedCol - 1 + NUM_COLS) % NUM_COLS;
            this.updateFocus();
            return true;
        }
        if (key === 'right') {
            this._focusedCol = (this._focusedCol + 1) % NUM_COLS;
            this.updateFocus();
            return true;
        }
        if (key === 'up') {
            this._focusedRow = (this._focusedRow - 1 + NUM_ROWS) % NUM_ROWS;
            this.updateFocus();
            return true;
        }
        if (key === 'down') {
            this._focusedRow = (this._focusedRow + 1) % NUM_ROWS;
            this.updateFocus();
            return true;
        }

        // ── Enter / Space — activate focused button or evaluate directly ──
        if (key === 'enter' || key === 'return') {
            const focusedLabel = this._buttons[this._focusedRow][this._focusedCol].label;
            if (focusedLabel === '=') {
                // If already on '=', run through the normal click path
                this._buttons[this._focusedRow][this._focusedCol].click();
            } else {
                // Enter from anywhere evaluates immediately
                this.evaluate();
            }
            return true;
        }
        if (key === 'space') {
            this._buttons[this._focusedRow][this._focusedCol].click();
            return true;
        }

        // ── Direct keyboard shortcuts ──
        if (/^\d$/.test(key)) { this.addDigit(key);   return true; }
        if (['+', '-', '*', '/'].includes(key)) { this.addOperator(key); return true; }
        if (key === '=')          { this.evaluate();   return true; }
        if (key === '.')          { this.addDecimal(); return true; }
        if (key === '%')          { this.addPercent(); return true; }
        if (key === '(' || key === ')') { this.addParen(); return true; }
        if (key === 'c' || key === 'C') { this.clear();    return true; }
        if (key === 'backspace')  { this.backspace();  return true; }

        return true;
    }

    protected _renderSelf(_screen: Screen): void {
        // Child widgets handle all rendering
    }
}

// ── Application Mounting ─────────────────────────────────────────────────────

async function main() {
    const calcApp = new CalculatorApp();
    const centerLayout = new Center({}, { horizontal: true, vertical: true });
    centerLayout.addChild(calcApp);

    const app = new App(centerLayout, {
        fullscreen: true,
        title: 'Calculator Example',
        fps: 30,
    });

    app.events.on('key', (event) => {
        const shouldContinue = calcApp.handleKey(event);
        if (!shouldContinue) {
            app.exit(0);
        }
        app.requestRender();
    });

    const exitCode = await app.mount();
    process.exit(exitCode);
}

main().catch((err) => {
    console.error('Calculator application error:', err);
    process.exit(1);
});
