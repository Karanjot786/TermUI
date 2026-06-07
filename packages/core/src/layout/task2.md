# Constraint-Based Layout Implementation Phase 2

- `[x]` Develop `pos.ts` with center(), anchorEnd(), align()
- `[x]` Develop `dim.ts` with auto(), fill(), func()
- `[x]` Develop `constraint.ts` and Flex enum
- `[x]` topological layout solver in core
- `[x]` Add unit tests for Pos/Dim/Constraints

### Phase 2: JSX and Engine Integration
- `[x]` Update `Style` in `packages/core/src/style/Style.ts` to support `Pos` and `Dim`.
- `[x]` Update `IntrinsicProps` in `packages/jsx/src/vnode.ts`.
- `[x]` Modify `LayoutEngine.ts` to detect and run `resolveLayoutVariables` before flexbox.
- `[x]` Update `reconciler.ts` to parse `x`, `y`, `width`, `height`, and `constraints`.
- `[x]` Update or verify `Row` implementation in `@termuijs/widgets` to support `constraints`.
- `[x]` Test end-to-end usage.
