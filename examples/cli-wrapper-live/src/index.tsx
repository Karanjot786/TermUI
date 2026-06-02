import { renderApp, useState, useEffect, useRef } from '@termuijs/jsx';
import { LogView, StreamingText } from '@termuijs/widgets';

// Wrapper for StreamingText
function StreamingTextWidget({ text, speed, style }: { text: string, speed: number, style?: any }) {
    const ref = useRef<StreamingText | null>(null);
    if (!ref.current) {
        ref.current = new StreamingText({ text, speed }, style);
    }
    useEffect(() => {
        ref.current?.setText(text);
    }, [text]);
    return ref.current as unknown as JSX.Element;
}

// Wrapper for LogView
function LogViewWidget({ lines }: { lines: string[] }) {
    const ref = useRef<LogView | null>(null);
    if (!ref.current) {
        ref.current = new LogView();
    }
    useEffect(() => {
        ref.current?.setLines(lines);
    }, [lines]);
    return ref.current as unknown as JSX.Element;
}

export function LiveWrapper() {
    const [lines, setLines] = useState<string[]>([]);
    const [status, setStatus] = useState<string>('Booting subprocess...');

    useEffect(() => {
        setStatus('Spawning bun run src/counter.ts...');
        
        const proc = Bun.spawn(['bun', 'run', 'src/counter.ts'], {
            stdout: 'pipe',
            stderr: 'pipe'
        });

        const reader = proc.stdout.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        async function readStream() {
            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    
                    const chunk = decoder.decode(value, { stream: true });
                    buffer += chunk;
                    
                    const newLines = buffer.split('\n');
                    if (newLines.length > 1) {
                        buffer = newLines.pop() || '';
                        setLines(prev => [...prev, ...newLines]);
                    }
                }
            } catch (err) {
                console.error(err);
            }
        }

        readStream();

        proc.exited.then((code) => {
            setStatus(`Process exited with code ${code}`);
            if (buffer) {
                setLines(prev => [...prev, buffer]);
            }
        });

        return () => {
            proc.kill();
        };
    }, []);

    return (
        <box width={60} height={20} border="single" flexDirection="column">
            <StreamingTextWidget text={status} speed={5} style={{ fg: 'cyan', height: 1 }} />
            <box flexGrow={1} border="top">
                <LogViewWidget lines={lines} />
            </box>
        </box>
    );
}

renderApp(LiveWrapper);
