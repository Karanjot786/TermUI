export interface LayoutContext {
    parentWidth: number;
    parentHeight: number;
    contentWidth: number;
    contentHeight: number;
    
    // Node properties (will be evaluated lazily to enforce topological sort)
    readonly elementWidth: number;
    readonly elementHeight: number;
    readonly elementX: number;
    readonly elementY: number;
    
    axis: 'horizontal' | 'vertical';
    
    // Method to query group info
    getGroupSize(groupId: string): number;
}
