import { describe, it, expect } from 'vitest';
import { parseArgs } from './args.js';

describe('parseArgs', () => {
    it('parses add with multiple components', () => {
        expect(parseArgs(['add', 'spinner', 'table'])).toEqual({
            command: 'add', components: ['spinner', 'table'], dir: undefined, dryRun: false, yes: false,
        });
    });
    it('parses flags', () => {
        const r = parseArgs(['add', 'spinner', '--dir', 'src/ui', '--dry-run', '--yes']);
        expect(r.dir).toBe('src/ui');
        expect(r.dryRun).toBe(true);
        expect(r.yes).toBe(true);
    });
    it('defaults to help when no command', () => {
        expect(parseArgs([]).command).toBe('help');
    });
    it('parses list', () => {
        expect(parseArgs(['list']).command).toBe('list');
    });
});
