import { describe, it, expect, vi, afterEach } from 'vitest';
import { InspectorBridge } from './inspector-bridge.js';
import { DevServer } from './server.js';
import type { WidgetNode } from './devtools.js';

describe('InspectorBridge', () => {
    let bridge: InspectorBridge | null = null;

    afterEach(async () => {
        if (bridge) {
            await bridge.stop();
            bridge = null;
        }
    });

    it('handles JSON-RPC TermUI.getVNodeTree method', () => {
        bridge = new InspectorBridge({ port: 9330 });
        const mockTree: WidgetNode = {
            id: 'root',
            type: 'App',
            rect: { x: 0, y: 0, width: 80, height: 24 },
            children: [],
        };

        bridge.updateVNodeTree(mockTree);

        const response = bridge.handleJSONRPC({
            jsonrpc: '2.0',
            id: 1,
            method: 'TermUI.getVNodeTree',
        });

        expect(response).toEqual({
            jsonrpc: '2.0',
            id: 1,
            result: { tree: mockTree },
        });
    });

    it('handles JSON-RPC TermUI.getRenderMetrics method', () => {
        bridge = new InspectorBridge({ port: 9331 });
        bridge.updateRenderMetrics({ fps: 59, dirtyCells: 12, memoryUsage: 1048576 });

        const response = bridge.handleJSONRPC({
            jsonrpc: '2.0',
            id: 2,
            method: 'TermUI.getRenderMetrics',
        });

        expect(response.result).toEqual({
            metrics: {
                fps: 59,
                dirtyCells: 12,
                memoryUsage: 1048576,
            },
        });
    });

    it('handles JSON-RPC TermUI.triggerReRender method', () => {
        const triggerSpy = vi.fn();
        bridge = new InspectorBridge({ port: 9332, onTriggerReRender: triggerSpy });

        const response = bridge.handleJSONRPC({
            jsonrpc: '2.0',
            id: 3,
            method: 'TermUI.triggerReRender',
        });

        expect(triggerSpy).toHaveBeenCalledOnce();
        expect(response.result.success).toBe(true);
    });

    it('returns error for unknown method', () => {
        bridge = new InspectorBridge({ port: 9333 });

        const response = bridge.handleJSONRPC({
            jsonrpc: '2.0',
            id: 4,
            method: 'TermUI.unknownMethod',
        });

        expect(response.error).toBeDefined();
        expect(response.error?.code).toBe(-32601);
    });

    it('starts and stops HTTP server', async () => {
        bridge = new InspectorBridge({ port: 9334 });
        expect(bridge.isListening).toBe(false);

        await bridge.start();
        expect(bridge.isListening).toBe(true);

        await bridge.stop();
        expect(bridge.isListening).toBe(false);
    });

    it('integrates with DevServer options', () => {
        bridge = new InspectorBridge({ port: 9335 });
        const devServer = new DevServer({
            rootDir: process.cwd(),
            inspector: bridge,
        });

        expect(devServer.inspector).toBe(bridge);
    });
});
