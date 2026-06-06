// ─────────────────────────────────────────────────────
// E2E Test for Constraint-Based Layout
// ─────────────────────────────────────────────────────

import { render, h } from '@termuijs/jsx';
import { Pos, Dim, Constraint, Flex } from '@termuijs/core';

export function runLayoutTest() {
    return render(
        <box width="100%" height="100%" border="single" title="Layout Test">
            {/* Absolute positioning with Pos and Dim */}
            <box 
                x={Pos.center()} 
                y={Pos.center()} 
                width={Dim.fill(10)} 
                height={5} 
                border="round" 
                borderColor="cyan"
            >
                <text color="yellow">Centered Box (Topological Sort)</text>
            </box>

            {/* 1D Constraints mapped to a row */}
            <row 
                y={Pos.anchorEnd(1)} 
                width="100%" 
                height={5} 
                constraints={[
                    Constraint.Length(20),
                    Constraint.Percentage(30),
                    Constraint.Fill(1)
                ]}
                gap={1}
            >
                <box border="single" borderColor="red"><text>Sidebar (20)</text></box>
                <box border="single" borderColor="green"><text>Main (30%)</text></box>
                <box border="single" borderColor="blue"><text>Panel (Fill)</text></box>
            </row>
        </box>
    );
}

const unmount = runLayoutTest();
setTimeout(() => unmount(), 3000);
