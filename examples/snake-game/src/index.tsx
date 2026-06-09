import { App, type KeyEvent, type Screen, type Style, styleToCellAttrs } from '@termuijs/core';
import { Widget, Box, Text, Center } from '@termuijs/widgets';

const GRID_SIZE = 15;
const TICK_INTERVAL_MS = 150;

// ----------------------------- Snake Board Widget ----------------------------
class SnakeBoard extends Widget {
    private gridSize: number;
    private snake: { x: number; y: number }[];
    private food: { x: number; y: number };

    constructor(gridSize: number, snake: { x: number; y: number }[], food: { x: number; y: number }) {
        super({
            width: gridSize * 2,
            height: gridSize,
            border: 'single',
            borderColor: { type: 'named', name: 'white' },
        });
        this.gridSize = gridSize;
        this.snake = snake;
        this.food = food;
    }

    public updateState(snake: { x: number; y: number }[], food: { x: number; y: number }) {
        this.snake = snake;
        this.food = food;
        this.markDirty();
    }

    protected _renderSelf(screen: Screen): void {
        const rect = this._getContentRect();
        const { x, y } = rect;
        const attrs = styleToCellAttrs(this._style);

        const grid: string[][] = Array(this.gridSize).fill(null).map(() => Array(this.gridSize).fill(' '));
        for (const seg of this.snake) {
            if (seg.x >= 0 && seg.x < this.gridSize && seg.y >= 0 && seg.y < this.gridSize)
                grid[seg.y][seg.x] = '■';
        }
        if (this.food.x >= 0 && this.food.x < this.gridSize && this.food.y >= 0 && this.food.y < this.gridSize)
            grid[this.food.y][this.food.x] = '●';

        for (let row = 0; row < this.gridSize; row++) {
            let line = '';
            for (let col = 0; col < this.gridSize; col++) {
                line += grid[row][col] + ' ';
            }
            screen.writeString(x, y + row, line, attrs);
        }
    }
}

// ----------------------------- Main Snake Game Widget ------------------------
class SnakeGame extends Widget {
    private scoreText: Text;
    private board: SnakeBoard;
    private gameOverText: Text | null = null;
    private snake: { x: number; y: number }[] = [{ x: 7, y: 7 }];
    private direction: 'up' | 'down' | 'left' | 'right' = 'right';
    private food: { x: number; y: number };
    private score = 0;
    private gameOver = false;
    private timer: NodeJS.Timeout | null = null;

    constructor() {
        super({
            flexDirection: 'column',
            width: GRID_SIZE * 2 + 4,
            height: GRID_SIZE + 6,
            border: 'double',
            borderColor: { type: 'named', name: 'cyan' },
            padding: 1,
        });

        const title = new Text(' 🐍 SNAKE GAME 🐍 ', {
            bold: true,
            fg: { type: 'named', name: 'cyan' },
        }, { align: 'center' });

        this.scoreText = new Text(`Score: ${this.score}`, {
            bold: true,
            fg: { type: 'named', name: 'green' },
        }, { align: 'center' });

        const initialFood = this.generateRandomFood();
        if (!initialFood) {
            // Should never happen with 1 cell snake, but just in case
            this.food = { x: 0, y: 0 };
        } else {
            this.food = initialFood;
        }
        this.board = new SnakeBoard(GRID_SIZE, this.snake, this.food);

        this.addChild(title);
        this.addChild(new Box({ height: 1 }));
        this.addChild(this.scoreText);
        this.addChild(new Box({ height: 1 }));
        this.addChild(this.board);
    }

    // Returns null when board is full (victory condition)
    private generateRandomFood(): { x: number; y: number } | null {
        if (this.snake.length >= GRID_SIZE * GRID_SIZE) {
            return null;
        }
        let newPos: { x: number; y: number };
        do {
            newPos = {
                x: Math.floor(Math.random() * GRID_SIZE),
                y: Math.floor(Math.random() * GRID_SIZE),
            };
        } while (this.snake.some(seg => seg.x === newPos.x && seg.y === newPos.y));
        return newPos;
    }

    private moveSnake() {
        if (this.gameOver) return;

        const head = this.snake[0];
        let newHead = { ...head };

        switch (this.direction) {
            case 'right': newHead.x++; break;
            case 'left':  newHead.x--; break;
            case 'up':    newHead.y--; break;
            case 'down':  newHead.y++; break;
        }

        // Wall collision
        if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
            this.endGame(false);
            return;
        }

        const willEat = (newHead.x === this.food.x && newHead.y === this.food.y);
        let newSnake = [newHead, ...this.snake];
        if (!willEat) newSnake.pop();

        // Self collision
        const headPos = newSnake[0];
        if (newSnake.slice(1).some(seg => seg.x === headPos.x && seg.y === headPos.y)) {
            this.endGame(false);
            return;
        }

        this.snake = newSnake;

        if (willEat) {
            this.score++;
            this.scoreText.setContent(`Score: ${this.score}`);
            const nextFood = this.generateRandomFood();
            if (!nextFood) {
                // Board full → victory
                this.endGame(true);
                return;
            }
            this.food = nextFood;
        }

        this.board.updateState(this.snake, this.food);
        this.markDirty();
    }

    private endGame(victory: boolean = false) {
        if (this.gameOver) return;
        this.gameOver = true;
        if (this.timer) clearInterval(this.timer);
        const message = victory ? ' 🎉 YOU WIN! 🎉 ' : ' 💀 GAME OVER 💀 ';
        this.gameOverText = new Text(message, {
            bold: true,
            fg: victory ? { type: 'named', name: 'green' } : { type: 'named', name: 'red' },
        }, { align: 'center' });
        this.addChild(this.gameOverText);
        this.markDirty();
    }

    private restart() {
        this.snake = [{ x: 7, y: 7 }];
        this.direction = 'right';
        this.score = 0;
        this.gameOver = false;
        const newFood = this.generateRandomFood();
        if (newFood) this.food = newFood;
        this.scoreText.setContent('Score: 0');
        if (this.gameOverText) {
            this.removeChild(this.gameOverText);
            this.gameOverText = null;
        }
        this.board.updateState(this.snake, this.food);
        this.markDirty();

        if (this.timer) clearInterval(this.timer);
        this.timer = setInterval(() => this.moveSnake(), TICK_INTERVAL_MS);
    }

    public onMount() {
        this.timer = setInterval(() => this.moveSnake(), TICK_INTERVAL_MS);
    }

    public onUnmount() {
        if (this.timer) clearInterval(this.timer);
    }

    public handleKey(event: KeyEvent): boolean {
        const key = event.key;

        if (key === 'q' || (event.ctrl && key === 'c')) {
            return false;
        }

        if (this.gameOver && (key === 'r')) {
            this.restart();
            return true;
        }

        let newDir: 'up' | 'down' | 'left' | 'right' | null = null;
        if (key === 'up' || key === 'w') newDir = 'up';
        else if (key === 'down' || key === 's') newDir = 'down';
        else if (key === 'left' || key === 'a') newDir = 'left';
        else if (key === 'right' || key === 'd') newDir = 'right';

        if (newDir) {
            if (
                (newDir === 'up' && this.direction !== 'down') ||
                (newDir === 'down' && this.direction !== 'up') ||
                (newDir === 'left' && this.direction !== 'right') ||
                (newDir === 'right' && this.direction !== 'left')
            ) {
                this.direction = newDir;
            }
            return true;
        }
        return true;
    }

    protected _renderSelf(_screen: Screen): void {}
}

async function main() {
    const game = new SnakeGame();
    const center = new Center({}, { horizontal: true, vertical: true });
    center.addChild(game);

    const app = new App(center, {
        fullscreen: true,
        title: 'Snake Game - TermUI',
        fps: 30,
    });

    app.events.on('key', (event: KeyEvent) => {
        const shouldContinue = game.handleKey(event);
        if (!shouldContinue) {
            app.exit(0);
        }
        app.requestRender();
    });

    const exitCode = await app.mount();
    process.exit(exitCode);
}

main().catch(err => {
    console.error('Snake game error:', err);
    process.exit(1);
});