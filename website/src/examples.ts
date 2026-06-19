export const EXAMPLES: Record<string, { name: string; code: string }> = {
    dashboard: {
        name: 'Dashboard',
        code: `import { Box, Text } from '@termuijs/widgets';

export default function Dashboard() {
    return (
        <Box flexDirection="column" width="100%" height="100%" borderStyle="round" borderColor="cyan" padding={1}>
            <Box justifyContent="space-between" paddingBottom={1} borderBottom={true} borderStyle="single">
                <Text color="cyan" bold>System Dashboard</Text>
                <Text color="gray">v1.0.0</Text>
            </Box>
            <Box flexDirection="row" paddingTop={1} gap={2}>
                <Box flexDirection="column" borderStyle="round" padding={1} flexGrow={1}>
                    <Text color="green">CPU Usage</Text>
                    <Text>24% [||||      ]</Text>
                </Box>
                <Box flexDirection="column" borderStyle="round" padding={1} flexGrow={1}>
                    <Text color="yellow">Memory</Text>
                    <Text>4.2GB / 16GB</Text>
                </Box>
            </Box>
            <Box flexGrow={1} borderStyle="round" padding={1} marginTop={1}>
                <Text color="magenta" bold>Recent Logs</Text>
                <Text color="gray">[12:04:32] API request handled in 42ms</Text>
                <Text color="gray">[12:04:35] Database connection established</Text>
                <Text color="gray">[12:04:40] Cache invalidated</Text>
            </Box>
        </Box>
    );
}`
    },
    form: {
        name: 'Form',
        code: `import { Box, Text } from '@termuijs/widgets';

export default function Form() {
    return (
        <Box flexDirection="column" width={50} height={15} borderStyle="round" padding={1} borderColor="blue">
            <Text bold color="blue" marginBottom={1}>User Registration</Text>
            <Box flexDirection="row" marginBottom={1}>
                <Text width={12}>Username:</Text>
                <Text backgroundColor="gray" color="black" width={20}> admin_user </Text>
            </Box>
            <Box flexDirection="row" marginBottom={1}>
                <Text width={12}>Email:</Text>
                <Text backgroundColor="gray" color="black" width={20}> admin@example.com </Text>
            </Box>
            <Box flexDirection="row" marginBottom={1}>
                <Text width={12}>Role:</Text>
                <Text color="cyan">[x] Admin  [ ] User</Text>
            </Box>
            <Box marginTop={2} justifyContent="center">
                <Text backgroundColor="blue" color="white" bold paddingX={2}> SUBMIT </Text>
            </Box>
        </Box>
    );
}`
    },
    commandPalette: {
        name: 'Command Palette',
        code: `import { Box, Text } from '@termuijs/widgets';

export default function CommandPalette() {
    return (
        <Box flexDirection="column" width={60} borderStyle="round" padding={1} borderColor="magenta">
            <Box borderBottom={true} borderStyle="single" paddingBottom={1} marginBottom={1}>
                <Text color="gray" dimColor>&gt; Search commands...</Text>
            </Box>
            <Box flexDirection="column" gap={0}>
                <Box backgroundColor="magenta" color="white">
                    <Text> Create new file                </Text>
                    <Text dimColor>Ctrl+N</Text>
                </Box>
                <Box>
                    <Text> Open project settings          </Text>
                    <Text dimColor>Ctrl+,</Text>
                </Box>
                <Box>
                    <Text> Run tests                      </Text>
                    <Text dimColor>Cmd+T</Text>
                </Box>
            </Box>
        </Box>
    );
}`
    },
    logViewer: {
        name: 'Log Viewer',
        code: `import { Box, Text } from '@termuijs/widgets';

export default function LogViewer() {
    return (
        <Box flexDirection="column" width="100%" height={12} borderStyle="double" borderColor="yellow">
            <Box backgroundColor="yellow" color="black" paddingX={1} bold>
                <Text>server.log - Tailing...</Text>
            </Box>
            <Box flexDirection="column" paddingX={1} paddingTop={1}>
                <Text><Text color="gray">10:00:01</Text> <Text color="green">[INFO]</Text> Server started on port 3000</Text>
                <Text><Text color="gray">10:00:05</Text> <Text color="green">[INFO]</Text> Connecting to database...</Text>
                <Text><Text color="gray">10:00:06</Text> <Text color="green">[INFO]</Text> Database connected successfully</Text>
                <Text><Text color="gray">10:00:12</Text> <Text color="yellow">[WARN]</Text> Deprecated API usage detected in /users endpoint</Text>
                <Text><Text color="gray">10:00:15</Text> <Text color="red">[ERROR]</Text> Unhandled exception: TypeError: Cannot read properties of undefined</Text>
            </Box>
        </Box>
    );
}`
    },
    aiChat: {
        name: 'AI Chat UI',
        code: `import { Box, Text } from '@termuijs/widgets';

export default function AiChat() {
    return (
        <Box flexDirection="column" width="100%" height="100%" borderStyle="round" borderColor="green">
            <Box justifyContent="center" borderBottom={true} borderStyle="single" paddingBottom={1} marginBottom={1}>
                <Text color="green" bold>TermUI AI Assistant</Text>
            </Box>
            <Box flexDirection="column" flexGrow={1} gap={1} paddingX={1}>
                <Box flexDirection="column" alignItems="flex-end">
                    <Text color="gray">You</Text>
                    <Box borderStyle="round" borderColor="gray" paddingX={1}>
                        <Text>How do I create a box with a red border?</Text>
                    </Box>
                </Box>
                <Box flexDirection="column" alignItems="flex-start">
                    <Text color="cyan">Assistant</Text>
                    <Box borderStyle="round" borderColor="cyan" paddingX={1}>
                        <Text>You can use the Box component and set the borderColor prop to "red":</Text>
                        <Text color="gray">&lt;Box borderColor="red" borderStyle="round"&gt;</Text>
                    </Box>
                </Box>
            </Box>
            <Box borderTop={true} borderStyle="single" paddingTop={1} paddingX={1}>
                <Text color="gray">&gt; Typing..._</Text>
            </Box>
        </Box>
    );
}`
    }
};
