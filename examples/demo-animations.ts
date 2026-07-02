import { App, Screen } from '@termuijs/core';
import { Box, Text, Checkbox } from '@termuijs/widgets';
import { Switch } from '@termuijs/ui';

async function main() {
    const root = new Box({ flexDirection: 'column', gap: 1, padding: { left: 2 } });

    root.addChild(new Text(' Checkbox & Switch Animation Demo', {
        bold: true, fg: { type: 'named', name: 'cyan' }, height: 1,
    }));
    root.addChild(new Text(' Press Space/Enter to toggle  •  q to quit', {
        fg: { type: 'named', name: 'brightBlack' }, height: 1,
    }));
    root.addChild(new Text('─'.repeat(40), { fg: { type: 'named', name: 'brightBlack' }, height: 1 }));

    const cb1 = new Checkbox('Enable notifications', {}, { checked: true });
    const cb2 = new Checkbox('Dark mode', {}, { checked: false });
    const cb3 = new Checkbox('Auto-save', {}, { checked: true });

    const sw1 = new Switch({ defaultValue: true, label: 'Wi-Fi' });
    const sw2 = new Switch({ defaultValue: false, label: 'Bluetooth' });
    const sw3 = new Switch({ defaultValue: true, label: 'Airplane mode' });

    root.addChild(new Text(' Checkboxes:', { bold: true, height: 1 }));
    root.addChild(cb1);
    root.addChild(cb2);
    root.addChild(cb3);

    root.addChild(new Text('', { height: 1 }));

    root.addChild(new Text(' Switches:', { bold: true, height: 1 }));
    root.addChild(sw1);
    root.addChild(sw2);
    root.addChild(sw3);

    const app = new App(root, { fullscreen: true, fps: 30, title: 'Animation Demo' });

    app.events.on('key', (event) => {
        if (event.key === 'q' || (event.ctrl && event.key === 'c')) {
            app.exit(0);
            return;
        }
        if (event.key === 'space' || event.key === 'enter') {
            cb1.toggle();
            cb2.toggle();
            cb3.toggle();
            sw1.toggle();
            sw2.toggle();
            sw3.toggle();
        }
        app.requestRender();
    });

    const exitCode = await app.mount();
    process.exit(exitCode);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
