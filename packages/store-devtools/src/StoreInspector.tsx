import { useState, useEffect, useInput } from '@termuijs/jsx';

export interface StoreInspectorProps {
    storeName: string;
    storeHook: any; // The useStore hook
}

export function StoreInspector({ storeName, storeHook }: StoreInspectorProps) {
    const devtoolsAPI = (storeHook as any).history ? storeHook as any : null;
    const [historyInfo, setHistoryInfo] = useState<any>(devtoolsAPI);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    
    // Subscribe to store updates to refresh devtools view
    useEffect(() => {
        const unsub = storeHook.subscribe(() => {
            if ((storeHook as any).history) {
                // clone to trigger re-render
                setHistoryInfo({ history: (storeHook as any).history, goTo: (storeHook as any).goTo });
            }
        });
        
        return unsub;
    }, [storeName]);

    useInput((key) => {
        if (!historyInfo) return;
        const { history, goTo } = historyInfo;
        const total = history.past.length + 1 + history.future.length;
        const current = selectedIndex === -1 ? history.past.length : selectedIndex;
        
        if (key === 'up') {
            const nextIdx = Math.max(0, current - 1);
            setSelectedIndex(nextIdx);
            goTo(nextIdx, (storeHook as any).setState);
        } else if (key === 'down') {
            const nextIdx = Math.min(total - 1, current + 1);
            setSelectedIndex(nextIdx);
            goTo(nextIdx, (storeHook as any).setState);
        }
    });

    if (!historyInfo) {
        return <text>Waiting for store '{storeName}'...</text>;
    }

    const { history, goTo } = historyInfo;
    const allActions = [...history.past, { action: { type: 'PRESENT' }, state: history.present }, ...history.future];
    
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
