// ─────────────────────────────────────────────────────
// Quiz App — built with @termuijs/core + @termuijs/widgets
//
// Showcases: static state, SelectableList widget for answer
// choices, score tracking, question → summary screens
// ─────────────────────────────────────────────────────

import { App, type KeyEvent, type Screen, type Style, styleToCellAttrs, truncate, caps } from '@termuijs/core';
import { Widget, Box, Text, Center } from '@termuijs/widgets';

// ── Types ─────────────────────────────────────────────

interface Question {
    question: string;
    choices: string[];
    correctIndex: number;
    explanation?: string;
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
        explanation: 'HTML (Hyper Text Markup Language) is the standard markup language for documents designed to be displayed in a web browser.',
    },
    {
        question: 'Which keyword declares a constant in JavaScript?',
        choices: ['var', 'let', 'const', 'def'],
        correctIndex: 2,
        explanation: 'The const keyword declares a block-scoped local variable that cannot be reassigned or redeclared.',
    },
    {
        question: 'What is the time complexity of binary search?',
        choices: ['O(n)', 'O(n^2)', 'O(log n)', 'O(1)'],
        correctIndex: 2,
        explanation: 'Binary search works by repeatedly dividing in half the portion of the list that could contain the item, resulting in O(log n) time complexity.',
    },
    {
        question: 'Which data structure uses LIFO order?',
        choices: ['Queue', 'Stack', 'Heap', 'Tree'],
        correctIndex: 1,
        explanation: 'A stack is a linear data structure that follows the Last In, First Out (LIFO) principle, where the last element added is the first one removed.',
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
        explanation: 'CSS (Cascading Style Sheets) is a stylesheet language used to describe the presentation of a document written in HTML or XML.',
    },
];

// ── SelectableList Widget ─────────────────────────────

class SelectableList extends Widget {
    private items: string[];
    private _selectedIndex: number;
    private onConfirm: (index: number) => void;

    constructor(
        items: string[],
        onConfirm: (index: number) => void,
        style: Partial<Style> = {}
    ) {
        super({ height: 4, ...style });
        this.items = items;
        this._selectedIndex = 0;
        this.onConfirm = onConfirm;
    }

    setItems(items: string[]): void {
        this.items = items;
        this._selectedIndex = 0;
        this.markDirty();
    }

    moveUp(): void {
        if (this.items.length === 0) return;
        this._selectedIndex = (this._selectedIndex - 1 + this.items.length) % this.items.length;
        this.markDirty();
    }

    moveDown(): void {
        if (this.items.length === 0) return;
        this._selectedIndex = (this._selectedIndex + 1) % this.items.length;
        this.markDirty();
    }

    confirm(): void {
        if (this.items.length > 0) this.onConfirm(this._selectedIndex);
    }

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y, width, height } = rect;
        if (width <= 0 || height <= 0) return;

        const baseAttrs = styleToCellAttrs(this._style);
        const cursor = caps.unicode ? '> ' : '> ';
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

// Total height = border(2) + padding top/bottom(2) + contents:
//   header(1) + divider(1) + gap(1) + question(1) + gap(1)
//   + choices(4) + gap(1) + feedback(1) + gap(1) + footer(1) = 13 content rows
// Total = 2 + 2 + 13 = 17
// ── Progress Bar Helper ────────────────────────────────
function getProgressBar(percent: number, width = 15): string {
    const filledChar = caps.unicode ? '█' : '#';
    const emptyChar = caps.unicode ? '░' : '-';
    const filledCount = Math.min(width, Math.max(0, Math.round((percent / 100) * width)));
    const emptyCount = width - filledCount;
    return `[${filledChar.repeat(filledCount)}${emptyChar.repeat(emptyCount)}] ${percent}%`;
}

const WIDGET_WIDTH  = 72;
const WIDGET_HEIGHT = 22;

export class QuizApp extends Widget {
    private currentIndex = 0;
    private score = 0;
    private streak = 0;
    private answered = false;
    private lastCorrect = false;
    private done = false;
    private userChoiceIndex = -1;

    private _header: Text;
    private _progressBar: Text;
    private _questionText: Text;
    private _choiceList: SelectableList;
    private _feedbackStatus: Text;
    private _feedbackDetails: Text;
    private _footer: Text;

    constructor() {
        super({
            flexDirection: 'column',
            border: 'double',
            borderColor: { type: 'named', name: 'cyan' },
            padding: { left: 2, right: 2, top: 0, bottom: 0 },
            width:  WIDGET_WIDTH,
            height: WIDGET_HEIGHT,
        });

        this._header = new Text(
            this.headerText(),
            { bold: true, height: 1, fg: { type: 'named', name: 'cyan' } },
            { align: 'center' }
        );

        this._progressBar = new Text(
            this.progressBarText(),
            { height: 1, fg: { type: 'named', name: 'cyan' } },
            { align: 'center' }
        );

        const divider = new Text(
            '─'.repeat(66),
            { height: 1, fg: { type: 'named', name: 'brightBlack' } },
            { align: 'left' }
        );

        const gap1 = new Box({ height: 1 });

        this._questionText = new Text(
            this.currentQuestion().question,
            { bold: true, height: 1, fg: { type: 'named', name: 'white' } },
            { align: 'left', wrap: false }
        );

        const gap2 = new Box({ height: 1 });

        this._choiceList = new SelectableList(
            this.currentQuestion().choices,
            (idx) => this.handleAnswer(idx)
        );

        const gap3 = new Box({ height: 1 });

        this._feedbackStatus = new Text(
            '',
            { bold: true, height: 1, fg: { type: 'named', name: 'green' } },
            { align: 'left' }
        );

        this._feedbackDetails = new Text(
            '',
            { height: 6, fg: { type: 'named', name: 'white' } },
            { align: 'left' }
        );

        const gap4 = new Box({ height: 1 });

        this._footer = new Text(
            this.footerHint(),
            { height: 1, fg: { type: 'named', name: 'brightBlack' } },
            { align: 'center' }
        );

        this.addChild(this._header);
        this.addChild(this._progressBar);
        this.addChild(divider);
        this.addChild(gap1);
        this.addChild(this._questionText);
        this.addChild(gap2);
        this.addChild(this._choiceList);
        this.addChild(gap3);
        this.addChild(this._feedbackStatus);
        this.addChild(this._feedbackDetails);
        this.addChild(gap4);
        this.addChild(this._footer);
    }

    private currentQuestion(): Question {
        return QUESTIONS[this.currentIndex];
    }

    private headerText(): string {
        if (this.done) return ' Quiz Complete! ';
        const fireEmoji = caps.unicode ? '🔥 ' : '';
        const streakText = `${fireEmoji}Streak: ${this.streak}`;
        return ` Question ${this.currentIndex + 1}/${QUESTIONS.length}   ${streakText} `;
    }

    private progressBarText(): string {
        if (this.done) return '';
        const total = QUESTIONS.length;
        const current = this.currentIndex + 1;
        const pct = Math.round((current / total) * 100);
        return getProgressBar(pct);
    }

    private footerHint(): string {
        if (this.done) return '[ r ] restart   [ q / Ctrl+C ] quit';
        if (this.answered) return '[ Enter / Space ] next question   [ q ] quit';
        return '[ up/down ] move   [ Enter/Space ] select   [ a-d ] shortcut   [ q ] quit';
    }

    private handleAnswer(choiceIndex: number): void {
        if (this.answered || this.done) return;

        this.answered = true;
        this.userChoiceIndex = choiceIndex;
        this.lastCorrect = choiceIndex === this.currentQuestion().correctIndex;
        if (this.lastCorrect) {
            this.score++;
            this.streak++;
        } else {
            this.streak = 0;
        }

        const q = this.currentQuestion();
        const correctLabel = String.fromCharCode(65 + q.correctIndex);
        const correctText  = q.choices[q.correctIndex];
        const userLabel = String.fromCharCode(65 + choiceIndex);
        const userText = q.choices[choiceIndex];

        const statusEmoji = this.lastCorrect ? (caps.unicode ? '✔️ Correct' : 'Correct') : (caps.unicode ? '❌ Incorrect' : 'Incorrect');
        if (this.lastCorrect) {
            this._feedbackStatus.setStyle({ fg: { type: 'named', name: 'green' }, bold: true, height: 1 });
            this._feedbackStatus.setContent(`  ${statusEmoji}`);
        } else {
            this._feedbackStatus.setStyle({ fg: { type: 'named', name: 'red' }, bold: true, height: 1 });
            this._feedbackStatus.setContent(`  ${statusEmoji}`);
        }

        let details = `  Your Answer: ${userLabel}) ${userText}\n  Correct Answer: ${correctLabel}) ${correctText}`;
        if (q.explanation) {
            details += `\n\n  Explanation:\n  ${q.explanation}`;
        }
        this._feedbackDetails.setContent(details);

        this._header.setContent(this.headerText());
        this._footer.setContent(this.footerHint());
        this.markDirty();
    }

    private advance(): void {
        if (!this.answered) return;

        this.currentIndex++;
        this.answered = false;
        this.userChoiceIndex = -1;
        this._feedbackStatus.setContent('');
        this._feedbackDetails.setContent('');

        if (this.currentIndex >= QUESTIONS.length) {
            this.showSummary();
            return;
        }

        const q = this.currentQuestion();
        this._header.setContent(this.headerText());
        this._progressBar.setContent(this.progressBarText());
        this._questionText.setContent(q.question);
        this._choiceList.setItems(q.choices);
        this._footer.setContent(this.footerHint());
        this.markDirty();
    }

    private showSummary(): void {
        this.done = true;
        const pct   = Math.round((this.score / QUESTIONS.length) * 100);
        const grade = pct >= 80 ? 'Excellent!' : pct >= 60 ? 'Good job!' : 'Keep practicing!';

        this._header.setContent(this.headerText());
        this._progressBar.setContent(this.progressBarText());
        this._questionText.setContent(`Score: ${this.score} / ${QUESTIONS.length}  (${pct}%)   ${grade}`);
        this._choiceList.setItems([]);
        this._feedbackStatus.setContent('');
        this._feedbackDetails.setContent('');
        this._footer.setContent(this.footerHint());
        this.markDirty();
    }

    private restart(): void {
        this.currentIndex = 0;
        this.score        = 0;
        this.streak       = 0;
        this.answered     = false;
        this.done         = false;
        this.userChoiceIndex = -1;

        const q = this.currentQuestion();
        this._header.setContent(this.headerText());
        this._progressBar.setContent(this.progressBarText());
        this._questionText.setContent(q.question);
        this._choiceList.setItems(q.choices);
        this._feedbackStatus.setContent('');
        this._feedbackDetails.setContent('');
        this._footer.setContent(this.footerHint());
        this.markDirty();
    }

    handleKey(event: KeyEvent): boolean {
        if (event.key === 'q' || (event.ctrl && event.key === 'c')) return false;

        if (this.done) {
            if (event.key === 'r') this.restart();
            return true;
        }

        if (this.answered) {
            if (event.key === 'enter' || event.key === 'space') this.advance();
            return true;
        }

        if (event.key === 'up')    { this._choiceList.moveUp();   return true; }
        if (event.key === 'down')  { this._choiceList.moveDown(); return true; }
        if (event.key === 'enter' || event.key === 'space') {
            this._choiceList.confirm();
            return true;
        }

        // a/b/c/d shortcuts
        const idx = event.key.toLowerCase().charCodeAt(0) - 97;
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

// ── Application entry ─────────────────────────────────

async function main() {
    const quiz = new QuizApp();

    const center = new Center({}, { horizontal: true, vertical: true });
    center.addChild(quiz);

    const app = new App(center, {
        fullscreen: true,
        title: 'TermUI Quiz App',
        fps: 30,
    });

    app.events.on('key', (event: KeyEvent) => {
        const shouldContinue = quiz.handleKey(event);
        if (!shouldContinue) app.exit(0);
        app.requestRender();
    });

    const exitCode = await app.mount();
    process.exit(exitCode);
}

main().catch((err) => {
    console.error('Quiz app error:', err);
    process.exit(1);
});
