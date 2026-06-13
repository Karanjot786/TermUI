import { describe, it, expect, vi } from 'vitest';
import { Screen, createKeyEvent, caps } from '@termuijs/core';
import { Slider, RangeInput } from './Slider.js';

function key(name: string) {
    return createKeyEvent({
        key: name,
        raw: Buffer.from(''),
        ctrl: false,
        alt: false,
        shift: false,
    });
}

function renderSlider() {
    const slider = new Slider({}, {
        min: 0,
        max: 100,
        step: 5,
        value: 20,
    });

    const screen = new Screen(20, 1);

    slider.updateRect({
        x: 0,
        y: 0,
        width: 20,
        height: 1,
    });

    slider.render(screen);

    return { slider, screen };
}

describe('Slider', () => {
    it('right key increments value', () => {
        const { slider } = renderSlider();

        slider.handleKey(key('right'));

        expect(slider.getValue()).toBe(25);
    });

    it('left key decrements value', () => {
        const { slider } = renderSlider();

        slider.handleKey(key('left'));

        expect(slider.getValue()).toBe(15);
    });

    it('clamps at max', () => {
        const slider = new Slider({}, {
            min: 0,
            max: 100,
            step: 5,
            value: 100,
        });

        slider.handleKey(key('right'));

        expect(slider.getValue()).toBe(100);
    });

    it('fires onChange callback', () => {
        const onChange = vi.fn();

        const slider = new Slider({}, {
            min: 0,
            max: 100,
            step: 5,
            value: 20,
            onChange,
        });

        slider.handleKey(key('right'));

        expect(onChange).toHaveBeenCalledWith(25);
    });

    it('renders ASCII fallback', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);

        const slider = new Slider({}, {
            min: 0,
            max: 100,
            value: 50,
        });

        const screen = new Screen(10, 1);

        slider.updateRect({
            x: 0,
            y: 0,
            width: 10,
            height: 1,
        });

        slider.render(screen);

        const rendered = screen.back[0]
            .map((c: { char: string }) => c.char)
            .join('');

        expect(rendered).toContain('O');
    });

    it('stores low and high values', () => {
        const range = new RangeInput({}, {
            min: 0,
            max: 100,
            low: 20,
            high: 80,
        });

        expect(range.getLow()).toBe(20);
        expect(range.getHigh()).toBe(80);
    });

    it('renders two handles', () => {
        vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);

        const range = new RangeInput({}, {
            min: 0,
            max: 100,
            low: 20,
            high: 80,
        });

        const screen = new Screen(20, 1);

        range.updateRect({
            x: 0,
            y: 0,
            width: 20,
            height: 1,
        });

        range.render(screen);

        const rendered = screen.back[0]
            .map((c: { char: string }) => c.char)
            .join('');

        const handles = rendered
            .split('')
            .filter((ch) => ch === 'O')
            .length;

        expect(handles).toBe(2);
    });
});