import { describe, it, expect, vi, afterEach } from 'vitest';
import { Avatar } from './Avatar.js';
import { Screen, caps } from '@termuijs/core';

/** Helper: create widget, set rect, render to a screen, return both. */
function renderAvatar(
    initials: string,
    opts: ConstructorParameters<typeof Avatar>[2] = {},
    width = 10,
    height = 5
) {
    const avatar = new Avatar(initials, {}, opts);
    const screen = new Screen(width, height);
    avatar.updateRect({ x: 0, y: 0, width, height });
    avatar.render(screen);
    return { avatar, screen };
}

describe('Avatar Widget', () => {

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('renders initials centered in the widget area', () => {
        const { screen } = renderAvatar('AB', { border: 'none' }, 10, 5);
        
        // 10 width center is index 4. 'AB' takes 4 and 5. Height 5 center is index 2.
        // screen.back[row][col].char
        expect(screen.back[2][4].char).toBe('A');
        expect(screen.back[2][5].char).toBe('B');
    });

    it('truncates long initials to 2 characters', () => {
        const { screen } = renderAvatar('XYZ', { border: 'none' }, 10, 5);
        
        expect(screen.back[2][4].char).toBe('X');
        expect(screen.back[2][5].char).toBe('Y');
        
        // Ensure the third character 'Z' didn't bleed into the buffer
        // Note: Unless a background color was provided, 'none' borders leave the cell undefined/empty
        const nextCell = screen.back[2][6];
        expect(nextCell ? nextCell.char : ' ').not.toBe('Z'); 
    });

    it('setInitials updates the rendered text and calls markDirty', () => {
        const { avatar, screen } = renderAvatar('AB', { border: 'none' }, 10, 5);
        
        // Clear dirty flag set during initialization
        // @ts-ignore: Accessing base widget method if not strictly typed
        if(typeof avatar.clearDirty === 'function') avatar.clearDirty();
        
        avatar.setInitials('CD');
        
        // @ts-ignore
        expect(avatar.isDirty).toBe(true);
        
        // Re-render to catch changes
        avatar.render(screen);

        expect(screen.back[2][4].char).toBe('C');
        expect(screen.back[2][5].char).toBe('D');
    });

    it('renders standard unicode borders by default', () => {
        const { screen } = renderAvatar('AB', { border: 'single' }, 10, 5);

        // Check Top-Left corner for '┌'
        expect(screen.back[0][0].char).toBe('┌');
        // Check Bottom-Right corner for '┘'
        expect(screen.back[4][9].char).toBe('┘');
    });

    it('uses ASCII fallback for border characters when caps.unicode is false', () => {
        // Spy on caps.unicode to simulate an ASCII-only terminal securely per the spec
        const unicodeSpy = vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);

        const { screen } = renderAvatar('AB', { border: 'single' }, 10, 5);

        // Check Top-Left corner for ASCII '+'
        expect(screen.back[0][0].char).toBe('+');
        // Check horizontal line for ASCII '-'
        expect(screen.back[0][1].char).toBe('-');
        // Check vertical line for ASCII '|'
        expect(screen.back[1][0].char).toBe('|');
        
        unicodeSpy.mockRestore();
    });
});