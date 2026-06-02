import { App, type KeyEvent } from '@termuijs/core';
import { wordWrap } from '@termuijs/core';
import { Widget, Box, Text, ScrollView, ChatMessage, TextInput } from '@termuijs/widgets';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    widget: ChatMessage;
}

class ChatExampleApp extends Widget {
    private messages: Message[] = [];
    private messagesScrollView: ScrollView;
    private chatContainer: Box;
    private textInput: TextInput;
    private isStreaming = false;
    private lastWidth = 0;

    constructor() {
        super({ flexDirection: 'column', padding: 1, gap: 1 });

        // Header Title
        const title = new Text(' TermUI Streaming Chat Assistant ', {
            bold: true,
            fg: { type: 'named', name: 'cyan' },
            height: 1,
        });

        // Messages scroll container
        this.messagesScrollView = new ScrollView(
            {
                flexGrow: 1,
                border: 'single',
                borderColor: { type: 'named', name: 'brightBlack' },
            },
            { showScrollbar: true }
        );

        // Container inside scroll view to hold ChatMessage widgets
        this.chatContainer = new Box({
            flexDirection: 'column',
            gap: 1,
        });
        this.messagesScrollView.addChild(this.chatContainer);

        // Prompt input area
        const inputContainer = new Box({
            flexDirection: 'row',
            height: 3,
            gap: 1,
        });

        const promptLabel = new Text(' Prompt: ', {
            fg: { type: 'named', name: 'green' },
            bold: true,
            height: 1,
        });

        this.textInput = new TextInput(
            { flexGrow: 1 },
            {
                placeholder: 'Type a message and press Enter...',
                onSubmit: (val) => this.handleSendMessage(val),
            }
        );

        inputContainer.addChild(promptLabel);
        inputContainer.addChild(this.textInput);

        // Help bar at the bottom
        const helpText = new Text(' Controls: [Enter] Send | [q] Quit | [Ctrl+C] Quit ', {
            dim: true,
            height: 1,
        });

        // Build widget tree
        this.addChild(title);
        this.addChild(this.messagesScrollView);
        this.addChild(inputContainer);
        this.addChild(helpText);

        // Focus the input by default
        this.textInput.isFocused = true;

        // Initialize with welcome message
        this.addMessage(
            'assistant',
            'Hello! I am a terminal assistant built using TermUI. Type a message below and I will stream a response back to you!'
        );
    }

    private addMessage(role: 'user' | 'assistant', content: string): Message {
        const timestamp = new Date();
        const widget = new ChatMessage({ role, content, timestamp });
        this.chatContainer.addChild(widget);
        
        const msg: Message = { role, content, widget };
        this.messages.push(msg);
        
        this.updateMessageHeights();
        return msg;
    }

    private updateMessageHeights() {
        const width = this.rect.width || 80; // fallback to 80 if layout not computed yet
        const scrollbarWidth = 2; // scrollbar and right border takes space
        const leftBorderWidth = 1;
        const paddingOffset = 2; // internal spacing offset
        const contentWidth = Math.max(20, width - scrollbarWidth - leftBorderWidth - paddingOffset - 4);

        let totalHeight = 0;
        for (const msg of this.messages) {
            // ChatMessage wraps content inside a 2-char indent
            const textWidth = Math.max(10, contentWidth - 2); 
            const lines = wordWrap(msg.content, textWidth).split('\n');
            // Height = 1 row badge + content line count
            const height = 1 + lines.length;
            
            msg.widget.setStyle({ height });
            totalHeight += height;
        }

        // Add gap space between messages
        if (this.messages.length > 1) {
            totalHeight += (this.messages.length - 1) * (this.chatContainer.style.gap ?? 1);
        }

        this.chatContainer.setStyle({ height: totalHeight });
        this.messagesScrollView.setContentHeight(totalHeight);

        // Scroll to the bottom to keep new streaming text visible
        const scrollViewHeight = this.messagesScrollView.rect.height;
        const visibleHeight = Math.max(0, scrollViewHeight - 2); // subtract top/bottom border
        const maxOffset = Math.max(0, totalHeight - visibleHeight);
        this.messagesScrollView.scrollTo(maxOffset);

        this.markDirty();
    }

    override syncLayout(): void {
        super.syncLayout();
        if (this.rect.width !== this.lastWidth) {
            this.lastWidth = this.rect.width;
            this.updateMessageHeights();
            
            // Re-render next tick to let Yoga compute using the new heights
            setTimeout(() => {
                this.markDirty();
                (globalThis as any).__appInstance?.requestRender();
            }, 0);
        }
    }

    handleSendMessage(content: string) {
        const trimmed = content.trim();
        if (!trimmed) return;

        // 1. Add user message
        this.addMessage('user', trimmed);
        this.textInput.clear();

        if (this.isStreaming) return;
        this.isStreaming = true;

        // 2. Add empty assistant message to stream into
        const assistantMsg = this.addMessage('assistant', '');

        // 3. Prepare response content
        const responses = [
            `I received your message: "${trimmed}".\n\nThis is a demonstration of streaming responses in TermUI. When using the ChatMessage widget, the content layout automatically wraps based on the available terminal width, and the ScrollView container handles history scrolling. Notice how the scrollbar updates and auto-scrolls to keep the latest lines visible!`,
            `Interesting question! Let's think about "${trimmed}" for a moment. Streaming in TermUI is highly reactive because any mutation to widget content triggers a markDirty() call, which flags the layout engine to re-render in the next frame. The differential terminal renderer then only writes the updated cells to stdout, ensuring high performance.`,
            `Here is a quick summary of the TermUI architecture for your prompt:\n- Core: Handles screen buffers, ANSI escape codes, and input parsing.\n- Widgets: Standard UI components (Boxes, Texts, Lists, ChatMessages).\n- Motion: Provides smooth spring and easing animations.\n- TSS: Style sheet engine for custom styling.\n\nHope this is helpful!`
        ];

        // Pick response based on input length to keep it deterministic but varied
        const responseText = responses[trimmed.length % responses.length];

        let charIndex = 0;
        const charsPerTick = 3;

        const interval = setInterval(() => {
            charIndex += charsPerTick;
            const currentChunk = responseText.slice(0, charIndex);
            
            assistantMsg.content = currentChunk;
            assistantMsg.widget.setContent(currentChunk);
            
            this.updateMessageHeights();

            // Request render pass
            this.markDirty();
            (globalThis as any).__appInstance?.requestRender();

            if (charIndex >= responseText.length) {
                clearInterval(interval);
                this.isStreaming = false;
            }
        }, 40);
    }

    handleTextInputKey(event: KeyEvent): void {
        const key = event.key;
        switch (key) {
            case 'backspace':
                this.textInput.deleteBack();
                break;
            case 'delete':
                this.textInput.deleteForward();
                break;
            case 'left':
                this.textInput.moveCursorLeft();
                break;
            case 'right':
                this.textInput.moveCursorRight();
                break;
            case 'home':
                this.textInput.moveCursorHome();
                break;
            case 'end':
                this.textInput.moveCursorEnd();
                break;
            case 'enter':
            case 'return':
                this.textInput.submit();
                break;
            default:
                if (key && key.length === 1 && !event.ctrl && !event.alt) {
                    this.textInput.insertChar(key);
                }
        }
    }

    handleKey(event: KeyEvent): boolean {
        // Exit globally if q or Ctrl+C is pressed
        if (event.key === 'q' || (event.ctrl && event.key === 'c')) {
            return false;
        }

        // Route other key events to TextInput
        this.handleTextInputKey(event);
        return true;
    }

    protected _renderSelf(): void {}
}

async function main() {
    const chatApp = new ChatExampleApp();

    const app = new App(chatApp, {
        fullscreen: true,
        title: 'TermUI Streaming Chat',
        fps: 30,
    });

    (globalThis as any).__appInstance = app;

    app.events.on('key', (event) => {
        const shouldContinue = chatApp.handleKey(event);
        if (!shouldContinue) app.exit(0);
        app.requestRender();
    });

    const exitCode = await app.mount();
    process.exit(exitCode);
}

main().catch((err) => {
    console.error('Fatal Error:', err);
    process.exit(1);
});
