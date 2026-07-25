import {App,type KeyEvent,type Screen, type Style,styleToCellAttrs, stringWidth,truncate} from "@termuijs/core";
import { Widget, Box, Text, Grid, Center } from "@termuijs/widgets";

// ── Button Widget ────────────────────────────────────────────────────────────

class Button extends Widget {
 private label: string;
    private _onClick: () => void;

    constructor(label: string, onClick: () => void, style: Partial<Style> = {}) {
        super({
            border: 'single',
            height: 3,
            ...style,
        });
        this.label = label;
        this._onClick = onClick;
        this.focusable = true;
    }

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width, height } = rect;
        if (width <= 0 || height <= 0) return;

        const attrs = styleToCellAttrs(this._style);

        // Highlight focused button using inverse colors or accent colors
        const fgColor = this.isFocused
            ? { type: 'named' as const, name: 'cyan' as const }
            : attrs.fg;

        const cellStyle = {
            ...attrs,
            fg: fgColor,
            bold: this.isFocused,
            inverse: this.isFocused,
        };

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
        this._onClick();
    }
}
// ── Tokenizer & Evaluator ───────────────────────────────────────────────────

function tokenize(expr: string): string[] {
    const tokens: string[] = [];
    let currentNum = '';
    for (const char of expr) {
        if (/\d/.test(char) || char === '.') {
            currentNum += char;
        } else if (['+', '-', '*', '/'].includes(char)) {
            if (currentNum) {
                tokens.push(currentNum);
                currentNum = '';
            }
            tokens.push(char);
        } else if (char !== ' ') {
            // Ignore other characters
        }
    }
    if (currentNum) {
        tokens.push(currentNum);
    }
    return tokens;
}

function safeEval(expr: string): string {
    const tokens = tokenize(expr);
    if (tokens.length === 0) return '0';

    // Handle initial negative number
    if (tokens[0] === '-' && tokens.length > 1 && !isNaN(Number(tokens[1]))) {
        tokens.splice(0, 2, '-' + tokens[1]);
    }

    const ops = ['+', '-', '*', '/'];
    if (ops.includes(tokens[0]) || ops.includes(tokens[tokens.length - 1])) {
        return 'Error';
    }

    // Check for consecutive operators
    for (let i = 0; i < tokens.length - 1; i++) {
        if (ops.includes(tokens[i]) && ops.includes(tokens[i + 1])) {
            return 'Error';
        }
    }

    // Process Multiplication and Division (left-to-right)
    const values: string[] = [];
    let i = 0;
    while (i < tokens.length) {
        const token = tokens[i];
        if (token === '*' || token === '/') {
            const prevStr = values.pop();
            const nextStr = tokens[i + 1];
            if (prevStr === undefined || nextStr === undefined) return 'Error';
            const prev = parseFloat(prevStr);
            const next = parseFloat(nextStr);
            if (token === '/') {
                if (next === 0) {
                    return 'Error: Div by 0';
                }
                values.push(String(prev / next));
            } else {
                values.push(String(prev * next));
            }
            i += 2;
        } else {
            values.push(token);
            i++;
        }
    }

    // Process Addition and Subtraction (left-to-right)
    if (values.length === 0) return '0';
    let res = parseFloat(values[0]);
    let j = 1;
    while (j < values.length) {
        const op = values[j];
        const nextStr = values[j + 1];
        if (nextStr === undefined) return 'Error';
        const next = parseFloat(nextStr);
        if (op === '+') {
            res += next;
        } else if (op === '-') {
            res -= next;
        } else {
            return 'Error';
        }
        j += 2;
    }

    if (isNaN(res) || !isFinite(res)) return 'Error';

    const resStr = String(res);
    if (resStr.includes('.') && resStr.split('.')[1].length > 8) {
        return String(Number(res.toFixed(8)));
    }
    return resStr;
}

// ── Calculator App Widget ───────────────────────────────────────────────────

const BUTTONS_LAYOUT = [
    ['7', '8', '9', '/'],
    ['4', '5', '6', '*'],
    ['1', '2', '3', '-'],
    ['C', '0', '=', '+'],
];

class CalculatorApp extends Widget {
    private _expressionDisplay: Text;
    private _resultDisplay: Text;
    private _historyDisplay: Text;
    private _focusedRow = 0;
    private _focusedCol = 0;
    private _buttons: Button[][] = [];

    private expression = '';
    private result: string | null = null;
    private history: string[] = [];

    constructor() {
        super({
            flexDirection: "column",
            width: 78,
            maxWidth: 78,
            height: 23,
            border: "double",
            borderColor: { type: 'named', name: 'cyan' },
            padding: { left: 1, right: 1, top: 0, bottom: 0 },
        });

        // 1. Title
        const title = new Text(
            " ⚡ TermUI Calculator ",
            {
                bold: true,
                height: 1,
                fg: { type: "named", name: "cyan" },
            },
            { align: "center" },
        );

        // 2. Main body horizontal box containing Left and Right columns
        const bodyBox = new Box({
            flexDirection: "row",
            height: 16,
            justifyContent: "space-between",
        });

        // Left Column: Display Screen + Buttons Grid
        const leftCol = new Box({
            flexDirection: "column",
            width: 44,
            height: 16,
        });

        const displayBox = new Box({
            flexDirection: "column",
            border: "single",
            height: 4,
            borderColor: { type: "named", name: "brightBlack" },
            padding: { left: 1, right: 1 },
        });

        this._expressionDisplay = new Text("0", {
            bold: true,
            height: 1,
            fg: { type: "named", name: "white" },
        });

        this._resultDisplay = new Text("🎯 Result: -", {
            bold: true,
            height: 1,
            fg: { type: "named", name: "green" },
        });

        displayBox.addChild(this._expressionDisplay);
        displayBox.addChild(this._resultDisplay);
        leftCol.addChild(displayBox);

        // Grid for calculator keys
        const grid = new Box({ flexDirection: "column", flexGrow: 1, height: 12 });

        for (let r = 0; r < 4; r++) {
            const rowBox = new Box({ flexDirection: "row", height: 3 });
            const rowButtons: Button[] = [];
            for (let c = 0; c < 4; c++) {
                const label = BUTTONS_LAYOUT[r][c];
                const button = new Button(
                    label,
                    () => this.handleButtonAction(label),
                    { fg: this.getButtonColor(label), flexGrow: 1 },
                );
                rowButtons.push(button);
                rowBox.addChild(button);
            }
            this._buttons.push(rowButtons);
            grid.addChild(rowBox);
        }
        leftCol.addChild(grid);

        // Right Column: Session history panel
        const rightCol = new Box({
            flexDirection: "column",
            border: "single",
            borderColor: { type: "named", name: "yellow" },
            width: 30,
            height: 16,
            padding: { left: 1, right: 1, top: 0, bottom: 0 },
        });

        const historyTitle = new Text("📜 History", {
            bold: true,
            height: 1,
            fg: { type: "named", name: "yellow" },
        }, { align: "center" });

        this._historyDisplay = new Text("No calculations yet", {
            height: 11,
            fg: { type: "named", name: "white" },
        });

        rightCol.addChild(historyTitle);
        rightCol.addChild(this._historyDisplay);

        bodyBox.addChild(leftCol);
        bodyBox.addChild(rightCol);

        // 3. Footer controls info
        const footerBox = new Box({
            flexDirection: "column",
            height: 3,
            padding: { left: 1, right: 1 },
        });

        const footerTitle = new Text("⌨️ Controls", {
            bold: true,
            height: 1,
            fg: { type: "named", name: "magenta" },
        });

        const footerHints = new Text("Enter = Calculate  │  Esc = Clear  │  q = Quit", {
            height: 1,
            fg: { type: "named", name: "magenta" },
        });

        footerBox.addChild(footerTitle);
        footerBox.addChild(footerHints);

        // Add elements to root container
        this.addChild(title);
        this.addChild(bodyBox);
        this.addChild(footerBox);

        this.updateFocus();
    }

    private getButtonColor(label: string) {
        if (label === "C") {
            return { type: "named" as const, name: "red" as const };
        }
        if (["/", "*", "-", "+", "="].includes(label)) {
            return { type: "named" as const, name: "yellow" as const };
        }
        return { type: "named" as const, name: "white" as const };
    }

    private updateFocus() {
        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 4; c++) {
                this._buttons[r][c].isFocused =
                    r === this._focusedRow && c === this._focusedCol;
                this._buttons[r][c].markDirty();
            }
        }
        this.markDirty();
    }

    private addDigit(digit: string) {
        if (this.result !== null) {
            this.expression = "";
            this.result = null;
        }
        if (this.expression === "0" && digit === "0") return;
        if (this.expression === "0") {
            this.expression = digit;
        } else {
            this.expression += digit;
        }
        this.updateDisplay();
    }

    private addOperator(op: string) {
        if (this.result !== null) {
            if (this.result.startsWith("Error")) {
                this.expression = "";
            } else {
                this.expression = this.result;
            }
            this.result = null;
        }

        const trimmed = this.expression.trim();
        if (trimmed === "") {
            if (op === "-") {
                this.expression = "-";
            }
            this.updateDisplay();
            return;
        }

        const lastChar = trimmed[trimmed.length - 1];
        if (["+", "-", "*", "/"].includes(lastChar)) {
            // Replace trailing operator block
            this.expression = this.expression.replace(
                /\s*[\+\-\*\/]\s*$/,
                ` ${op} `,
            );
        } else {
            this.expression += ` ${op} `;
        }
        this.updateDisplay();
    }

    private backspace() {
        if (this.result !== null) {
            this.result = null;
            this.updateDisplay();
            return;
        }
        if (this.expression.length > 0) {
            if (this.expression.endsWith(" ")) {
                this.expression = this.expression.slice(0, -3);
            } else {
                this.expression = this.expression.slice(0, -1);
            }
            this.updateDisplay();
        }
    }

    private clear() {
        this.expression = "";
        this.result = null;
        this.updateDisplay();
    }

    private evaluate() {
        if (this.expression.trim() === "") return;
        const oldExpr = this.expression;
        this.result = safeEval(this.expression);
        if (this.result !== null && !this.result.startsWith("Error")) {
            const entry = `${oldExpr} = ${this.result}`;
            this.history.unshift(entry);
            if (this.history.length > 10) {
                this.history.pop();
            }
        }
        this.updateDisplay();
    }

    private handleButtonAction(action: string) {
        if (action === 'C') {
            this.clear();
        } else if (action === '=') {
            this.evaluate();
        } else if (['+', '-', '*', '/'].includes(action)) {
            this.addOperator(action);
        } else {
            this.addDigit(action);
        }
    }

    private updateDisplay() {
        this._expressionDisplay.setContent(this.expression || "0");

        if (this.result !== null) {
            if (this.result.startsWith("Error")) {
                this._resultDisplay.setContent(`🎯 Result: ${this.result}`);
                this._resultDisplay.setStyle({
                    fg: { type: "named", name: "red" },
                    bold: true,
                });
            } else {
                this._resultDisplay.setContent(`🎯 Result: ${this.result}`);
                this._resultDisplay.setStyle({
                    fg: { type: "named", name: "green" },
                    bold: true,
                });
            }
        } else {
            this._resultDisplay.setContent("🎯 Result: -");
            this._resultDisplay.setStyle({
                fg: { type: "named", name: "green" },
                bold: true,
            });
        }

        if (this.history.length === 0) {
            this._historyDisplay.setContent("No calculations yet");
        } else {
            this._historyDisplay.setContent(this.history.join("\n"));
        }

        this.markDirty();
    }

    handleKey(event: KeyEvent): boolean {
        if (event.key === 'q' || (event.ctrl && event.key === 'c')) {
            return false; // Stop application
        }

        const key = event.key;

        // Grid navigation
        if (key === 'left') {
            this._focusedCol = (this._focusedCol - 1 + 4) % 4;
            this.updateFocus();
            return true;
        }
        if (key === 'right') {
            this._focusedCol = (this._focusedCol + 1) % 4;
            this.updateFocus();
            return true;
        }
        if (key === 'up') {
            this._focusedRow = (this._focusedRow - 1 + 4) % 4;
            this.updateFocus();
            return true;
        }
        if (key === 'down') {
            this._focusedRow = (this._focusedRow + 1) % 4;
            this.updateFocus();
            return true;
        }
        // Action trigger
        if (key === "enter" || key === "return" || key === "space") {
            this._buttons[this._focusedRow][this._focusedCol].click();
            return true;
        }

        // Direct inputs
        if (key.length === 1 && key >= '0' && key <= '9') {
            this.addDigit(key);
            return true;
        }
        if (['+', '-', '*', '/'].includes(key)) {
            this.addOperator(key);
            return true;
        }
        if (key === '=') {
            this.evaluate();
            return true;
        }
        if (key === 'escape' || key === 'c' || key === 'C') {
            this.clear();
            return true;
        }
        if (key === 'backspace') {
            this.backspace();
            return true;
        }

        return true;
    }

    protected _renderSelf(_screen: Screen): void {
        // Child widgets handle rendering
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

    app.events.on("key", (event) => {
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
    console.error("Calculator application error:", err);
    process.exit(1);
});