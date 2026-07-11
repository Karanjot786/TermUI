import { Screen, computeLayout } from './packages/core/dist/index.js';
import { Box, Text } from './packages/widgets/dist/index.js';

const screen = new Screen(30, 5);
const box = new Box({ border: 'round', width: 20, height: 5 });
box.addChild(new Text('你好世界', { width: 10, height: 1 })); // Chinese characters

computeLayout(box.getLayoutNode(), 30, 5);
box.syncLayout();
box.render(screen);

for (let r = 0; r < 5; r++) {
    const row = screen.back[r];
    console.log(row.map(c => c.char).join(''));
}

