import { describe, it, expect, afterEach } from 'vitest';
import { installArgs, detectPackageManager } from './pm.js';

describe('installArgs', () => {
    it('uses install for npm/pnpm, add for yarn/bun', () => {
        expect(installArgs('npm', ['a', 'b'])).toEqual(['install', 'a', 'b']);
        expect(installArgs('pnpm', ['a'])).toEqual(['install', 'a']);
        expect(installArgs('bun', ['a'])).toEqual(['add', 'a']);
        expect(installArgs('yarn', ['a'])).toEqual(['add', 'a']);
    });
});

describe('detectPackageManager', () => {
    const originalAgent = process.env.npm_config_user_agent;
    const originalExecpath = process.env.npm_execpath;

    afterEach(() => {
        process.env.npm_config_user_agent = originalAgent ?? '';
        process.env.npm_execpath = originalExecpath ?? '';
        delete process.env.npm_config_user_agent;
        delete process.env.npm_execpath;
    });

    it('returns npm by default when both env vars are unset', () => {
        delete process.env.npm_config_user_agent;
        delete process.env.npm_execpath;
        expect(detectPackageManager()).toBe('npm');
    });

    it('returns npm by default when both env vars are empty', () => {
        process.env.npm_config_user_agent = '';
        process.env.npm_execpath = '';
        expect(detectPackageManager()).toBe('npm');
    });

    it('returns bun when npm_config_user_agent starts with bun/', () => {
        process.env.npm_config_user_agent = 'bun/1.0.0';
        delete process.env.npm_execpath;
        expect(detectPackageManager()).toBe('bun');
    });

    it('returns pnpm when npm_config_user_agent starts with pnpm/', () => {
        process.env.npm_config_user_agent = 'pnpm/8.0.0';
        delete process.env.npm_execpath;
        expect(detectPackageManager()).toBe('pnpm');
    });

    it('returns yarn when npm_config_user_agent starts with yarn/', () => {
        process.env.npm_config_user_agent = 'yarn/3.0.0';
        delete process.env.npm_execpath;
        expect(detectPackageManager()).toBe('yarn');
    });

    it('returns npm when npm_config_user_agent starts with npm/', () => {
        process.env.npm_config_user_agent = 'npm/9.0.0';
        delete process.env.npm_execpath;
        expect(detectPackageManager()).toBe('npm');
    });

    it('falls back to npm_execpath pnpm when user_agent is empty', () => {
        process.env.npm_config_user_agent = '';
        process.env.npm_execpath = '/usr/lib/node_modules/pnpm/bin/pnpm.js';
        expect(detectPackageManager()).toBe('pnpm');
    });

    it('falls back to npm_execpath yarn when user_agent is empty', () => {
        process.env.npm_config_user_agent = '';
        process.env.npm_execpath = '/usr/bin/yarn.js';
        expect(detectPackageManager()).toBe('yarn');
    });

    it('falls back to npm_execpath bun when user_agent is empty', () => {
        process.env.npm_config_user_agent = '';
        process.env.npm_execpath = '/usr/local/bin/bun';
        expect(detectPackageManager()).toBe('bun');
    });

    it('user_agent takes precedence over npm_execpath when both are set', () => {
        process.env.npm_config_user_agent = 'yarn/3.0.0';
        process.env.npm_execpath = '/usr/lib/node_modules/pnpm/bin/pnpm.js';
        expect(detectPackageManager()).toBe('yarn');
    });
});
