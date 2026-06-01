import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createFiber, setCurrentFiber, clearCurrentFiber } from '../hooks.js';
import { useModal } from './useModal.js';

describe('useModal', () => {
    let fiber: ReturnType<typeof createFiber>;

    function renderModal() {
        setCurrentFiber(fiber);
        const modal = useModal<{ message: string }, boolean>();
        clearCurrentFiber();
        return modal;
    }

    beforeEach(() => {
        fiber = createFiber();
    });

    afterEach(() => {
        clearCurrentFiber();
    });

    it('returns a Promise from show()', () => {
        const modal = renderModal();
        const result = modal.show({ message: 'Delete?' });

        expect(result).toBeInstanceOf(Promise);
    });

    it('dismiss(value) resolves the promise with the provided value', async () => {
        const modal = renderModal();
        const promise = modal.show({ message: 'Delete?' });

        modal.dismiss(true);

        await expect(promise).resolves.toBe(true);

        const updated = renderModal();
        expect(updated.visible).toBe(false);
        expect(updated.props).toBeUndefined();
    });

    it('hide() resolves undefined', async () => {
        const modal = renderModal();
        const promise = modal.show({ message: 'Cancel?' });

        modal.hide();

        await expect(promise).resolves.toBeUndefined();

        const updated = renderModal();
        expect(updated.visible).toBe(false);
        expect(updated.props).toBeUndefined();
    });

    it('queues multiple modals and processes them in FIFO order', async () => {
        const modal = renderModal();

        const first = modal.show({ message: 'First?' });
        const second = modal.show({ message: 'Second?' });

        const firstRender = renderModal();
        expect(firstRender.visible).toBe(true);
        expect(firstRender.props).toEqual({ message: 'First?' });

        modal.dismiss(false);
        await expect(first).resolves.toBe(false);

        const secondRender = renderModal();
        expect(secondRender.visible).toBe(true);
        expect(secondRender.props).toEqual({ message: 'Second?' });

        modal.hide();
        await expect(second).resolves.toBeUndefined();

        const finalRender = renderModal();
        expect(finalRender.visible).toBe(false);
        expect(finalRender.props).toBeUndefined();
    });

    it('supports the default useModal() call pattern with props', async () => {
        setCurrentFiber(fiber);
        const modal = useModal();
        clearCurrentFiber();

        const promise = modal.show({ message: 'Delete this file?' });
        modal.dismiss(true);

        await expect(promise).resolves.toBe(true);
    });
});
