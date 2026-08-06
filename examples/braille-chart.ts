import { App } from '@termuijs/core';
import { Box, Text, LineChart, BrailleCanvas } from '@termuijs/widgets';

async function main() {
    const root = new Box({ flexDirection: 'column', gap: 1, padding: { left: 2, top: 1 } });

    root.addChild(new Text(' 📊 Braille High-Resolution Terminal Graphing Demo', {
        bold: true, fg: { type: 'named', name: 'cyan' }, height: 1,
    }));
    root.addChild(new Text(' Rendering high-resolution continuous line charts & shapes  •  q to quit', {
        fg: { type: 'named', name: 'brightBlack' }, height: 1,
    }));
    root.addChild(new Text('─'.repeat(70), { fg: { type: 'named', name: 'brightBlack' }, height: 1 }));

    // Generate a smooth sine wave
    const data: number[] = [];
    for (let i = 0; i < 80; i++) {
        data.push(Math.sin(i * 0.15) * 50 + 50);
    }

    const chartsContainer = new Box({ flexDirection: 'row', gap: 4, height: 12 });

    // Smooth line chart using Braille canvas
    const lineChart = new LineChart(data, { height: 10, width: 35 }, {
        useBraille: true,
        showYAxis: true,
        showXAxis: true,
        color: { type: 'named', name: 'green' }
    });

    // Custom shape drawing on BrailleCanvas
    const shapesCanvas = new BrailleCanvas({
        width: 60, // 30 cells wide
        height: 40, // 10 cells high
        color: { type: 'named', name: 'magenta' }
    }, { height: 10, width: 30 });

    // Draw some test shapes on the canvas
    // 1. Draw a circle in the center
    shapesCanvas.drawCircle(30, 20, 15);
    // 2. Draw crossing diagonal lines
    shapesCanvas.drawLine(5, 5, 55, 35);
    shapesCanvas.drawLine(5, 35, 55, 5);

    chartsContainer.addChild(lineChart);
    chartsContainer.addChild(shapesCanvas);

    root.addChild(chartsContainer);

    const app = new App(root, { fullscreen: true, fps: 10, title: 'Braille Chart Demo' });

    app.events.on('key', (event) => {
        if (event.key === 'q' || (event.ctrl && event.key === 'c')) {
            app.exit(0);
        }
    });

    const exitCode = await app.mount();
    process.exit(exitCode);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
