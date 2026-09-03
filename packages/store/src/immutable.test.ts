import { describe, it, expect } from 'vitest';
import { setIn, updateIn, deleteIn } from './immutable';

describe('Immutable Helpers', () => {
  it('setIn should set a nested value immutably', () => {
    const state = { user: { profile: { name: 'Alice' } } };
    const nextState = setIn(state, ['user', 'profile', 'name'], 'Bob');
    
    expect(nextState.user.profile.name).toBe('Bob');
    expect(state.user.profile.name).toBe('Alice'); // Original unchanged
    expect(nextState).not.toBe(state); // Reference changed
  });

  it('updateIn should update a nested value immutably using a function', () => {
    const state = { counters: { clicks: 5 } };
    const nextState = updateIn(state, ['counters', 'clicks'], (c) => c + 1);
    
    expect(nextState.counters.clicks).toBe(6);
    expect(state.counters.clicks).toBe(5);
  });

  it('deleteIn should delete a nested key immutably', () => {
    const state = { settings: { theme: 'dark', notifications: true } };
    const nextState = deleteIn(state, ['settings', 'theme']);
    
    expect(nextState.settings.theme).toBeUndefined();
    expect(nextState.settings.notifications).toBe(true);
    expect(state.settings.theme).toBe('dark');
  });
});