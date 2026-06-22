// ─────────────────────────────────────────────────────
// @termuijs/core — Tests for CommandHistory
// ─────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { CommandHistory } from './CommandHistory.js';

describe('CommandHistory', () => {

    // ── constructor ──────────────────────────────────

    it('defaults maxSize to 100', () => {
        const ch = new CommandHistory();
        for (let i = 0; i < 101; i++) ch.add(`cmd${i}`);
        expect(ch.getAll()).toHaveLength(100);
    });

    it('respects custom maxSize', () => {
        const ch = new CommandHistory({ maxSize: 3 });
        ch.add('a');
        ch.add('b');
        ch.add('c');
        ch.add('d'); // evicts 'a'
        expect(ch.getAll()).toEqual(['b', 'c', 'd']);
    });

    // ── add ──────────────────────────────────────────

    it('add() stores a valid command', () => {
        const ch = new CommandHistory();
        ch.add('ls -la');
        expect(ch.getAll()).toContain('ls -la');
    });

    it('add() ignores empty string', () => {
        const ch = new CommandHistory();
        ch.add('');
        expect(ch.getAll()).toHaveLength(0);
    });

    it('add() ignores whitespace-only string', () => {
        const ch = new CommandHistory();
        ch.add('   ');
        expect(ch.getAll()).toHaveLength(0);
    });

    it('add() evicts oldest command when maxSize exceeded', () => {
        const ch = new CommandHistory({ maxSize: 2 });
        ch.add('first');
        ch.add('second');
        ch.add('third'); // evicts 'first'
        expect(ch.getAll()).not.toContain('first');
        expect(ch.getAll()).toContain('third');
    });

    // ── previous ─────────────────────────────────────

    it('previous() returns null when history is empty', () => {
        const ch = new CommandHistory();
        expect(ch.previous()).toBeNull();
    });

    it('previous() returns last command first', () => {
        const ch = new CommandHistory();
        ch.add('cmd1');
        ch.add('cmd2');
        expect(ch.previous()).toBe('cmd2');
    });

    it('previous() navigates backward through history', () => {
        const ch = new CommandHistory();
        ch.add('cmd1');
        ch.add('cmd2');
        ch.previous(); // cmd2
        expect(ch.previous()).toBe('cmd1');
    });

    it('previous() clamps at the first command', () => {
        const ch = new CommandHistory();
        ch.add('only');
        ch.previous();
        ch.previous(); // should stay at 'only'
        expect(ch.previous()).toBe('only');
    });

    // ── next ─────────────────────────────────────────

    it('next() returns null when history is empty', () => {
        const ch = new CommandHistory();
        expect(ch.next()).toBeNull();
    });

    it('next() returns null when past the last command', () => {
        const ch = new CommandHistory();
        ch.add('cmd1');
        ch.previous(); // go back
        ch.next();     // go forward to end
        expect(ch.next()).toBeNull();
    });

    it('next() navigates forward after going back', () => {
        const ch = new CommandHistory();
        ch.add('cmd1');
        ch.add('cmd2');
        ch.previous(); // cmd2
        ch.previous(); // cmd1
        expect(ch.next()).toBe('cmd2');
    });

    // ── search ───────────────────────────────────────

    it('search() returns matching commands', () => {
        const ch = new CommandHistory();
        ch.add('git status');
        ch.add('git commit');
        ch.add('ls -la');
        expect(ch.search('git')).toEqual(['git status', 'git commit']);
    });

    it('search() is case-insensitive', () => {
    const ch = new CommandHistory();
    ch.add('Git Status');
    expect(ch.search('git')).toEqual(['Git Status']);
});

    it('search() returns empty array when no match', () => {
        const ch = new CommandHistory();
        ch.add('ls -la');
        expect(ch.search('nonexistent')).toEqual([]);
    });

    // ── getAll ───────────────────────────────────────

    it('getAll() returns all commands in order', () => {
        const ch = new CommandHistory();
        ch.add('first');
        ch.add('second');
        expect(ch.getAll()).toEqual(['first', 'second']);
    });

    it('getAll() returns a copy not the internal array', () => {
        const ch = new CommandHistory();
        ch.add('cmd');
        const all = ch.getAll();
        all.push('injected');
        expect(ch.getAll()).toHaveLength(1);
    });

    // ── clear ────────────────────────────────────────

    it('clear() empties history', () => {
        const ch = new CommandHistory();
        ch.add('cmd1');
        ch.add('cmd2');
        ch.clear();
        expect(ch.getAll()).toHaveLength(0);
    });

    it('clear() resets navigation so previous() returns null', () => {
        const ch = new CommandHistory();
        ch.add('cmd1');
        ch.clear();
        expect(ch.previous()).toBeNull();
    });

    // ── export / import ──────────────────────────────

    it('export() serializes history to JSON string', () => {
        const ch = new CommandHistory();
        ch.add('cmd1');
        ch.add('cmd2');
        expect(ch.export()).toBe(JSON.stringify(['cmd1', 'cmd2']));
    });

    it('import() restores history from JSON string', () => {
        const ch = new CommandHistory();
        ch.import(JSON.stringify(['cmd1', 'cmd2']));
        expect(ch.getAll()).toEqual(['cmd1', 'cmd2']);
    });

    it('import() allows navigation after restore', () => {
        const ch = new CommandHistory();
        ch.import(JSON.stringify(['cmd1', 'cmd2']));
        expect(ch.previous()).toBe('cmd2');
    });
});