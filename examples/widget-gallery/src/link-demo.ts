import { Screen, caps, parseColor } from '@termuijs/core';
import { Link } from '@termuijs/widgets';

async function main() {
    // 1. Clear terminal view cleanly
    process.stdout.write('\x1bc'); 

    // 2. Instantiate and configure your dynamic Link widget
    const linkWidget = new Link(
        '👉 Click here to open GitHub', 
        { bold: true }, 
        { 
            url: 'https://github.com/Karanjot786/TermUI',
            showUrlFallback: true,
            color: parseColor('blue')
        }
    );

    linkWidget.updateRect({ x: 0, y: 0, width: 80, height: 1 });

    // 3. Setup a mock Screen layout pipeline to intercept the output stream
    let interceptedOutput = '';
    const captureScreen = new Screen(80, 5);
    
    captureScreen.writeString = (_x: number, _y: number, text: string, cellAttrs?: any) => {
        if (cellAttrs && cellAttrs.link) {
            // Manually wrap the text in OSC 8 sequences for the demo output stream
            interceptedOutput = `\x1b]8;;${cellAttrs.link}\x1b\\${text}\x1b]8;;\x1b\\`;
        } else {
            interceptedOutput = text;
        }
    };

    // Trigger the actual Link widget's native internal render sequence pipeline
    linkWidget.render(captureScreen);

    // 4. Print metadata context out cleanly
    const unicodeStatus = caps.unicode 
        ? '\x1b[32m✅ Unicode Supported (OSC 8 Mode Active)\x1b[0m' 
        : '\x1b[31m❌ Unicode Disabled (Fallback Mode Active)\x1b[0m';

    process.stdout.write('\n   --- TermUI Link Widget Demo ---\n\n');
    
    // Now renders the text combined with the extracted link metadata!
    process.stdout.write(`   Link: ${interceptedOutput}\n\n`);
    
    process.stdout.write(`   Terminal state: ${unicodeStatus}\n\n`);
    process.stdout.write('   \x1b[36mInstructions:\x1b[0m Hold Ctrl (or Cmd) and click the link above.\n');
    process.stdout.write('   \x1b[90mPress [Ctrl + C] to exit cleanly.\x1b[0m\n\n');

    // 5. Keep thread open to accept pointer link actions
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', (data) => {
        if (data[0] === 3) { // Catch Ctrl+C
            process.stdout.write('\x1bc'); 
            process.exit(0);
        }
    });
}

main().catch(console.error);
