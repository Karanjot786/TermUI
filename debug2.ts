import { createElement as h } from './packages/jsx/src/createElement.js';
import { reconcile } from './packages/jsx/src/reconciler.js';

function App() {
    return h('box', { width: 80, height: 24 }, 
        h('box', { flexDirection: 'row', width: '100%', height: 3 }, 'hello')
    );
}

const vnode = h(App, null);
const widget = reconcile(vnode);
widget.updateRect({ x: 0, y: 0, width: 80, height: 24 });
widget.syncLayout();

console.log('Outer box rect:', widget.rect);
console.log('Row rect:', widget.children[0].rect);
