import { describe, it, expect, vi } from "vitest";
import { Screen } from "@termuijs/core";
import { SurveyPrompt } from "./SurveyPrompt.js";

describe("SurveyPrompt", () => {
    const QUESTIONS = [
        {
            id: "name",
            question: "What is your name?",
            type: "text" as const,
        },
        {
            id: "color",
            question: "Favorite color?",
            type: "choice" as const,
            options: ["Red", "Blue", "Green"],
        },
    ];

    it("renders the first question on mount", () => {
        const prompt = new SurveyPrompt(QUESTIONS);

        prompt.updateRect({ x: 0, y: 0, width: 40, height: 10 });

        const screen = new Screen(40, 10);
        prompt.render(screen);

        const text = screen.back
            .flat()
            .map((c) => c.char)
            .join("");

        expect(text).toContain("What is your name?");
        expect(text).toContain("1 / 2");
    });

    it("enter on a text question advances to question 2", () => {
        const prompt = new SurveyPrompt(QUESTIONS);

        // Partial KeyEvent object is sufficient for this test case.
        prompt.handleKey({ key: "J", ctrl: false, alt: false } as any);
        // Partial KeyEvent object is sufficient for this test case.
        prompt.handleKey({ key: "o", ctrl: false, alt: false } as any);
        // Partial KeyEvent object is sufficient for this test case.
        prompt.handleKey({ key: "e", ctrl: false, alt: false } as any);
        // Partial KeyEvent object is sufficient for this test case.
        prompt.handleKey({ key: "enter", ctrl: false, alt: false } as any);

        expect(prompt.getCurrentIndex()).toBe(1);
    });

    it("enter on a choice question records the answer and advances", () => {
        const prompt = new SurveyPrompt(QUESTIONS);

        prompt.handleKey({ key: "J", ctrl: false, alt: false } as any);
        prompt.handleKey({ key: "o", ctrl: false, alt: false } as any);
        prompt.handleKey({ key: "e", ctrl: false, alt: false } as any);
        prompt.handleKey({ key: "enter", ctrl: false, alt: false } as any);

        prompt.handleKey({ key: "down", ctrl: false, alt: false } as any);

        prompt.handleKey({ key: "enter", ctrl: false, alt: false } as any);

        expect(prompt.getAnswers()).toEqual({
            name: "Joe",
            color: "Blue",
        });

        expect(prompt.getCurrentIndex()).toBe(2);
    });

    it("onComplete fires after all questions answered", () => {
        const onComplete = vi.fn();

        const prompt = new SurveyPrompt(QUESTIONS, {}, { onComplete });

        prompt.handleKey({ key: "A", ctrl: false, alt: false } as any);
        prompt.handleKey({ key: "l", ctrl: false, alt: false } as any);
        prompt.handleKey({ key: "i", ctrl: false, alt: false } as any);
        prompt.handleKey({ key: "enter", ctrl: false, alt: false } as any);

        prompt.handleKey({ key: "enter", ctrl: false, alt: false } as any);

        expect(onComplete).toHaveBeenCalledTimes(1);

        expect(onComplete).toHaveBeenCalledWith({
            name: "Ali",
            color: "Red",
        });
    });

    it("getAnswers returns correct values", () => {
        const prompt = new SurveyPrompt(QUESTIONS);

        prompt.handleKey({ key: "B", ctrl: false, alt: false } as any);
        prompt.handleKey({ key: "o", ctrl: false, alt: false } as any);
        prompt.handleKey({ key: "b", ctrl: false, alt: false } as any);

        expect(prompt.getAnswers()).toEqual({});

        prompt.handleKey({ key: "enter", ctrl: false, alt: false } as any);

        expect(prompt.getAnswers()).toEqual({
            name: "Bob",
        });
    });
});
