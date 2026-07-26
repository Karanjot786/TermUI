// ─────────────────────────────────────────────────────
// @termuijs/dev-server — Inspector Bridge
// ─────────────────────────────────────────────────────

import { createServer, type Server, type IncomingMessage, type ServerResponse } from 'node:http';
import type { WidgetNode, PerfMetrics } from './devtools.js';

export interface InspectorBridgeOptions {
    /** Port to listen on (default: 9229) */
    port?: number;
    /** Host to bind (default: '127.0.0.1') */
    host?: string;
    /** Auto-start server on construction */
    autoStart?: boolean;
    /** Callback when re-render is triggered by inspector client */
    onTriggerReRender?: () => void;
}

export interface JSONRPCRequest {
    jsonrpc: string;
    id?: string | number;
    method: string;
    params?: any;
}

export interface JSONRPCResponse {
    jsonrpc: string;
    id?: string | number;
    result?: any;
    error?: { code: number; message: string; data?: any };
}

export class InspectorBridge {
    private _port: number;
    private _host: string;
    private _server: Server | null = null;
    private _listening = false;
    private _vnodeTree: WidgetNode | null = null;
    private _renderMetrics: Partial<PerfMetrics> & { fps?: number; dirtyCells?: number; memoryUsage?: number } = {
        fps: 60,
        dirtyCells: 0,
        memoryUsage: 0,
    };
    private _onTriggerReRender?: () => void;
    private _clients = new Set<ServerResponse>();

    constructor(options: InspectorBridgeOptions = {}) {
        this._port = options.port ?? 9229;
        this._host = options.host ?? '127.0.0.1';
        this._onTriggerReRender = options.onTriggerReRender;

        if (options.autoStart) {
            this.start();
        }
    }

    get port(): number { return this._port; }
    get isListening(): boolean { return this._listening; }

    updateVNodeTree(tree: WidgetNode | null): void {
        this._vnodeTree = tree;
        this.broadcast('TermUI.vnodeTreeUpdated', { tree });
    }

    updateRenderMetrics(metrics: Partial<PerfMetrics> & { fps?: number; dirtyCells?: number; memoryUsage?: number }): void {
        this._renderMetrics = { ...this._renderMetrics, ...metrics };
        this.broadcast('TermUI.renderMetricsUpdated', { metrics: this._renderMetrics });
    }

    handleJSONRPC(req: JSONRPCRequest): JSONRPCResponse {
        const id = req.id ?? null;

        switch (req.method) {
            case 'TermUI.getVNodeTree':
                return {
                    jsonrpc: '2.0',
                    id: id!,
                    result: { tree: this._vnodeTree },
                };
            case 'TermUI.getRenderMetrics':
                return {
                    jsonrpc: '2.0',
                    id: id!,
                    result: { metrics: this._renderMetrics },
                };
            case 'TermUI.triggerReRender':
                this._onTriggerReRender?.();
                this.broadcast('TermUI.reRenderTriggered', { timestamp: Date.now() });
                return {
                    jsonrpc: '2.0',
                    id: id!,
                    result: { success: true, timestamp: Date.now() },
                };
            default:
                return {
                    jsonrpc: '2.0',
                    id: id!,
                    error: {
                        code: -32601,
                        message: `Method not found: ${req.method}`,
                    },
                };
        }
    }

    start(): Promise<void> {
        if (this._listening) return Promise.resolve();

        return new Promise((resolve, reject) => {
            this._server = createServer((req: IncomingMessage, res: ServerResponse) => {
                // Enable CORS
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

                if (req.method === 'OPTIONS') {
                    res.writeHead(204);
                    res.end();
                    return;
                }

                if (req.method === 'POST') {
                    let body = '';
                    req.on('data', (chunk) => { body += chunk; });
                    req.on('end', () => {
                        try {
                            const json = JSON.parse(body) as JSONRPCRequest;
                            const response = this.handleJSONRPC(json);
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify(response));
                        } catch {
                            res.writeHead(400, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({
                                jsonrpc: '2.0',
                                id: null,
                                error: { code: -32700, message: 'Parse error' }
                            }));
                        }
                    });
                    return;
                }

                if (req.url === '/events') {
                    res.writeHead(200, {
                        'Content-Type': 'text/event-stream',
                        'Cache-Control': 'no-cache',
                        'Connection': 'keep-alive',
                    });
                    this._clients.add(res);
                    req.on('close', () => {
                        this._clients.delete(res);
                    });
                    return;
                }

                // Default status / handshake
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    service: 'TermUI DevTools Inspector Bridge',
                    port: this._port,
                    status: 'online',
                }));
            });

            this._server.on('error', (err) => {
                reject(err);
            });

            this._server.listen(this._port, this._host, () => {
                this._listening = true;
                resolve();
            });
        });
    }

    stop(): Promise<void> {
        if (!this._listening || !this._server) return Promise.resolve();

        return new Promise((resolve) => {
            for (const client of this._clients) {
                client.end();
            }
            this._clients.clear();

            this._server?.close(() => {
                this._listening = false;
                this._server = null;
                resolve();
            });
        });
    }

    broadcast(method: string, params: any): void {
        const payload = `data: ${JSON.stringify({ jsonrpc: '2.0', method, params })}\n\n`;
        for (const client of this._clients) {
            try {
                client.write(payload);
            } catch {
                this._clients.delete(client);
            }
        }
    }
}
