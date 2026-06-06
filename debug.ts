import { h } from './packages/jsx/src/vnode.js';
import { applyDelegatedEvents } from './packages/jsx/src/event-system.js';

console.log('Testing delegation...');
const delegates = { onPress: { from: '#test', handler: () => console.log('WORKED') } };
const Button = ({ id }: any) => h('box', { id });
const vnode = h('box', delegates, h(Button, { id: 'test' }));

applyDelegatedEvents(vnode.props, vnode.children);
console.log(vnode.children[0].props.onPress ? 'PROP ASSIGNED' : 'PROP NOT ASSIGNED');
