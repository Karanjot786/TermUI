/** @jsxImportSource @termuijs/jsx */
import { renderApp, useState, useEffect } from '@termuijs/jsx';
import { Box, Text } from '@termuijs/widgets';
import { Router } from '@termuijs/router';

import Home from './screens/Home';
import Items from './screens/Items';
import ItemDetails from './screens/ItemDetails';

const router = new Router();

// Expose router for simple screen modules to call navigation (example pattern)
(globalThis as any).__termui_router = router;

// Register routes
router.addRoute('/', Home);
router.addRoute('/items', Items);
router.addRoute('/items/[id]', ItemDetails);

function App() {
    const [screen, setScreen] = useState<any>(null);

    useEffect(() => {
        const unsubNav = router.events.on('navigate', (ev) => setScreen(ev.screen));
        const unsubBack = router.events.on('back', (ev) => setScreen(ev ? ev.screen : null));

        // Kick off at root
        router.push('/');

        return () => {
            unsubNav();
            unsubBack();
        };
    }, []);

    return screen ?? (
        <Box padding={1} border="round">
            <Text>Loading…</Text>
        </Box>
    );
}

renderApp(App, { title: 'Multi-screen Router' }).catch((err) => {
    console.error(err);
    process.exit(1);
});
