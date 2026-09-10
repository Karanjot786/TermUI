import { type KeyEvent } from '@termuijs/core';
import {
    render,
    useKeymap,
    ErrorBoundary,
    useState,
    useInput,
    useRef,
} from '@termuijs/jsx';
import { TextInput } from '@termuijs/widgets';
import { PasswordInput } from '@termuijs/ui';
import { useAuthStore } from './authStore.js';

function TextInputJSX({
    value,
    onChange,
    placeholder,
    isFocused,
}: {
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
    isFocused: boolean;
}): TextInput {
    const ref = useRef<TextInput | null>(null);

    if (!ref.current) {
        ref.current = new TextInput({ width: 30 }, { placeholder, onChange });
    }

    if (ref.current.value !== value) {
        ref.current.value = value;
    }

    ref.current.isFocused = isFocused;

    useInput((key: string, event: KeyEvent) => {
        if (!isFocused || !ref.current) return;

        switch (key) {
            case 'backspace':
                ref.current.deleteBack();
                break;
            case 'delete':
                ref.current.deleteForward();
                break;
            case 'left':
                ref.current.moveCursorLeft();
                break;
            case 'right':
                ref.current.moveCursorRight();
                break;
            case 'home':
                ref.current.moveCursorHome();
                break;
            case 'end':
                ref.current.moveCursorEnd();
                break;
            default:
                // Defensive `key &&` guard: some non-printable keystrokes may
                // reach this handler with an empty/undefined key depending on
                // how the TermUI input dispatcher normalizes them.
                if (key && key.length === 1 && !event.ctrl && !event.alt) {
                    ref.current.insertChar(key);
                }
        }
    });

    // TermUI's JSX runtime accepts widget instances directly as render
    // output (this isn't a standard JSX.Element), so returning the concrete
    // TextInput type is intentional rather than a type-safety gap.
    return ref.current;
}

function PasswordInputJSX({
    value,
    onChange,
    placeholder,
    isFocused,
    widgetRef,
}: {
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
    isFocused: boolean;
    widgetRef: { current: PasswordInput | null };
}): PasswordInput {
    if (!widgetRef.current) {
        widgetRef.current = new PasswordInput(
            { width: 30 },
            { placeholder, onChange }
        );
    }

    if (widgetRef.current.value !== value) {
        widgetRef.current.value = value;
    }

    widgetRef.current.isFocused = isFocused;

    useInput((_key: string, event: KeyEvent) => {
        if (!isFocused || !widgetRef.current) return;
        widgetRef.current.handleKey(event);
    });

    // Same TermUI-specific widget-instance-as-render-output pattern as
    // TextInputJSX above.
    return widgetRef.current;
}

function LoginScreen() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [focusedIndex, setFocusedIndex] = useState(0);
    const [isVisible, setIsVisible] = useState(false);

    const login = useAuthStore((state) => state.login);
    const passwordRef = useRef<PasswordInput | null>(null);

    const togglePasswordVisibility = () => {
        if (!passwordRef.current) return;

        passwordRef.current.toggleVisibility();
        setIsVisible(passwordRef.current.showText);
    };

    const submit = () => {
        if (focusedIndex === 2) {
            togglePasswordVisibility();
            return;
        }

        if (username && password) {
            login(username);
        } else {
            setError('Username and password are required');
        }
    };

    useKeymap([
        {
            key: 'c',
            ctrl: true,
            action: () => process.exit(0),
        },
        {
            key: 'tab',
            action: () =>
                setFocusedIndex((prev) => (prev === 0 ? 1 : prev === 1 ? 2 : 0)),
        },
        {
            key: 'v',
            action: () => {
                if (focusedIndex !== 2) return;
                togglePasswordVisibility();
            },
        },
        {
            key: 'enter',
            action: submit,
        },
        {
            key: 'return',
            action: submit,
        },
    ]);

    return (
        <box
            flexDirection="column"
            padding={2}
            border="round"
            borderColor="cyan"
            gap={1}
            width={50}
        >
            <text bold color="cyan">
                Login
            </text>

            <box flexDirection="row" gap={1}>
                <text color={focusedIndex === 0 ? 'cyan' : undefined}>
                    Username:
                </text>

                <TextInputJSX
                    value={username}
                    onChange={setUsername}
                    placeholder="Enter username..."
                    isFocused={focusedIndex === 0}
                />
            </box>

            <box flexDirection="row" gap={1}>
                <text color={focusedIndex === 1 ? 'cyan' : undefined}>
                    Password:
                </text>

                <PasswordInputJSX
                    value={password}
                    onChange={setPassword}
                    placeholder="Enter password..."
                    isFocused={focusedIndex === 1}
                    widgetRef={passwordRef}
                />
            </box>

            <box flexDirection="row" gap={1}>
                <text color={focusedIndex === 2 ? 'cyan' : undefined}>
                    Toggle:
                </text>

                <text
                    bold
                    color={focusedIndex === 2 ? 'cyan' : undefined}
                >
                    {isVisible ? '[Hide]' : '[Show]'}
                </text>
            </box>

            {error && <text color="red">{error}</text>}

            <text dim margin={1}>
                Tab: fields, Enter: login, Enter on toggle: show/hide, Ctrl+C to
                quit
            </text>
        </box>
    );
}

function ProtectedScreen() {
    const username = useAuthStore((state) => state.username);
    const logout = useAuthStore((state) => state.logout);

    useKeymap([
        {
            key: 'c',
            ctrl: true,
            action: () => process.exit(0),
        },
        {
            key: 'l',
            action: logout,
        },
    ]);

    return (
        <box
            flexDirection="column"
            padding={2}
            border="round"
            borderColor="green"
            gap={1}
            width={50}
        >
            <text bold color="green">
                Protected Screen
            </text>

            <box flexDirection="row" gap={1}>
                <text>Welcome,</text>
                <text bold>{username}</text>
            </box>

            <text dim margin={1}>
                Press 'l' to Logout, Ctrl+C to quit
            </text>
        </box>
    );
}

function MainApp() {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

    return isAuthenticated ? <ProtectedScreen /> : <LoginScreen />;
}

render(
    <ErrorBoundary fallback={(e) => <text color="red">{e.message}</text>}>
        <MainApp />
    </ErrorBoundary>
);
