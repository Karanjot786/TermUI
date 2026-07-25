import { App, type KeyEvent } from '@termuijs/core';
import { render, useKeymap, ErrorBoundary, useState, useInput, useRef, useEffect } from '@termuijs/jsx';
import { TextInput } from '@termuijs/widgets';
import { PasswordInput } from '@termuijs/ui';
import { useAuthStore } from './authStore.js';


function TextInputJSX({ value, onChange, placeholder, isFocused }: { value: string, onChange: (val: string) => void, placeholder?: string, isFocused: boolean }) {
    const ref = useRef<TextInput | null>(null);
    if (!ref.current) {
        ref.current = new TextInput({ width: 30 }, { placeholder, onChange });
    }

    if (ref.current.value !== value) {
        ref.current.value = value;
    }
    
    ref.current.isFocused = isFocused;

    useInput((key: string, event: KeyEvent) => {
        if (!isFocused) return;
        if (!ref.current) return;

        switch (key) {
            case 'backspace': ref.current.deleteBack(); break;
            case 'delete': ref.current.deleteForward(); break;
            case 'left': ref.current.moveCursorLeft(); break;
            case 'right': ref.current.moveCursorRight(); break;
            case 'home': ref.current.moveCursorHome(); break;
            case 'end': ref.current.moveCursorEnd(); break;
            default:
                if (key && key.length === 1 && !event.ctrl && !event.alt) {
                    ref.current.insertChar(key);
                }
        }
    });

    return ref.current as any;
}

function PasswordInputJSX({ value, onChange, placeholder, isFocused }: { value: string, onChange: (val: string) => void, placeholder?: string, isFocused: boolean }) {
    const ref = useRef<PasswordInput | null>(null);
    if (!ref.current) {
        ref.current = new PasswordInput({ width: 30 }, { placeholder, onChange });
    }

    if (ref.current.value !== value) {
        ref.current.value = value;
    }
    
    ref.current.isFocused = isFocused;

    useInput((key: string, event: KeyEvent) => {
        if (!isFocused) return;
        if (!ref.current) return;
        ref.current.handleKey(event);
    });

    return ref.current as any;
}

function LoginScreen() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    // 0 = username, 1 = password, 2 = visibility toggle
    const [focusedIndex, setFocusedIndex] = useState(0);

    const login = useAuthStore(state => state.login);

    const passwordRef = useRef<PasswordInput | null>(null);

    useKeymap([
        { key: 'c', ctrl: true, action: () => process.exit(0) },
        { key: 'tab', action: () => setFocusedIndex(prev => (prev === 0 ? 1 : prev === 1 ? 2 : 0)) },
        {
            key: 'v',
            action: () => {
                // Only allow toggle when visibility toggle is focused.
                if (focusedIndex !== 2) return;
                passwordRef.current?.toggleVisibility();
            },
        },
        { key: 'enter', action: () => {
            if (focusedIndex === 2) {
                passwordRef.current?.toggleVisibility();
                return;
            }

            if (username !== '' && password !== '') {
                login(username);
            } else {
                setError('Username and password are required');
            }
        } },
        { key: 'return', action: () => {
            if (focusedIndex === 2) {
                passwordRef.current?.toggleVisibility();
                return;
            }

            if (username !== '' && password !== '') {
                login(username);
            } else {
                setError('Username and password are required');
            }
        } }
    ]);

    const isVisible = passwordRef.current?.showText ?? false;

    return (
        <box flexDirection="column" padding={2} border="round" borderColor="cyan" gap={1} width={50}>
            <text bold color="cyan">Login</text>

            <box flexDirection="row" gap={1}>
                <text color={focusedIndex === 0 ? "cyan" : undefined}>Username: </text>
                <TextInputJSX
                    value={username}
                    onChange={setUsername}
                    placeholder="Enter username..."
                    isFocused={focusedIndex === 0}
                />
            </box>

            <box flexDirection="row" gap={1}>
                <text color={focusedIndex === 1 ? "cyan" : undefined}>Password: </text>
                <PasswordInputJSX
                    value={password}
                    onChange={setPassword}
                    placeholder="Enter password..."
                    isFocused={focusedIndex === 1}
                />
            </box>

            <box flexDirection="row" gap={1}>
                <text color={focusedIndex === 2 ? "cyan" : undefined}>Toggle:</text>
                <text bold
                    color={focusedIndex === 2 ? 'cyan' : undefined}
                >{isVisible ? '[Hide]' : '[Show]'} </text>
            </box>

            {error ? <text color="red">{error}</text> : null}

            <text dim margin={1}>Tab: fields, Enter: login, Enter on toggle: show/hide, Ctrl+C to quit</text>
        </box>
    );
}


function ProtectedScreen() {
    const username = useAuthStore(state => state.username);
    const logout = useAuthStore(state => state.logout);

    useKeymap([
        { key: 'c', ctrl: true, action: () => process.exit(0) },
        { key: 'l', action: () => logout() }
    ]);

    return (
        <box flexDirection="column" padding={2} border="round" borderColor="green" gap={1} width={50}>
            <text bold color="green">Protected Screen</text>
            <box flexDirection="row" gap={1}>
                <text>Welcome,</text>
                <text bold>{username}</text>
            </box>
            <text dim margin={1}>Press 'l' to Logout, Ctrl+C to quit</text>
        </box>
    );
}

function MainApp() {
    const isAuthenticated = useAuthStore(state => state.isAuthenticated);

    if (isAuthenticated) {
        return <ProtectedScreen />;
    }

    return <LoginScreen />;
}

const app = render(
    <ErrorBoundary fallback={(e) => <text color="red">{e.message}</text>}>
        <MainApp />
    </ErrorBoundary>
);
