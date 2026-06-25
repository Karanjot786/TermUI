import { useState, useEffect } from '@termuijs/jsx';

export interface StoreInspectorProps {
    storeName: string;
    storeHook: any; // The useStore hook
}

export function StoreInspector({ storeName, storeHook }: StoreInspectorProps) {
    const [historyInfo, setHistoryInfo] = useState<any>(null);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    
    // Subscribe to store updates to refresh devtools view
    useEffect(() => {
        const unsub = storeHook.subscribe(() => {
            const devtoolsMap = (globalThis as any).__TERMUIJS_DEVTOOLS__;
            if (devtoolsMap) {
                setHistoryInfo(devtoolsMap.get(storeName));
            }
        });
        
        // Initial fetch
        const devtoolsMap = (globalThis as any).__TERMUIJS_DEVTOOLS__;
        if (devtoolsMap) {
            setHistoryInfo(devtoolsMap.get(storeName));
        }
        
        return unsub;
    }, [storeName]);

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
