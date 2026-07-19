/**
 * Performance benchmarks for Virtual DOM
 */

import { bench, describe } from 'bun:test';
import { createVNode } from '../../src/vdom/VNode';
import { diff } from '../../src/vdom/diff';
import { reconciler } from '../../src/reconciler';

describe('VDOM Performance Benchmarks', () => {
  // Generate test data
  const generateItems = (count: number) => {
    return Array.from({ length: count }, (_, i) => 
      createVNode('div', { key: i, className: 'item' }, `Item ${i}`)
    );
  };

  bench('1000 components initial render', () => {
    const vnode = createVNode('div', {}, generateItems(1000));
    const container = document.createElement('div');
    reconciler.mount(vnode, container);
  });

  bench('10000 components initial render', () => {
    const vnode = createVNode('div', {}, generateItems(10000));
    const container = document.createElement('div');
    reconciler.mount(vnode, container);
  });

  bench('Diff 1000 components', () => {
    const oldList = generateItems(1000);
    const newList = generateItems(1000);
    
    const oldVNode = createVNode('div', {}, oldList);
    const newVNode = createVNode('div', {}, newList);
    
    diff(oldVNode, newVNode);
  });

  bench('Diff with key changes - 1000 components', () => {
    const oldList = generateItems(1000);
    const newList = oldList.reverse();
    
    const oldVNode = createVNode('div', {}, oldList);
    const newVNode = createVNode('div', {}, newList);
    
    diff(oldVNode, newVNode);
  });
});