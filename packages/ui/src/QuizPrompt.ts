import { Widget } from '@termuijs/widgets';
import { type Style, type Screen, type KeyEvent, mergeStyles, defaultStyle, styleToCellAttrs, caps } from '@termuijs/core';

export interface QuizQuestion {
    question: string;
    options: string[];
    correctIndex: number;
}

export interface QuizResult {
    total: number;
    correct: number;
    answers: number[];
}

export interface QuizPromptOptions {
    correctColor?: Style['fg'];
    wrongColor?: Style['fg'];
    onComplete?: (result: QuizResult) => void;
}

export class QuizPrompt extends Widget {
    private _questions: QuizQuestion[];
    private _currentIndex: number = 0;
    private _selectedIndex: number = -1;
    private _answers: number[] = [];
    private _feedback: 'correct' | 'wrong' | null = null;
    private _feedbackTimeout: ReturnType<typeof setTimeout> | null = null;
    private _correctColor: Style['fg'];
    private _wrongColor: Style['fg'];
    private _onComplete?: (result: QuizResult) => void;
    focusable = true;

    constructor(questions: QuizQuestion[], style?: Partial<Style>, opts?: QuizPromptOptions) {
        super(mergeStyles(defaultStyle(), style ?? {}));
        this._questions = questions;
        this._correctColor = opts?.correctColor ?? { type: 'named', name: 'green' };
        this._wrongColor = opts?.wrongColor ?? { type: 'named', name: 'red' };
        this._onComplete = opts?.onComplete;
    }

    getResult(): QuizResult {
        let correct = 0;
        for (let i = 0; i < this._answers.length; i++) {
            if (this._answers[i] === this._questions[i].correctIndex) {
                correct++;
            }
        }
        return {
            total: this._answers.length,
            correct,
            answers: [...this._answers],
        };
    }

    handleKey(event: KeyEvent): void {
        if (this._currentIndex >= this._questions.length) return;
        
        const currentQuestion = this._questions[this._currentIndex];
        const optionsCount = currentQuestion.options.length;
        
        switch (event.key) {
            case 'up':
                if (this._selectedIndex > 0) {
                    this._selectedIndex--;
                    this.markDirty();
                }
                break;
            case 'down':
                if (this._selectedIndex < optionsCount - 1) {
                    this._selectedIndex++;
                    this.markDirty();
                }
                break;
            case 'enter':
                if (this._selectedIndex >= 0 && this._feedback === null) {
                    this.submitAnswer();
                }
                break;
        }
    }
    
    private submitAnswer(): void {
        const isCorrect = this._selectedIndex === this._questions[this._currentIndex].correctIndex;
        this._answers[this._currentIndex] = this._selectedIndex;
        
        // Show feedback
        this._feedback = isCorrect ? 'correct' : 'wrong';
        this.markDirty();
        
        // Clear feedback after a short delay and advance
        if (this._feedbackTimeout) clearTimeout(this._feedbackTimeout);
        this._feedbackTimeout = setTimeout(() => {
            this._feedback = null;
            this._selectedIndex = -1;
            this._currentIndex++;
            this.markDirty();
            
            if (this._currentIndex >= this._questions.length) {
                this._onComplete?.(this.getResult());
            }
            
            this._feedbackTimeout = null;
        }, 800);
    }

    override destroy(): void {
        this.clearFeedbackTimeout();
        super.destroy();
    }

    override unmount(): void {
        this.clearFeedbackTimeout();
        super.unmount();
    }

    private clearFeedbackTimeout(): void {
        if (this._feedbackTimeout) {
            clearTimeout(this._feedbackTimeout);
            this._feedbackTimeout = null;
        }
    }

    protected _renderSelf(screen: Screen): void {
        const { x, y, width, height } = this._rect;
        if (width <= 0 || height <= 0) return;
        
        const attrs = styleToCellAttrs(this.style);
        
        if (this._currentIndex >= this._questions.length) {
            // Show completion screen
            const result = this.getResult();
            const scoreText = `Quiz Complete! Score: ${result.correct}/${result.total}`;
            screen.writeString(x, y, scoreText.slice(0, width), attrs);
            return;
        }
        
        const currentQuestion = this._questions[this._currentIndex];
        let row = 0;
        
        // Render question
        const questionText = `${this._currentIndex + 1}. ${currentQuestion.question}`;
        screen.writeString(x, y + row, questionText.slice(0, width), { ...attrs, bold: true });
        row += 2;
        
        // Render options
        for (let i = 0; i < currentQuestion.options.length && row < height; i++) {
            const option = currentQuestion.options[i];
            const isSelected = this._selectedIndex === i;
            const cursor = isSelected ? (caps.unicode ? '❯ ' : '> ') : '  ';
            const indicator = this._feedback !== null && i === currentQuestion.correctIndex && this._feedback === 'correct' ? ' ✓' : '';
            const feedbackColor = this._feedback === 'correct' && i === currentQuestion.correctIndex ? this._correctColor :
                                 this._feedback === 'wrong' && i === this._selectedIndex ? this._wrongColor : attrs.fg;
            
            const line = `${cursor}${i + 1}. ${option}${indicator}`;
            screen.writeString(x, y + row, line.slice(0, width), {
                ...attrs,
                fg: feedbackColor,
                bold: isSelected,
            });
            row++;
        }
        
        // Render feedback message
        if (this._feedback === 'correct') {
            screen.writeString(x, y + row, '✓ Correct!'.slice(0, width), { ...attrs, fg: this._correctColor });
        } else if (this._feedback === 'wrong') {
            const correctIndex = currentQuestion.correctIndex;
            const correctText = `✗ Wrong. Correct answer: ${correctIndex + 1}. ${currentQuestion.options[correctIndex]}`;
            screen.writeString(x, y + row, correctText.slice(0, width), { ...attrs, fg: this._wrongColor });
        }
    }
}
