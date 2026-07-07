// packages/router/src/DefaultNotFound.tsx
import { type VNode } from '@termuijs/jsx';

export function DefaultNotFound({ path }: { path: string }): VNode {
    return {
        type: 'box',
        props: {
            border: 'single',
            borderColor: 'yellow',
            padding: 2,
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
        },
        children: [
            {
                type: 'text',
                props: { color: 'yellow', bold: true, size: 2 },
                children: ['404 – Page Not Found']
            },
            {
                type: 'text',
                props: { color: 'gray', dim: true },
                children: [`Path: ${path}`]
            },
            {
                type: 'text',
                props: { color: 'gray' },
                children: ['The route you are looking for does not exist.']
            }
        ]
    } as any;
}