import { Widget } from "@termuijs/widgets";
import {
    type Style,
    type Screen,
    type KeyEvent,
    mergeStyles,
    defaultStyle,
    styleToCellAttrs,
    caps,
    splitGraphemes,
    truncate,
} from "@termuijs/core";

export interface SurveyQuestion {
    id: string;
    question: string;
    type: "text" | "choice";
    options?: string[];
}

export interface SurveyPromptOptions {
    onComplete?: (answers: Record<string, string>) => void;
}

export class SurveyPrompt extends Widget {
    private _questions: SurveyQuestion[];
    private _currentIndex = 0;
    private _answers: Record<string, string> = {};

    private _textBuffer = "";
    private _choiceIndex = 0;

    private _onComplete?: (answers: Record<string, string>) => void;

    focusable = true;

    constructor(
        questions: SurveyQuestion[],
        style?: Partial<Style>,
        opts?: SurveyPromptOptions,
    ) {
        super(mergeStyles(defaultStyle(), style ?? {}));

        this._questions = questions;
        this._onComplete = opts?.onComplete;
    }

    getAnswers(): Record<string, string> {
        return { ...this._answers };
    }

    getCurrentIndex(): number {
        return this._currentIndex;
    }
    private _advance(): void {
        this._currentIndex++;

        this._textBuffer = "";
        this._choiceIndex = 0;

        if (this._currentIndex >= this._questions.length) {
            this._onComplete?.({ ...this._answers });
        }

        this.markDirty();
    }

    handleKey(event: KeyEvent): void {
        if (this._currentIndex >= this._questions.length) return;

        const question = this._questions[this._currentIndex];

        if (question.type === "text") {
            switch (event.key) {
                case "backspace":
                    this._textBuffer = splitGraphemes(this._textBuffer).slice(0, -1).join("");
                    this.markDirty();
                    break;

                case "enter":
                    this._answers[question.id] = this._textBuffer;
                    this._advance();
                    break;

                default:
                    if (
                        event.key &&
                        event.key.length === 1 &&
                        !event.ctrl &&
                        !event.alt
                    ) {
                        this._textBuffer += event.key;
                        this.markDirty();
                    }
            }

            return;
        }

        switch (event.key) {
            case "up":
                if (this._choiceIndex > 0) {
                    this._choiceIndex--;
                    this.markDirty();
                }
                break;

            case "down":
                if (
                    question.options &&
                    this._choiceIndex < question.options.length - 1
                ) {
                    this._choiceIndex++;
                    this.markDirty();
                }
                break;

            case "enter":
                if (question.options?.length) {
                    this._answers[question.id] =
                        question.options[this._choiceIndex];
                    this._advance();
                }
                break;
        }
    }

    protected _renderSelf(screen: Screen): void {
        const { x, y, width, height } = this._getContentRect();

        if (width <= 0 || height <= 0) return;

        const attrs = styleToCellAttrs(this.style);

        if (this._currentIndex >= this._questions.length) {
            screen.writeString(x, y, truncate("Survey Complete", width, ""), attrs);
            return;
        }

        const question = this._questions[this._currentIndex];

        let row = 0;

        screen.writeString(
            x,
            y + row,
            truncate(`${this._currentIndex + 1} / ${this._questions.length}`, width, ""),
            attrs,
        );
        row += 2;

        screen.writeString(x, y + row, truncate(question.question, width, ""), {
            ...attrs,
            bold: true,
        });
        row += 2;

        if (question.type === "text") {
            screen.writeString(
                x,
                y + row,
                truncate(this._textBuffer, width, ""),
                attrs,
            );
            return;
        }

        const options = question.options ?? [];

        for (let i = 0; i < options.length && row < height; i++) {
            const active = i === this._choiceIndex;

            const prefix = active ? (caps.unicode ? "❯ " : "> ") : "  ";

            screen.writeString(
                x,
                y + row,
                truncate(`${prefix}${options[i]}`, width, ""),
                {
                    ...attrs,
                    bold: active,
                },
            );

            row++;
        }
    }
}
