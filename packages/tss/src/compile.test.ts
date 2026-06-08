import { describe, it, expect } from 'vitest';
import { compile } from './engine.js';

describe('TSS compiler (nested rules)', () => {
    it('flattens nested rules into standalone rules joining selectors', () => {
        const css = `
          .card {
            color: red;
            .title { color: blue; }
          }
        `;
        const result = compile(css);
        
        expect(result).toContain('.card { color: red; }');
        expect(result).toContain('.card .title { color: blue; }');
    });

    it('works with multiple levels of nesting', () => {
        const css = `
          Box.panel {
            bg: #111;
            .header {
              fg: #fff;
              :hover {
                fg: red;
              }
            }
          }
        `;
        const result = compile(css);
        
        expect(result).toContain('Box.panel { bg: #111; }');
        expect(result).toContain('Box.panel .header { fg: #fff; }');
        expect(result).toContain('Box.panel .header :hover { fg: red; }');
    });
});
