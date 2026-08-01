import { describe, expect, test, beforeEach } from 'bun:test';
import { FocusManager } from '../src/events/FocusManager.js';
import { FocusLockManager } from '../src/input/focusLock.js';

describe('FocusLockManager', () => {
  let focusManager: FocusManager;
  let focusLock: FocusLockManager;

  beforeEach(() => {
    focusManager = new FocusManager();
    focusLock = new FocusLockManager(focusManager);

    focusManager.register({ id: 'bg-btn', tabIndex: 1, focusable: true });
    focusManager.register({ id: 'modal-btn1', tabIndex: 2, focusable: true });
    focusManager.register({ id: 'modal-btn2', tabIndex: 3, focusable: true });
    focusManager.start();
  });

  test('pushes trap and locks focus within container', () => {
    expect(focusLock.isLocked).toBe(false);

    focusLock.pushTrap(
      { containerId: 'modal-1' },
      [
        { id: 'modal-btn1', tabIndex: 1, focusable: true },
        { id: 'modal-btn2', tabIndex: 2, focusable: true },
      ]
    );

    expect(focusLock.isLocked).toBe(true);
    expect(focusLock.activeTrapContainerId).toBe('modal-1');
  });

  test('handles tab navigation cycling inside trap', () => {
    focusLock.pushTrap({ containerId: 'modal-1' }, [
      { id: 'modal-btn1', tabIndex: 1, focusable: true },
      { id: 'modal-btn2', tabIndex: 2, focusable: true },
    ]);

    const handled = focusLock.handleKeyDown('tab');
    expect(handled).toBe(true);
  });

  test('pops trap on escape key', () => {
    focusLock.pushTrap({ containerId: 'modal-1' }, [
      { id: 'modal-btn1', tabIndex: 1, focusable: true },
    ]);

    const handled = focusLock.handleKeyDown('escape');
    expect(handled).toBe(true);
    expect(focusLock.isLocked).toBe(false);
  });
});
