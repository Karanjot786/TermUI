// ─────────────────────────────────────────────────────
// Flashcard App — built with @termuijs/core + @termuijs/widgets
//
// Showcases: flip interaction, keyboard navigation,
// self-marking (known/unknown), summary screen
// ─────────────────────────────────────────────────────

import { App, type KeyEvent, type Screen } from '@termuijs/core';
import { Widget, Box, Text, Center } from '@termuijs/widgets';

// ── Types ─────────────────────────────────────────────

interface Flashcard {
    question: string;
    answer: string;
}

// ── Flashcard Data ────────────────────────────────────

const CARDS: Flashcard[] = [
    { question: 'What does HTML stand for?',                     answer: 'HyperText Markup Language' },
    { question: 'What is a closure in JavaScript?',              answer: 'A function that retains access to its outer scope even after the outer function returns.' },
    { question: 'What does CSS stand for?',                      answer: 'Cascading Style Sheets' },
    { question: 'What is the time complexity of binary search?', answer: 'O(log n)' },
    { question: 'What does DOM stand for?',                      answer: 'Document Object Model' },
    { question: 'What is a REST API?',                           answer: 'An API that follows Representational State Transfer principles using HTTP methods.' },
    { question: 'What is TypeScript?',                           answer: 'A strongly typed superset of JavaScript that compiles to plain JavaScript.' },
];

// ── Constants ─────────────────────────────────────────

const WIDGET_WIDTH  = 72;
const WIDGET_HEIGHT = 20;

// ── FlashcardApp Widget ───────────────────────────────

class FlashcardApp extends Widget {
    private cardIndex = 0;
    private flipped   = false;
    private known     = new Set<number>();
    private unknown   = new Set<number>();
    private done      = false;

    private _header:   Text;
    private _cardBody: Text;
    private _hint:     Text;
    private _feedback: Text;
    private _footer:   Text;

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

        const divider = new Text(
            '─'.repeat(66),
            { height: 1, fg: { type: 'named', name: 'brightBlack' } },
            { align: 'left' }
        );

        const gap1 = new Box({ height: 1 });

        this._cardBody = new Text(
            this.cardBodyText(),
            { bold: true, height: 3, fg: { type: 'named', name: 'white' } },
            { align: 'center', wrap: true }
        );

        const gap2 = new Box({ height: 1 });

        this._hint = new Text(
            this.hintText(),
            { height: 1, fg: { type: 'named', name: 'brightBlack' } },
            { align: 'center' }
        );

        const gap3 = new Box({ height: 1 });

        this._feedback = new Text(
            '',
            { bold: true, height: 1, fg: { type: 'named', name: 'green' } },
            { align: 'center' }
        );

        const gap4 = new Box({ height: 1 });

        this._footer = new Text(
            this.footerText(),
            { height: 1, fg: { type: 'named', name: 'brightBlack' } },
            { align: 'center' }
        );

        this.addChild(this._header);
        this.addChild(divider);
        this.addChild(gap1);
        this.addChild(this._cardBody);
        this.addChild(gap2);
        this.addChild(this._hint);
        this.addChild(gap3);
        this.addChild(this._feedback);
        this.addChild(gap4);
        this.addChild(this._footer);
    }

    // ── Text helpers ──────────────────────────────────

    private currentCard(): Flashcard {
        return CARDS[this.cardIndex];
    }

    private headerText(): string {
        if (this.done) return ' Study Complete! ';
        const side = this.flipped ? 'Answer' : 'Question';
        return ` Card ${this.cardIndex + 1} / ${CARDS.length}  ·  ${side} `;
    }

    private cardBodyText(): string {
        if (this.done) {
            const pct = Math.round((this.known.size / CARDS.length) * 100);
            return `Known: ${this.known.size}   Unknown: ${this.unknown.size}   Score: ${pct}%`;
        }
        return this.flipped
            ? this.currentCard().answer
            : this.currentCard().question;
    }

    private hintText(): string {
        if (this.done) return '';
        return this.flipped
            ? '[ y ] I knew it   [ n ] Still learning'
            : '[ Space ] Flip to see answer';
    }

    private footerText(): string {
        if (this.done) return '[ r ] Restart   [ q ] Quit';
        return '[ ← ] Prev   [ → ] Next   [ q ] Quit';
    }

    // ── State updates ─────────────────────────────────

    private flip(): void {
        this.flipped = !this.flipped;
        this.refresh();
    }

    private markKnown(): void {
        if (!this.flipped) return;
        this.known.add(this.cardIndex);
        this.unknown.delete(this.cardIndex);
        this._feedback.setStyle({ fg: { type: 'named', name: 'green' }, bold: true, height: 1 });
        this._feedback.setContent('Marked as known!');
        this.advance();
    }

    private markUnknown(): void {
        if (!this.flipped) return;
        this.unknown.add(this.cardIndex);
        this.known.delete(this.cardIndex);
        this._feedback.setStyle({ fg: { type: 'named', name: 'red' }, bold: true, height: 1 });
        this._feedback.setContent('Keep practicing!');
        this.advance();
    }

    private advance(): void {
        if (this.cardIndex < CARDS.length - 1) {
            this.cardIndex++;
            this.flipped = false;
            this.refresh();
        } else {
            this.showSummary();
        }
    }

    private goNext(): void {
        if (this.cardIndex < CARDS.length - 1) {
            this.cardIndex++;
            this.flipped = false;
            this._feedback.setContent('');
            this.refresh();
        }
    }

    private goPrev(): void {
        if (this.cardIndex > 0) {
            this.cardIndex--;
            this.flipped = false;
            this._feedback.setContent('');
            this.refresh();
        }
    }

    private showSummary(): void {
    this.done = true;
    this._feedback.setContent('');
    this.refresh();
}

    private restart(): void {
        this.cardIndex = 0;
        this.flipped   = false;
        this.done      = false;
        this.known.clear();
        this.unknown.clear();
        this._feedback.setContent('');
        this.refresh();
    }

    private refresh(): void {
        this._header.setContent(this.headerText());
        this._cardBody.setContent(this.cardBodyText());
        this._hint.setContent(this.hintText());
        this._footer.setContent(this.footerText());
        this.markDirty();
    }

    // ── Key handling ──────────────────────────────────

    handleKey(event: KeyEvent): boolean {
        if (event.key === 'q' || (event.ctrl && event.key === 'c')) return false;

        if (this.done) {
            if (event.key === 'r') this.restart();
            return true;
        }

        if (event.key === 'space') { this.flip();        return true; }
        if (event.key === 'y')     { this.markKnown();   return true; }
        if (event.key === 'n')     { this.markUnknown(); return true; }
        if (event.key === 'right') { this.goNext();      return true; }
        if (event.key === 'left')  { this.goPrev();      return true; }

        return true;
    }

    protected _renderSelf(_screen: Screen): void {
        // children handle all rendering
    }
}

// ── Application entry ─────────────────────────────────

async function main() {
    const flashcard = new FlashcardApp();

    const center = new Center({}, { horizontal: true, vertical: true });
    center.addChild(flashcard);

    const app = new App(center, {
        fullscreen: true,
        title: 'TermUI Flashcard App',
        fps: 30,
    });

    app.events.on('key', (event: KeyEvent) => {
        const shouldContinue = flashcard.handleKey(event);
        if (!shouldContinue) app.exit(0);
        app.requestRender();
    });

    const exitCode = await app.mount();
    process.exit(exitCode);
}

main().catch((err) => {
    console.error('Flashcard app error:', err);
    process.exit(1);
});
