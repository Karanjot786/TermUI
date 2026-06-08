import { describe, it, expect } from 'vitest';
import { Constraint, Flex, resolveConstraints, resolveLayoutVariables } from './constraint.js';
import type { ResolvableNode } from './constraint.js';
import { Pos } from './pos.js';
import { Dim } from './dim.js';

describe('Constraint Layout', () => {
    it('resolves basic splits', () => {
        const constraints = [
            Constraint.Length(10),
            Constraint.Percentage(50),
            Constraint.Fill(1)
        ];
        
        // 100 available
        // Length(10) -> 10
        // Percentage(50) -> 50
        // Fill(1) -> 100 - 10 - 50 = 40
        const result = resolveConstraints(100, constraints);
        expect(result).toEqual([
            { offset: 0, size: 10 },
            { offset: 10, size: 50 },
            { offset: 60, size: 40 }
        ]);
    });

    it('Flex.SpaceBetween distributes children correctly', () => {
        const constraints = [
            Constraint.Length(20),
            Constraint.Length(20)
        ];
        
        // 100 available, 40 used. 60 free. 2 items -> 1 gap = 60
        const result = resolveConstraints(100, constraints, Flex.SpaceBetween);
        expect(result).toEqual([
            { offset: 0, size: 20 },
            { offset: 80, size: 20 }
        ]);
    });

    it('Constraint.Min() sets a minimum size', () => {
        const constraints = [
            Constraint.Min(30),
            Constraint.Fill()
        ];
        const result = resolveConstraints(100, constraints);
        expect(result[0].size).toBe(30);
        expect(result[1].size).toBe(70);
    });
});

describe('Topological Layout Solver', () => {
    it('resolves Dim before Pos when there is a dependency', () => {
        const node: ResolvableNode = {
            id: 'n1',
            x: Pos.center(), // Depends on width
            y: 0,
            width: Dim.fill(10), // 100 - 10 = 90
            height: 10,
            contentWidth: 0,
            contentHeight: 0,
            computed: { x: 0, y: 0, width: 0, height: 0 }
        };

        resolveLayoutVariables([node], 100, 50);

        // X = (100 - 90) / 2 = 5
        expect(node.computed.width).toBe(90);
        expect(node.computed.x).toBe(5);
        expect(node.computed.height).toBe(10);
        expect(node.computed.y).toBe(0);
    });

    it('detects cycles', () => {
        const node: ResolvableNode = {
            id: 'n1',
            x: Pos.center(),
            y: 0,
            width: Dim.func(ctx => ctx.elementX + 10), // Width depends on X, X depends on Width
            height: 10,
            contentWidth: 0,
            contentHeight: 0,
            computed: { x: 0, y: 0, width: 0, height: 0 }
        };

        expect(() => resolveLayoutVariables([node], 100, 50)).toThrow(/Cycle detected/);
    });

    it('handles groups', () => {
        const nodes: ResolvableNode[] = [
            {
                id: 'n1',
                groupId: 'g1',
                x: Pos.align('center', 'g1'),
                width: 20,
                contentWidth: 0, contentHeight: 0, computed: { x:0, y:0, width:0, height:0 }
            },
            {
                id: 'n2',
                groupId: 'g1',
                x: Pos.align('center', 'g1'),
                width: 40,
                contentWidth: 0, contentHeight: 0, computed: { x:0, y:0, width:0, height:0 }
            }
        ];

        // Group size is max(20, 40) = 40
        // Parent = 100
        // Group offset = (100 - 40) / 2 = 30
        // n1 local offset = (40 - 20) / 2 = 10 -> X = 40
        // n2 local offset = (40 - 40) / 2 = 0 -> X = 30

        resolveLayoutVariables(nodes, 100, 50);

        expect(nodes[0].computed.width).toBe(20);
        expect(nodes[0].computed.x).toBe(40);
        
        expect(nodes[1].computed.width).toBe(40);
        expect(nodes[1].computed.x).toBe(30);
    });
});
