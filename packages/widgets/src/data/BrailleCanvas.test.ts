import { describe, it, expect } from 'vitest';
import { BrailleCanvas } from './BrailleCanvas.js';
async function renderCanvas(
    draw: (canvas: BrailleCanvas) => void,
): Promise<string[]> {
    const { Screen } = await import('@termuijs/core');


    const canvas = new BrailleCanvas({
        width: 2,
        height: 4,
    });

    draw(canvas);

    const screen = new Screen(10, 10);

    canvas.updateRect({
        x: 0,
        y: 0,
        width: 10,
        height: 10,
    });

    canvas.render(screen);

    return screen.back.map(
        row => row.map(cell => cell.char).join(''),
    );
}
describe('BrailleCanvas', () => {
  describe('drawPixel()', () => {
    it('maps (0,0) to braille dot 1',
      async () => {
         const lines = await renderCanvas(canvas => {
          canvas.drawPixel(0, 0);
         });
        expect(lines[0]![0]).toBe('⠁');
      });
    it('maps (0,1) to braille dot 2',
      async () => {
         const lines = await renderCanvas(canvas => {
          canvas.drawPixel(0, 1);
         });
        expect(lines[0]![0]).toBe('⠂');
      });
    it('maps (0,2) to braille dot 3',
      async () => {
         const lines = await renderCanvas(canvas => {
          canvas.drawPixel(0, 2);
         });
        expect(lines[0]![0]).toBe('⠄');
      });
    it('maps (0,3) to braille dot 7',
      async () => {
         const lines = await renderCanvas(canvas => {
          canvas.drawPixel(0, 3);
         });
        expect(lines[0]![0]).toBe('⡀');
      });

    it('maps (1,0) to braille dot 4',
      async () => {
         const lines = await renderCanvas(canvas => {
          canvas.drawPixel(1, 0);
         });
        expect(lines[0]![0]).toBe('⠈');
      });
    it('maps (1,1) to braille dot 5',
      async () => {
         const lines = await renderCanvas(canvas => {
          canvas.drawPixel(1, 1);
         });
        expect(lines[0]![0]).toBe('⠐');
      });
    it('maps (1,2) to braille dot 6',
      async () => {
         const lines = await renderCanvas(canvas => {
          canvas.drawPixel(1, 2);
         });
        expect(lines[0]![0]).toBe('⠠');
      });
    it('maps (1,3) to braille dot 8',
      async () => {
         const lines = await renderCanvas(canvas => {
          canvas.drawPixel(1, 3);
         });
       expect(lines[0]![0]).toBe('⢀');
      });
  });

  describe('braille composition', () => {
    it('combines multiple dots into one character', async () => {
        const lines = await renderCanvas(canvas => {
            canvas.drawPixel(0, 0);
            canvas.drawPixel(1, 0);
        });

        expect(lines[0]![0]).toBe('⠉');
    });

    it('renders full braille cell correctly', async () => {
        const lines = await renderCanvas(canvas => {
            for (let y = 0; y < 4; y++) {
                for (let x = 0; x < 2; x++) {
                    canvas.drawPixel(x, y);
                }
            }
        });

        expect(lines[0]![0]).toBe('⣿');
    });
});

describe('bounds handling', () => {
    it('ignores negative coordinates', async () => {
        const lines = await renderCanvas(canvas => {
            canvas.drawPixel(-1, -1);
        });

        expect(lines[0]![0]).toBe('⠀');
    });

    it('ignores coordinates outside canvas', async () => {
        const lines = await renderCanvas(canvas => {
            canvas.drawPixel(10, 10);
        });

        expect(lines[0]![0]).toBe('⠀');
    });
});

describe('drawLine()', () => {
    it('draws a horizontal line', async () => {
        const lines = await renderCanvas(canvas => {
            canvas.drawLine(0, 0, 1, 0);
        });

        expect(lines[0]![0]).not.toBe('⠀');
    });

    it('draws a vertical line', async () => {
        const lines = await renderCanvas(canvas => {
            canvas.drawLine(0, 0, 0, 3);
        });

        expect(lines[0]![0]).not.toBe('⠀');
    });

    it('draws a diagonal line', async () => {
        const lines = await renderCanvas(canvas => {
            canvas.drawLine(0, 0, 1, 3);
        });

        expect(lines[0]![0]).not.toBe('⠀');
    });

    describe('drawCircle()', () => {
        it('draws a circle', async () => {
            const lines = await renderCanvas(canvas => {
                canvas.drawCircle(1, 2, 1);
            });

            expect(lines[0]![0]).not.toBe('⠀');
        });
    });
});

describe('rendering', () => {
    it('renders blank canvas as empty braille cells', async () => {
        const lines = await renderCanvas(() => {});

        expect(lines[0]![0]).toBe('⠀');
    });

    it('renders known pixel pattern correctly', async () => {
        const lines = await renderCanvas(canvas => {
            canvas.drawPixel(0, 0);
            canvas.drawPixel(0, 1);
        });

        expect(lines[0]![0]).toBe('⠃');
    });
});
});
