import { describe, it, expect, vi } from 'vitest';
import { Screen } from '@termuijs/core';
import { Box, Widget } from '@termuijs/widgets';
import { AppShell } from './AppShell.js';

const COLORS = {
    header: { type: 'named' as const, name: 'red' as const },
    footer: { type: 'named' as const, name: 'blue' as const },
    sidebar: { type: 'named' as const, name: 'green' as const },
    main: { type: 'named' as const, name: 'yellow' as const },
};

function createShell() {
    return new AppShell({
        header: new Box({ bg: COLORS.header }),
        footer: new Box({ bg: COLORS.footer }),
        sidebar: new Box({ bg: COLORS.sidebar }),
        main: new Box({ bg: COLORS.main }),
        sidebarWidth: 6,
    });
}

class LinesWidget extends Widget {
    constructor(private readonly _lines: string[]) {
        super();
    }

    protected _renderSelf(screen: Screen): void {
        const { x, y, width } = this.rect;
        for (let i = 0; i < this._lines.length; i++) {
            screen.writeString(x, y + i, this._lines[i].slice(0, width));
        }
    }
}

describe('AppShell', () => {
    it('renders header at the top', () => {
        const shell = createShell();
        shell.updateRect({ x: 0, y: 0, width: 20, height: 10 });
        const screen = new Screen(20, 10);
        shell.render(screen);

        expect(screen.back[0][0].bg).toEqual(COLORS.header);
    });

    it('renders footer at the bottom', () => {
        const shell = createShell();
        shell.updateRect({ x: 0, y: 0, width: 20, height: 10 });
        const screen = new Screen(20, 10);
        shell.render(screen);

        expect(screen.back[9][0].bg).toEqual(COLORS.footer);
    });

    it('respects sidebar width', () => {
        const shell = createShell();
        shell.updateRect({ x: 0, y: 0, width: 20, height: 10 });
        const screen = new Screen(20, 10);
        shell.render(screen);

        expect(screen.back[1][5].bg).toEqual(COLORS.sidebar);
        expect(screen.back[1][6].bg).toEqual(COLORS.main);
    });

    it('fills the remaining main area', () => {
        const shell = createShell();
        shell.updateRect({ x: 0, y: 0, width: 20, height: 10 });
        const screen = new Screen(20, 10);
        shell.render(screen);

        expect(screen.back[4][10].bg).toEqual(COLORS.main);
        expect(screen.back[5][19].bg).toEqual(COLORS.main);
    });

    it('toggleSidebar hides and shows the sidebar', () => {
        const shell = createShell();
        shell.updateRect({ x: 0, y: 0, width: 20, height: 10 });

        const visibleScreen = new Screen(20, 10);
        shell.render(visibleScreen);
        expect(visibleScreen.back[1][0].bg).toEqual(COLORS.sidebar);

        const dirtySpy = vi.spyOn(shell as any, 'markDirty');
        shell.toggleSidebar();
        expect(dirtySpy).toHaveBeenCalled();

        const hiddenScreen = new Screen(20, 10);
        shell.render(hiddenScreen);
        expect(hiddenScreen.back[1][0].bg).toEqual(COLORS.main);

        shell.toggleSidebar();
        const restoredScreen = new Screen(20, 10);
        shell.render(restoredScreen);
        expect(restoredScreen.back[1][0].bg).toEqual(COLORS.sidebar);
    });

    it('marks dirty when resized', () => {
        const shell = createShell();
        const dirtySpy = vi.spyOn(shell as any, 'markDirty');

        shell.handleResize(40, 12);

        expect(dirtySpy).toHaveBeenCalled();
        expect(shell.rect.width).toBe(40);
        expect(shell.rect.height).toBe(12);
    });

    it('scrolls main content with arrow keys', () => {
        const main = new LinesWidget(['A', 'B', 'C', 'D', 'E', 'F']);
        main.updateRect({ x: 0, y: 0, width: 20, height: 10 });

        const shell = new AppShell({
            header: new Box({ bg: COLORS.header }),
            footer: new Box({ bg: COLORS.footer }),
            main,
            sidebarWidth: 6,
        });

        shell.updateRect({ x: 0, y: 0, width: 20, height: 6 });

        const firstScreen = new Screen(20, 6);
        shell.render(firstScreen);
        expect(firstScreen.back[1][0].char).toBe('A');

        shell.handleKey({ key: 'ArrowDown', ctrl: false, alt: false } as any);

        const secondScreen = new Screen(20, 6);
        shell.render(secondScreen);
        expect(secondScreen.back[1][0].char).toBe('B');

        shell.handleKey({ key: 'ArrowUp', ctrl: false, alt: false } as any);

        const thirdScreen = new Screen(20, 6);
        shell.render(thirdScreen);
        expect(thirdScreen.back[1][0].char).toBe('A');
    });
});
