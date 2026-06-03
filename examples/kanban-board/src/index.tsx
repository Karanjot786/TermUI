import { App, type KeyEvent } from '@termuijs/core';
import { Box, Text, Widget } from '@termuijs/widgets';

type Card = { id: string; text: string };
type ColumnData = { title: string; cards: Card[] };

class KanbanBoard extends Widget {
    private columnsData: ColumnData[];
    private activeColIdx = 0;
    private activeCardIdx = 0;
    
    // UI References
    private columnWidgets: Box[] = [];
    private cardWidgets: Map<string, Text> = new Map();

    constructor() {
        super({ flexDirection: 'column', width: '100%', height: '100%', padding: 1, gap: 1 });

        this.columnsData = [
            {
                title: 'To Do',
                cards: [
                    { id: '1', text: 'Learn TermUI' },
                    { id: '2', text: 'Read AGENTS.md' }
                ]
            },
            {
                title: 'In Progress',
                cards: [
                    { id: '3', text: 'Build Kanban App' }
                ]
            },
            {
                title: 'Done',
                cards: [
                    { id: '4', text: 'Initialize workspace' }
                ]
            }
        ];

        this.addChild(new Text(' 📋 Kanban Board Example ', { bold: true, fg: { type: 'named', name: 'cyan' } }));

        const boardLayout = new Box({ flexDirection: 'row', width: '100%', flex: 1, gap: 2 });
        this.addChild(boardLayout);

        for (let i = 0; i < this.columnsData.length; i++) {
            const colWidget = new Box({ flexDirection: 'column', width: 25, flex: 0, border: 'single', padding: 1, gap: 1 });
            this.columnWidgets.push(colWidget);
            boardLayout.addChild(colWidget);
        }

        const footer = new Text(
            'Controls: [Left/Right] Move Column | [Up/Down] Move Card | [Shift+Left/Right] Move Card to Column | [q] Quit', 
            { dim: true }
        );
        this.addChild(footer);

        this.renderBoard();
    }

    private renderBoard() {
        // Clear all columns
        for (const col of this.columnWidgets) {
            col.clearChildren();
        }
        this.cardWidgets.clear();

        // Re-populate columns
        for (let c = 0; c < this.columnsData.length; c++) {
            const colData = this.columnsData[c];
            const colWidget = this.columnWidgets[c];

            // Column Header
            const headerColor = this.activeColIdx === c ? { type: 'named', name: 'blue' as const } : { type: 'named', name: 'default' as const };
            colWidget.setStyle({ borderFg: headerColor });
            colWidget.addChild(new Text(colData.title.toUpperCase(), { bold: true, fg: headerColor }));
            colWidget.addChild(new Text('─'.repeat(21), { dim: true }));

            // Cards
            if (colData.cards.length === 0) {
                colWidget.addChild(new Text(' (Empty)', { dim: true }));
            } else {
                for (let r = 0; r < colData.cards.length; r++) {
                    const card = colData.cards[r];
                    const isSelected = this.activeColIdx === c && this.activeCardIdx === r;
                    const cardText = new Text(` ${card.text} `, { 
                        inverse: isSelected, 
                        fg: isSelected ? { type: 'named', name: 'white' } : { type: 'named', name: 'default' } 
                    });
                    this.cardWidgets.set(card.id, cardText);
                    colWidget.addChild(cardText);
                }
            }
        }

        this.markDirty();
    }

    private clampIndexes() {
        if (this.activeColIdx < 0) this.activeColIdx = 0;
        if (this.activeColIdx >= this.columnsData.length) this.activeColIdx = this.columnsData.length - 1;

        const currentCards = this.columnsData[this.activeColIdx].cards;
        if (currentCards.length === 0) {
            this.activeCardIdx = 0;
        } else {
            if (this.activeCardIdx < 0) this.activeCardIdx = 0;
            if (this.activeCardIdx >= currentCards.length) this.activeCardIdx = currentCards.length - 1;
        }
    }

    handleKey(event: KeyEvent): boolean {
        if (event.key === 'q' || (event.ctrl && event.key === 'c')) {
            return false; // Quit
        }

        const isShift = event.shift;

        if (event.key === 'left') {
            if (isShift) {
                // Move card left
                if (this.activeColIdx > 0 && this.columnsData[this.activeColIdx].cards.length > 0) {
                    const card = this.columnsData[this.activeColIdx].cards.splice(this.activeCardIdx, 1)[0];
                    this.activeColIdx--;
                    this.columnsData[this.activeColIdx].cards.push(card);
                    this.activeCardIdx = this.columnsData[this.activeColIdx].cards.length - 1;
                }
            } else {
                this.activeColIdx--;
            }
        } else if (event.key === 'right') {
            if (isShift) {
                // Move card right
                if (this.activeColIdx < this.columnsData.length - 1 && this.columnsData[this.activeColIdx].cards.length > 0) {
                    const card = this.columnsData[this.activeColIdx].cards.splice(this.activeCardIdx, 1)[0];
                    this.activeColIdx++;
                    this.columnsData[this.activeColIdx].cards.push(card);
                    this.activeCardIdx = this.columnsData[this.activeColIdx].cards.length - 1;
                }
            } else {
                this.activeColIdx++;
            }
        } else if (event.key === 'up') {
            this.activeCardIdx--;
        } else if (event.key === 'down') {
            this.activeCardIdx++;
        }

        this.clampIndexes();
        this.renderBoard();
        return true;
    }

    protected _renderSelf(): void { }
}

async function main() {
    const board = new KanbanBoard();

    const app = new App(board, {
        fullscreen: true,
        title: 'Kanban Board',
        fps: 30,
    });

    app.events.on('key', (event) => {
        const shouldContinue = board.handleKey(event);
        if (!shouldContinue) app.exit(0);
        app.requestRender();
    });

    const exitCode = await app.mount();
    process.exit(exitCode);
}

main().catch((err) => {
    console.error('Error:', err);
    process.exit(1);
});
