/** @jsxImportSource @termuijs/jsx */
import { describe, it, expect, vi } from 'vitest';
import { render } from '@termuijs/testing';
import { RouterView } from './RouterView.js';
import { EventEmitter } from '@termuijs/core';

vi.mock('@termuijs/motion', () => {
    return {
        transition: vi.fn().mockImplementation((opts: any) => {
            Promise.resolve().then(() => {
            .catch(err => console.error(err))