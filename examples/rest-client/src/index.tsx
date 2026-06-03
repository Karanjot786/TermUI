import { App, type KeyEvent } from '@termuijs/core';
import { Box, JSONView, Text, Widget } from '@termuijs/widgets';
import { Form, Tabs } from '@termuijs/ui';

type ResponseState = {
    body: unknown;
    headers: Record<string, string>;
    status: string;
    elapsedMs: number;
    isJson: boolean;
};

const METHOD_OPTIONS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD'];

function parseHeaders(input: string): Headers {
    const headers = new Headers();

    for (const line of input.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        const separator = trimmed.indexOf(':');
        if (separator === -1) continue;

        const key = trimmed.slice(0, separator).trim();
        const value = trimmed.slice(separator + 1).trim();
        if (key) headers.set(key, value);
    }

    return headers;
}

async function readResponseBody(response: Response): Promise<{ body: unknown; isJson: boolean }> {
    const text = await response.text();
    if (!text.trim()) {
        return { body: '(empty response body)', isJson: false };
    }

    try {
        return { body: JSON.parse(text), isJson: true };
    } catch {
        return { body: text, isJson: false };
    }
}

class RestClientExampleApp extends Widget {
    private readonly form: Form;
    private readonly statusText: Text;
    private readonly tabs: Tabs;
    private readonly responseSlot: Box;

    private activeArea: 'form' | 'tabs' = 'form';
    private responseState: ResponseState = {
        body: 'Submit a request to see the response body.',
        headers: {},
        status: 'Idle',
        elapsedMs: 0,
        isJson: false,
    };

    constructor() {
        super({ flexDirection: 'column', padding: 1, gap: 1 });

        this.form = new Form([
            {
                name: 'method',
                label: 'Method',
                type: 'select',
                options: METHOD_OPTIONS,
                placeholder: 'GET',
                validate: (value) => !value.trim() || METHOD_OPTIONS.includes(value.toUpperCase()) ? null : 'Use GET, POST, PUT, PATCH, DELETE, or HEAD',
            },
            {
                name: 'url',
                label: 'URL',
                type: 'text',
                placeholder: 'https://api.github.com/repos/Karanjot786/TermUI',
                required: true,
                validate: (value) => {
                    try {
                        new URL(value);
                        return null;
                    } catch {
                        return 'Enter a valid absolute URL';
                    }
                },
            },
            {
                name: 'headers',
                label: 'Headers',
                type: 'text',
                placeholder: 'Accept: application/json',
            },
        ], {
            onSubmit: (values) => {
                void this.sendRequest(values);
            },
        });

        this.statusText = new Text('Status: Idle', {
            fg: { type: 'named', name: 'brightBlack' },
            height: 2,
        });

        this.tabs = new Tabs([
            { label: 'Body', content: new Box() },
            { label: 'Headers', content: new Box() },
        ], { border: 'single' });

        this.responseSlot = new Box({
            flexDirection: 'column',
            flexGrow: 1,
            border: 'single',
            padding: 1,
        });

        this.addChild(new Text(' REST Client Example ', {
            bold: true,
            fg: { type: 'named', name: 'cyan' },
        }));
        this.addChild(this.form);
        this.addChild(this.statusText);
        this.addChild(this.tabs);
        this.addChild(this.responseSlot);
        this.addChild(new Text('Controls: [Tab] form/response focus | [Enter] submit | [Left]/[Right] response tabs | [q] or Ctrl+C quit', { dim: true }));

        this.updateFocus();
        this.renderResponse();
    }

    private updateFocus(): void {
        this.form.isFocused = this.activeArea === 'form';
        this.tabs.isFocused = this.activeArea === 'tabs';
        this.markDirty();
    }

    private setStatus(message: string, color: 'brightBlack' | 'cyan' | 'green' | 'red' = 'brightBlack'): void {
        this.statusText.setContent(message);
        this.statusText.setStyle({ fg: { type: 'named', name: color } });
    }

    private renderResponse(): void {
        this.responseSlot.clearChildren();

        if (this.tabs.activeIndex === 0) {
            const bodyWidget = this.responseState.isJson
                ? new JSONView({ data: this.responseState.body }, { flexGrow: 1 })
                : new Text(String(this.responseState.body), { flexGrow: 1 }, { wrap: true });
            this.responseSlot.addChild(bodyWidget);
        } else {
            const headerLines = Object.entries(this.responseState.headers)
                .sort(([left], [right]) => left.localeCompare(right))
                .map(([key, value]) => `${key}: ${value}`);
            this.responseSlot.addChild(new Text(headerLines.length > 0 ? headerLines.join('\n') : '(no response headers yet)', {
                flexGrow: 1,
            }, { wrap: true }));
        }

        this.markDirty();
    }

    private async sendRequest(values: Record<string, string>): Promise<void> {
        const method = (values.method || 'GET').toUpperCase();
        const url = values.url.trim();

        this.setStatus(`Sending ${method} ${url}...`, 'cyan');
        const startedAt = performance.now();

        try {
            const response = await fetch(url, {
                method,
                headers: parseHeaders(values.headers ?? ''),
            });
            const elapsedMs = Math.round(performance.now() - startedAt);
            const { body, isJson } = await readResponseBody(response);
            const responseHeaders: Record<string, string> = {};

            response.headers.forEach((value, key) => {
                responseHeaders[key] = value;
            });

            this.responseState = {
                body,
                headers: responseHeaders,
                status: `${response.status} ${response.statusText}`.trim(),
                elapsedMs,
                isJson,
            };
            this.setStatus(`Status: ${this.responseState.status} in ${elapsedMs}ms`, response.ok ? 'green' : 'red');
            this.renderResponse();
        } catch (error) {
            const elapsedMs = Math.round(performance.now() - startedAt);
            const message = error instanceof Error ? error.message : String(error);
            this.responseState = {
                body: `Request failed: ${message}`,
                headers: {},
                status: 'Request failed',
                elapsedMs,
                isJson: false,
            };
            this.setStatus(`Error after ${elapsedMs}ms: ${message}`, 'red');
            this.renderResponse();
        }
    }

    handleKey(event: KeyEvent): boolean {
        if (event.key === 'q' || (event.ctrl && event.key === 'c')) {
            return false;
        }

        if (event.key === 'tab') {
            this.activeArea = this.activeArea === 'form' ? 'tabs' : 'form';
            this.updateFocus();
            return true;
        }

        if (this.activeArea === 'tabs') {
            if (event.key === 'right' || event.key === 'down') {
                this.tabs.nextTab();
                this.renderResponse();
                return true;
            }
            if (event.key === 'left' || event.key === 'up') {
                this.tabs.prevTab();
                this.renderResponse();
                return true;
            }
            return true;
        }

        if (event.key === 'up') {
            this.form.prevField();
        } else if (event.key === 'down') {
            this.form.nextField();
        } else if (event.key === 'backspace') {
            this.form.deleteBack();
        } else if (event.key === 'enter' || event.key === 'return') {
            this.form.submit();
        } else if (event.key && event.key.length === 1 && !event.ctrl && !event.alt) {
            this.form.insertChar(event.key);
        }

        return true;
    }

    protected _renderSelf(): void { }
}

async function main(): Promise<void> {
    const exampleApp = new RestClientExampleApp();

    const app = new App(exampleApp, {
        fullscreen: true,
        title: 'REST Client',
        fps: 30,
    });

    app.events.on('key', (event) => {
        const shouldContinue = exampleApp.handleKey(event);
        if (!shouldContinue) app.exit(0);
        app.requestRender();
    });

    const exitCode = await app.mount();
    process.exit(exitCode);
}

main().catch((error) => {
    console.error('Error:', error);
    process.exit(1);
});
