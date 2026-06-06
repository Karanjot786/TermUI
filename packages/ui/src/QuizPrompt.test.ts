import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QuizPrompt } from './QuizPrompt.js';

const SAMPLE_QUESTIONS = [
    {
        question: 'What is 2+2?',
        options: ['3', '4', '5'],
        correctIndex: 1,
    },
    {
        question: 'What color is the sky?',
        options: ['Red', 'Green', 'Blue'],
        correctIndex: 2,
    },
];

describe('QuizPrompt', () => {
    it('initializes with first question', () => {
        const quiz = new QuizPrompt(SAMPLE_QUESTIONS);
        const result = quiz.getResult();
        expect(result.total).toBe(0);
        expect(result.correct).toBe(0);
        expect(result.answers).toEqual([]);
    });

    it('handleKey moves selection with up/down', () => {
        const quiz = new QuizPrompt(SAMPLE_QUESTIONS);
        const markDirtySpy = vi.spyOn(quiz, 'markDirty');

        quiz.handleKey({ key: 'down' } as any) // test: only key field needed, full KeyEvent construction unnecessary;
        expect(quiz['_selectedIndex']).toBe(0);
        expect(markDirtySpy).toHaveBeenCalled();

        quiz.handleKey({ key: 'down' } as any) // test: only key field needed, full KeyEvent construction unnecessary;
        expect(quiz['_selectedIndex']).toBe(1);

        quiz.handleKey({ key: 'up' } as any) // test: only key field needed, full KeyEvent construction unnecessary;
        expect(quiz['_selectedIndex']).toBe(0);
    });

    it('handleKey does not move beyond bounds', () => {
        const quiz = new QuizPrompt(SAMPLE_QUESTIONS);
        quiz.handleKey({ key: 'up' } as any) // test: only key field needed, full KeyEvent construction unnecessary;
        expect(quiz['_selectedIndex']).toBe(-1);

        quiz.handleKey({ key: 'down' } as any) // test: only key field needed, full KeyEvent construction unnecessary;
        quiz.handleKey({ key: 'down' } as any) // test: only key field needed, full KeyEvent construction unnecessary;
        quiz.handleKey({ key: 'down' } as any) // test: only key field needed, full KeyEvent construction unnecessary;
        quiz.handleKey({ key: 'down' } as any) // test: only key field needed, full KeyEvent construction unnecessary;
        expect(quiz['_selectedIndex']).toBe(2);
    });

    it('enter submits answer and advances after timeout', async () => {
        vi.useFakeTimers();
        const quiz = new QuizPrompt(SAMPLE_QUESTIONS);
        quiz.handleKey({ key: 'down' } as any) // test: only key field needed, full KeyEvent construction unnecessary;
        quiz.handleKey({ key: 'enter' } as any) // test: only key field needed, full KeyEvent construction unnecessary;

        expect(quiz['_answers'][0]).toBe(0);
        expect(quiz['_feedback']).toBe('wrong');

        vi.advanceTimersByTime(800);

        expect(quiz['_feedback']).toBe(null);
        expect(quiz['_currentIndex']).toBe(1);
        expect(quiz['_selectedIndex']).toBe(-1);
        vi.useRealTimers();
    });

    it('onComplete fires after all questions', async () => {
        vi.useFakeTimers();
        const onComplete = vi.fn();
        const quiz = new QuizPrompt(SAMPLE_QUESTIONS, undefined, { onComplete });

        // Answer first question correctly
        quiz.handleKey({ key: 'down' } as any) // test: only key field needed, full KeyEvent construction unnecessary;
        quiz.handleKey({ key: 'down' } as any) // test: only key field needed, full KeyEvent construction unnecessary;
        quiz.handleKey({ key: 'enter' } as any) // test: only key field needed, full KeyEvent construction unnecessary;
        vi.advanceTimersByTime(800);

        // Answer second question correctly
        quiz.handleKey({ key: 'down' } as any) // test: only key field needed, full KeyEvent construction unnecessary;
        quiz.handleKey({ key: 'down' } as any) // test: only key field needed, full KeyEvent construction unnecessary;
        quiz.handleKey({ key: 'down' } as any) // test: only key field needed, full KeyEvent construction unnecessary;
        quiz.handleKey({ key: 'enter' } as any) // test: only key field needed, full KeyEvent construction unnecessary;
        vi.advanceTimersByTime(800);

        expect(onComplete).toHaveBeenCalledTimes(1);
        const result = onComplete.mock.calls[0][0];
        expect(result.total).toBe(2);
        expect(result.correct).toBe(2);
        vi.useRealTimers();
    });

    it('getResult returns partial results', () => {
        const quiz = new QuizPrompt(SAMPLE_QUESTIONS);
        quiz['_answers'] = [0];

        const result = quiz.getResult();
        expect(result.total).toBe(1);
        expect(result.answers).toEqual([0]);
    });
});
