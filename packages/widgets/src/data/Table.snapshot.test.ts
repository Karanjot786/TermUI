import { describe, it, expect } from 'vitest';
import { Screen } from '@termuijs/core';
import { Table } from './Table.js';

const screenText = (screen: Screen): string =>
    screen.back.map(r => r.map(c => c.char).join('')).join('\n');

describe('Table snapshot tests', () => {
    it('renders 3-column table', () => {
        const table = new Table(
            [
                { key: 'name', header: 'Name', width: 10 },
                { key: 'age', header: 'Age', width: 5 },
                { key: 'role', header: 'Role', width: 10 },
            ],
            [
                { name: 'Alice', age: 22, role: 'Dev' },
            ]
        );

        table.updateRect({ x: 0, y: 0, width: 40, height: 10 });

        const screen = new Screen(40, 10);
        table.render(screen);

        expect(screenText(screen)).toMatchSnapshot();
    });

    it('renders headers only when rows are empty', () => {
        const table = new Table(
            [
                { key: 'name', header: 'Name', width: 10 },
                { key: 'age', header: 'Age', width: 5 },
            ],
            []
        );

        table.updateRect({ x: 0, y: 0, width: 30, height: 10 });

        const screen = new Screen(30, 10);
        table.render(screen);

        expect(screenText(screen)).toMatchSnapshot();
    });

    it('truncates long content', () => {
        const table = new Table(
            [
                { key: 'name', header: 'Name', width: 8 },
                { key: 'role', header: 'Role', width: 8 },
            ],
            [
                {
                    name: 'VeryLongNameThatShouldCut',
                    role: 'VeryLongRoleName',
                },
            ]
        );

        table.updateRect({ x: 0, y: 0, width: 25, height: 10 });

        const screen = new Screen(25, 10);
        table.render(screen);

        expect(screenText(screen)).toMatchSnapshot();
    });
});
