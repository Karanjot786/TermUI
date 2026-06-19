import { Widget, ScrollView, Box, ChatMessage, type MessageRole, type ChatMessageOptions } from '@termuijs/widgets';
import {
    type Style,
    type Screen,
    mergeStyles,
    defaultStyle,
    wordWrap,
} from '@termuijs/core';

export interface ChatThreadOptions {
    style?: Partial<Style>;
    showScrollbar?: boolean;
}

export class ChatThread extends Widget {
    private _scrollView: ScrollView;
    private _container: Box;
    private _messageData: ChatMessageOptions[] = [];
    private _messages: ChatMessage[] = [];
    private _lastWidth = 0;

    constructor(options: ChatThreadOptions = {}) {
        const style = mergeStyles(defaultStyle(), {
            flexDirection: 'column',
            flexGrow: 1,
            ...options.style,
        });
        super(style);

        this._scrollView = new ScrollView(
            { flexGrow: 1 },
            { showScrollbar: options.showScrollbar !== false }
        );
        this._container = new Box({
            flexDirection: 'column',
            gap: 1,
        });

        this._scrollView.addChild(this._container);
        this.addChild(this._scrollView);
    }

    private _updateMessageHeights(): void {
        const width = this._rect.width || 80;
        const scrollbarWidth = 2;
        const leftBorderWidth = 1;
        const paddingOffset = 2;
        const contentWidth = Math.max(20, width - scrollbarWidth - leftBorderWidth - paddingOffset - 4);

        let totalHeight = 0;
        for (let i = 0; i < this._messages.length; i++) {
            const msg = this._messages[i];
            const data = this._messageData[i];
            const textWidth = Math.max(10, contentWidth - 2);
            const lines = wordWrap(data.content, textWidth).split('\n');
            const height = 1 + lines.length;
            msg.setStyle({ height });
            totalHeight += height;
        }

        if (this._messages.length > 1) {
            totalHeight += (this._messages.length - 1) * (this._container.style.gap ?? 1);
        }

        this._container.setStyle({ height: totalHeight });
        this._scrollView.setContentHeight(totalHeight);

        // Scroll to the bottom
        const scrollViewHeight = this._scrollView.rect.height || 10;
        const visibleHeight = Math.max(0, scrollViewHeight - 2);
        const maxOffset = Math.max(0, totalHeight - visibleHeight);
        this._scrollView.scrollTo(maxOffset);
    }

    addMessage(options: ChatMessageOptions): ChatMessage {
        this._messageData.push(options);
        const messageWidget = new ChatMessage(options);
        this._messages.push(messageWidget);
        this._container.addChild(messageWidget);
        this._updateMessageHeights();
        this.markDirty();
        return messageWidget;
    }

    updateMessageContent(messageWidget: ChatMessage, content: string): void {
        const idx = this._messages.indexOf(messageWidget);
        if (idx >= 0) {
            this._messageData[idx].content = content;
            messageWidget.setContent(content);
            this._updateMessageHeights();
            this.markDirty();
        }
    }

    clear(): void {
        this._messageData = [];
        this._messages = [];
        this._container.clearChildren();
        this.markDirty();
    }

    addThreadWidget(widget: Widget): void {
        this._container.addChild(widget);
        this._updateMessageHeights();
        this.markDirty();
    }

    removeThreadWidget(widget: Widget): void {
        this._container.removeChild(widget);
        this._updateMessageHeights();
        this.markDirty();
    }

    get messages(): ReadonlyArray<ChatMessage> {
        return this._messages;
    }

    override syncLayout(): void {
        super.syncLayout();
        if (this._rect.width !== this._lastWidth) {
            this._lastWidth = this._rect.width;
            this._updateMessageHeights();
        }
    }

    protected _renderSelf(screen: Screen): void {
        // Render handled by base Widget and child components
    }
}
