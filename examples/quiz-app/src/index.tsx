// ─────────────────────────────────────────────────────
// Quiz App — built with @termuijs/core + @termuijs/widgets
//
// Showcases: static state, List widget for answer choices,
// score tracking, multi-screen (question → summary)
// ─────────────────────────────────────────────────────

import { App, type KeyEvent, type Screen, type Style, styleToCellAttrs, stringWidth, truncate, caps } from '@termuijs/core';
import { Widget, Box, Text } from '@termuijs/widgets';

// ── Types ─────────────────────────────────────────────

interface Question {
    question: string;
    choices: string[];
    correctIndex: number;
}

// ── Quiz Data ─────────────────────────────────────────

const QUESTIONS: Question[] = [
    {
        question: 'What does HTML stand for?',
        choices: [
            'Hyper Text Markup Language',
            'High Tech Modern Language',
            'Hyper Transfer Markup Logic',
            'Home Tool Markup Language',
        ],
        correctIndex: 0,
    },
    {
        question: 'Which keyword declares a constant in JavaScript?',
        choices: ['var', 'let', 'const', 'def'],
        correctIndex: 2,
    },
    {
        question: 'What is the time complexity of binary search?',
        choices: ['O(n)', 'O(n²)', 'O(log n)', 'O(1)'],
        correctIndex: 2,
    },
    {
        question: 'Which data structure uses LIFO order?',
        choices: ['Queue', 'Stack', 'Heap', 'Tree'],
        correctIndex: 1,
    },
    {
        question: 'What does CSS stand for?',
        choices: [
            'Computer Style Sheets',
            'Creative Style System',
            'Cascading Style Sheets',
            'Colorful Style Syntax',
        ],
        correctIndex: 2,
    },
];

// ── SelectableList Widget ─────────────────────────────
// A simple list with keyboard-driven selection

class SelectableList extends Widget {
    private items: string[];
    private _selectedIndex: number;
    private onConfirm: (index: number) => void;

    constructor(
        items: string[],
        onConfirm: (index: number) => void,
        style: Partial<Style> = {}
    ) {
        super({ flexGrow: 1, ...style });
        this.items = items;
        this._selectedIndex = 0;
        this.onConfirm = onConfirm;
        this.focusable = true;
    }

    get selectedIndex(): number {
        return this._selectedIndex;
    }

    setItems(items: string[]) {
        this.items = items;
        this._selectedIndex = 0;
        this.markDirty();
    }

    moveUp() {
        this._selectedIndex = (this._selectedIndex - 1 + this.items.length) % this.items.length;
        this.markDirty();
    }

    moveDown() {
        this._selectedIndex = (this._selectedIndex + 1) % this.items.length;
        this.markDirty();
    }

    confirm() {
        this.onConfirm(this._selectedIndex);
    }

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width, height } = rect;
        if (width <= 0 || height <= 0) return;

        const baseAttrs = styleToCellAttrs(this._style);
        const cursor = caps.unicode ? '▶ ' : '> ';
        const blank  = '  ';

        for (let i = 0; i < this.items.length; i++) {
            const rowY = y + i;
            if (rowY >= y + height) break;

            const isSelected = i === this._selectedIndex;
            const prefix = isSelected ? cursor : blank;
            const label  = `${prefix}${String.fromCharCode(65 + i)}) ${this.items[i]}`;
            const visible = truncate(label, width);
            const padded  = visible.padEnd(width);

            const cellStyle = {
                ...baseAttrs,
                fg: isSelected
                    ? { type: 'named' as const, name: 'cyan' as const }
                    : baseAttrs.fg,
                bold: isSelected,
                inverse: isSelected,
            };

            screen.writeString(x, rowY, padded, cellStyle);
        }
    }
}

// ── QuizApp Widget ────────────────────────────────────

class QuizApp extends Widget {
    // State
    private currentIndex = 0;
    private score = 0;
    private answered = false;        // true while showing feedback before advancing
    private lastCorrect = false;
    private done = false;

    // Child widgets
    private _header: Text;
    private _questionText: Text;
    private _choiceList: SelectableList;
    private _feedback: Text;
    private _footer: Text;

    constructor() {
        super({
            flexDirection: 'column',
            border: 'double',
            borderColor: { type: 'named', name: 'cyan' },
            padding: { left: 2, right: 2, top: 1, bottom: 1 },
            width: 70,
            maxWidth: 70,
        });

        // Header — title + progress
        this._header = new Text(
            this.headerText(),
            { bold: true, height: 1, fg: { type: 'named', name: 'cyan' } },
            { align: 'center' }
        );

        const divider = new Text(
            '─'.repeat(64),
            { height: 1, fg: { type: 'named', name: 'brightBlack' } },
            { align: 'left' }
        );

        // Question
        this._questionText = new Text(
            this.currentQuestion().question,
            { bold: true, height: 2, fg: { type: 'named', name: 'white' } },
            { align: 'left', wrap: true }
        );

        const spacer1 = new Box({ height: 1 });

        // Choices list
        this._choiceList = new SelectableList(
            this.currentQuestion().choices,
            (idx) => this.handleAnswer(idx)
        );

        const spacer2 = new Box({ height: 1 });

        // Feedback line (empty until answered)
        this._feedback = new Text(
            '',
            { bold: true, height: 1 },
            { align: 'left' }
        );

        const spacer3 = new Box({ height: 1 });

        // Footer hint
        this._footer = new Text(
            this.footerHint(),
            { height: 1, fg: { type: 'named', name: 'brightBlack' } },
            { align: 'center' }
        );

        this.addChild(this._header);
        this.addChild(divider);
        this.addChild(this._questionText);
        this.addChild(spacer1);
        this.addChild(this._choiceList);
        this.addChild(spacer2);
        this.addChild(this._feedback);
        this.addChild(spacer3);
        this.addChild(this._footer);
    }

    // ── Helpers ────────────────────────────────────────

    private currentQuestion(): Question {
        return QUESTIONS[this.currentIndex];
    }

    private headerText(): string {
        if (this.done) return caps.unicode
            ? ' 🎉 Quiz Complete! '
            : ' Quiz Complete! ';
        return caps.unicode
            ? ` ❓ Question ${this.currentIndex + 1} / ${QUESTIONS.length} `
            : ` Question ${this.currentIndex + 1} / ${QUESTIONS.length} `;
    }

    private footerHint(): string {
        if (this.done) return '[ r ] restart   [ q / Ctrl+C ] quit';
        if (this.answered) return '[ Enter / Space ] next question';
        return '[ ↑ ↓ ] move   [ Enter / Space ] select   [ q / Ctrl+C ] quit';
    }

    private scorePercent(): number {
        return Math.round((this.score / QUESTIONS.length) * 100);
    }

    // ── Actions ────────────────────────────────────────

    private handleAnswer(choiceIndex: number) {
        if (this.answered || this.done) return;

        this.answered = true;
        this.lastCorrect = choiceIndex === this.currentQuestion().correctIndex;
        if (this.lastCorrect) this.score++;

        const tick  = caps.unicode ? '✓' : '[correct]';
        const cross = caps.unicode ? '✗' : '[wrong]';
        const correctLabel = String.fromCharCode(65 + this.currentQuestion().correctIndex);

        if (this.lastCorrect) {
            this._feedback.setStyle({ fg: { type: 'named', name: 'green' } });
            this._feedback.setContent(`  ${tick}  Correct!`);
        } else {
            this._feedback.setStyle({ fg: { type: 'named', name: 'red' } });
            this._feedback.setContent(
                `  ${cross}  Wrong — correct answer: ${correctLabel}) ${this.currentQuestion().choices[this.currentQuestion().correctIndex]}`
            );
        }

        this._footer.setContent(this.footerHint());
        this.markDirty();
    }

    private advance() {
        if (!this.answered) return;

        this.currentIndex++;
        this.answered = false;
        this._feedback.setContent('');

        if (this.currentIndex >= QUESTIONS.length) {
            this.showSummary();
            return;
        }

        const q = this.currentQuestion();
        this._header.setContent(this.headerText());
        this._questionText.setContent(q.question);
        this._choiceList.setItems(q.choices);
        this._footer.setContent(this.footerHint());
        this.markDirty();
    }

    private showSummary() {
        this.done = true;

        const pct  = this.scorePercent();
        const star  = caps.unicode ? '★' : '*';
        const grade = pct >= 80 ? `${star} Excellent!`
                    : pct >= 60 ? 'Good job!'
                    : 'Keep practicing!';

        this._header.setContent(this.headerText());
        this._questionText.setContent(
            `You scored  ${this.score} / ${QUESTIONS.length}  (${pct}%)   ${grade}`
        );
        this._choiceList.setItems([]);
        this._feedback.setContent('');
        this._footer.setContent(this.footerHint());
        this.markDirty();
    }

    private restart() {
        this.currentIndex = 0;
        this.score = 0;
        this.answered = false;
        this.done = false;

        const q = this.currentQuestion();
        this._header.setContent(this.headerText());
        this._questionText.setContent(q.question);
        this._choiceList.setItems(q.choices);
        this._feedback.setContent('');
        this._footer.setContent(this.footerHint());
        this.markDirty();
    }

    // ── Key handling ───────────────────────────────────

    handleKey(event: KeyEvent): boolean {
        if (event.key === 'q' || (event.ctrl && event.key === 'c')) {
            return false; // signal app to exit
        }

        if (this.done) {
            if (event.key === 'r') {
                this.restart();
            }
            return true;
        }

        if (this.answered) {
            if (event.key === 'enter' || event.key === 'return' || event.key === 'space') {
                this.advance();
            }
            return true;
        }

        // Navigate choices
        if (event.key === 'up') {
            this._choiceList.moveUp();
            return true;
        }
        if (event.key === 'down') {
            this._choiceList.moveDown();
            return true;
        }

        // Confirm selection
        if (event.key === 'enter' || event.key === 'return' || event.key === 'space') {
            this._choiceList.confirm();
            return true;
        }

        // Letter shortcuts: a, b, c, d
        const letter = event.key.toLowerCase();
        const idx = letter.charCodeAt(0) - 97; // 'a' = 0, 'b' = 1, ...
        if (idx >= 0 && idx < this.currentQuestion().choices.length) {
            this.handleAnswer(idx);
            return true;
        }

        return true;
    }

    protected _renderSelf(_screen: Screen): void {
        // children handle all rendering
    }
}

// ── Center wrapper ────────────────────────────────────

class Center extends Widget {
    constructor() {
        super({ flexGrow: 1, flexDirection: 'column' });
    }

    protected _renderSelf(_screen: Screen): void {}
}

// ── Application entry ─────────────────────────────────

async function main() {
    const quiz = new QuizApp();

    // Wrap in a centering box
    const outer = new Box({
        flexDirection: 'column',
        flexGrow: 1,
        alignItems: 'center',
        justifyContent: 'center',
    });
    outer.addChild(quiz);

    const application = new App(outer, {
        fullscreen: true,
        title: 'TermUI Quiz App',
        fps: 30,
    });

    application.events.on('key', (event: KeyEvent) => {
        const shouldContinue = quiz.handleKey(event);
        if (!shouldContinue) {
            application.exit(0);
        }
        application.requestRender();
    });

    const exitCode = await application.mount();
    process.exit(exitCode);
}

main().catch((err) => {
    console.error('Quiz app error:', err);
    process.exit(1);
});
