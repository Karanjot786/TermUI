import { createElement } from '@termuijs/jsx';

export interface TextAreaProps {
    value?: string;
    onChange?: (value: string) => void;
    width?: number | string;
    height?: number | string;
}

export function TextArea({ value = '', onChange, width, height }: TextAreaProps) {
    const [lines, setLines] = useState<string[]>(value.split('\n').length ? value.split('\n') : ['']);
    const [cursor, setCursor] = useState({ row: 0, col: 0 });
    const [focused, setFocused] = useState(false);

    const updateLines = (newLines: string[], newCursor: { row: number, col: number }) => {
        setLines(newLines);
        setCursor(newCursor);
        onChange?.(newLines.join('\n'));
    };

    useInput((key: string, event: KeyEvent) => {
        const { row, col } = cursor;

        const isEnter = key === 'enter' || key === 'return' || key === '\r' || key === '\n';

        if (isEnter) {
            const line = lines[row];
            const before = line.slice(0, col);
            const after = line.slice(col);
            const newLines = [...lines];
            newLines[row] = before;
            newLines.splice(row + 1, 0, after);
            updateLines(newLines, { row: row + 1, col: 0 });
            return;
        }

        switch (key) {
            case 'up':
                if (row > 0) {
                    setCursor({ row: row - 1, col: Math.min(col, lines[row - 1].length) });
                }
                break;
            case 'down':
                if (row < lines.length - 1) {
                    setCursor({ row: row + 1, col: Math.min(col, lines[row + 1].length) });
                }
                break;
            case 'left':
                if (col > 0) {
                    setCursor({ row, col: col - 1 });
                } else if (row > 0) {
                    setCursor({ row: row - 1, col: lines[row - 1].length });
                }
                break;
            case 'right':
                if (col < lines[row].length) {
                    setCursor({ row, col: col + 1 });
                } else if (row < lines.length - 1) {
                    setCursor({ row: row + 1, col: 0 });
                }
                break;
            case 'backspace':
                if (col > 0) {
                    const newLines = [...lines];
                    const line = newLines[row];
                    newLines[row] = line.slice(0, col - 1) + line.slice(col);
                    updateLines(newLines, { row, col: col - 1 });
                } else if (row > 0) {
                    const newLines = [...lines];
                    const prevLine = newLines[row - 1];
                    const curLine = newLines[row];
                    newLines.splice(row, 1);
                    newLines[row - 1] = prevLine + curLine;
                    updateLines(newLines, { row: row - 1, col: prevLine.length });
                }
                break;
            case 'space': {
                const newLines = [...lines];
                newLines[row] = newLines[row].slice(0, col) + ' ' + newLines[row].slice(col);
                updateLines(newLines, { row, col: col + 1 });
                break;
            }
            default:
                if (key.length === 1 && !event.ctrl && !event.alt) {
                    const newLines = [...lines];
                    newLines[row] = newLines[row].slice(0, col) + key + newLines[row].slice(col);
                    updateLines(newLines, { row, col: col + 1 });
                }
                break;
        }
    });

    // Render logic: we create a single text node containing all lines,
    // and we insert an inverse-styled character for the cursor.
    // Wait, termuijs/jsx text element handles newlines and styling if nested?
    // Actually, maybe we can just map over lines and render each as a text element,
    // or just render it all as one string, but how do we style the cursor?
    // A single 'text' element doesn't support nested styled spans natively in TermUI JSX unless we use nested text elements or styled spans.
    // Let's use nested text elements! `text` can have children.
    
    return createElement(
        'text',
        {
            width,
            height,
            border: 'single',
            focusable: true,
            onFocus: () => setFocused(true),
            onBlur: () => setFocused(false)
        },
        createElement('col', { width: '100%', height: '100%' }, 
            ...lines.map((lineStr, r) => {
                if (r === cursor.row) {
                    const before = lineStr.slice(0, cursor.col);
                    const char = cursor.col < lineStr.length ? lineStr[cursor.col] : ' ';
                    const after = cursor.col < lineStr.length ? lineStr.slice(cursor.col + 1) : '';
                    
                    return createElement('text', { key: r }, before + '\x1b[7m' + char + '\x1b[27m' + after);
                }
                return createElement('row', { key: r, gap: 0, width: '100%', height: 1 }, createElement('text', { width: lineStr.length || 1 }, lineStr || ' '));
            })
        )
    );
}
