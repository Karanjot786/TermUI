/* @jsxImportSource @termuijs/jsx */
import { render, h, useInput, useState, getCurrentApp } from '@termuijs/jsx';

interface ButtonProps {
    id?: string;
    class?: string;
    children?: any;
    onPress?: () => void;
    onFocus?: () => void;
    triggerKey: string;
}

// A simple button component that emits onPress and onFocus when its trigger key is pressed
function Button({ id, class: className, children, onPress, onFocus, triggerKey }: ButtonProps) {
    // When the user types the trigger key, we simulate an event on this button
    useInput((key) => {
        if (key === triggerKey) {
            onPress?.();
            onFocus?.();
        }
    });

    return (
        <box id={id} class={className} border="single" padding={1} width={30} height={3}>
            <text>{children}</text>
        </box>
    );
}

function App() {
    const [lastAction, setLastAction] = useState('Waiting for input...');

    useInput((key, ev) => {
        if (key === 'q' || key === 'escape' || (ev.ctrl && key === 'c')) {
            getCurrentApp()?.exit(0);
        }
    });

    return (
        <box 
            width="100%"
            height="100%"
            padding={2} 
            border="single" 
            borderColor="cyan"
            flexDirection="column"
            gap={1}
            onPress={{ from: '#btn1', handler: () => setLastAction('Button 1 Pressed! (via ID)') }}
            onFocus={{ from: '.input-btn', handler: () => setLastAction('Button 2 Pressed! (via Class)') }}
        >
            <text bold>Event Delegation Test</text>
            <text dim>Last action: {lastAction}</text>
            
            <box flexDirection="row" gap={2}>
                <Button id="btn1" class="submit-btn" triggerKey="1">Button 1 (Press '1')</Button>
                <Button id="btn2" class="input-btn" triggerKey="2">Button 2 (Press '2')</Button>
            </box>
            
            <text dim>Press '1' or '2' to trigger events. Press 'q' to quit.</text>
        </box>
    );
}

async function main() {
    await render(<App />, { title: 'Delegation Test' });
}

main().catch(console.error);
