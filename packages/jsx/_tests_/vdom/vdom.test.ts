/**
 * Virtual DOM tests
 */

import { describe, expect, test } from 'bun:test';
import { createVNode, createTextVNode, Fragment } from '../../src/vdom/VNode';
import { diff, PatchType } from '../../src/vdom/diff';
import { render } from '../../src/render';

describe('Virtual DOM', () => {
  test('createVNode creates correct structure', () => {
    const vnode = createVNode('div', { className: 'test' }, 'Hello');
    
    expect(vnode.type).toBe('div');
    expect(vnode.props.className).toBe('test');
    expect(vnode.children[0].props.textContent).toBe('Hello');
  });

  test('diff handles simple changes', () => {
    const oldVNode = createVNode('div', {}, 'Hello');
    const newVNode = createVNode('div', {}, 'World');
    
    const patches = diff(oldVNode, newVNode);
    
    expect(patches.length).toBeGreaterThan(0);
    expect(patches[0].type).toBe(PatchType.UPDATE);
  });

  test('diff handles keyed lists', () => {
    const oldList = [
      createVNode('li', { key: '1' }, 'Item 1'),
      createVNode('li', { key: '2' }, 'Item 2'),
      createVNode('li', { key: '3' }, 'Item 3')
    ];
    
    const newList = [
      createVNode('li', { key: '3' }, 'Item 3'),
      createVNode('li', { key: '1' }, 'Item 1')
    ];
    
    const patches = diff(
      createVNode('ul', {}, oldList),
      createVNode('ul', {}, newList)
    );
    
    expect(patches).toContainEqual(
      expect.objectContaining({ type: PatchType.MOVE })
    );
    expect(patches).toContainEqual(
      expect.objectContaining({ type: PatchType.DELETE })
    );
  });
});