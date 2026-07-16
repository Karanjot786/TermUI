import { useState, useEffect, useInput } from '@termuijs/jsx';
import type { UseStore } from '@termuijs/store';
import type { DevToolsAPI } from './devtools.js';

export interface StoreInspectorProps<T extends object = any> {
    storeName: string;
    storeHook: UseStore<T> & Partial<DevToolsAPI<T>>;
}

export function StoreInspector<T extends object>({ storeName, storeHook }: StoreInspectorProps<T>) {
    const devtoolsAPI = storeHook.history ? { history: storeHook.history, goTo: storeHook.goTo! } : null;
    const [historyInfo, setHistoryInfo] = useState<DevToolsAPI<T> | null>(devtoolsAPI);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    
    // Subscribe to store updates to refresh devtools view
    useEffect(() => {
        const unsub = storeHook.subscribe(() => {
            if (storeHook.history && storeHook.goTo) {
                // clone to trigger re-render
                setHistoryInfo({ history: { ...storeHook.history }, goTo: storeHook.goTo });
            }
        });
        
        return unsub;
    }, [storeName]);

    useInput((key) => {
        if (!historyInfo) return;
        const { history, goTo } = historyInfo;
        const total = history.past.length + (history.present !== null ? 1 : 0) + history.future.length;
        const current = selectedIndex === -1 ? history.past.length : selectedIndex;
        
        if (key === 'up') {
            const nextIdx = Math.max(0, current - 1);
            setSelectedIndex(nextIdx);
            goTo(nextIdx, storeHook.setState);
        } else if (key === 'down') {
            const nextIdx = Math.min(total - 1, current + 1);
            setSelectedIndex(nextIdx);
            goTo(nextIdx, storeHook.setState);
        }
    });

    if (!historyInfo) {
        return <text>Waiting for store '{storeName}'...</text>;
    }

    const { history } = historyInfo;
    const allActions = [
        ...history.past,
        ...(history.present !== null ? [{ action: { type: 'PRESENT', payload: {}, timestamp: Date.now() }, state: history.present }] : []),
        ...history.future
    ];
    
    // Auto-select latest if unselected
    const currentIndex = selectedIndex === -1 ? history.past.length : selectedIndex;
    const currentState = allActions[currentIndex]?.state;

    return (
        <row width="100%" height="100%" border="round" borderColor="blue">
            <col width="30%" border="single" borderColor="blue">
                <text bold color="green">Action Log</text>
                {allActions.map((item, index) => {
                    const isSelected = index === currentIndex;
                    return (
                        <text 
                            key={index} 
                            color={isSelected ? 'yellow' : 'white'}
                        >
                            {isSelected ? '> ' : '  '}
                            {item.action?.type || 'init'}
                        </text>
                    );
                })}
            </col>
            <col width="70%" padding={1}>
                <text bold color="green">State Tree</text>
                <text>{JSON.stringify(currentState, null, 2)}</text>
            </col>
        </row>
    );
}
