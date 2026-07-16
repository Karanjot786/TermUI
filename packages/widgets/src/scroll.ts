/**
 * State of a spring-driven scroll animation.
 */
export interface ScrollSpringState {
    /** Current scroll offset. */
    position: number;
    /** Current scroll velocity. */
    velocity: number;
}

/**
 * Advance a scroll spring by `dt` seconds toward `target`.
 *
 * Uses a damped-spring model (stiffness 0.15, damping 0.8) so scrolling eases
 * into place instead of snapping. Pure and allocation-light.
 */
export const calculateSpringScroll = (
    current: ScrollSpringState,
    target: number,
    dt: number = 1/60
): ScrollSpringState => {
    const stiffness = 0.15;
    const damping = 0.8;
    
    const displacement = current.position - target;
    const springForce = -stiffness * displacement;
    const dampingForce = -damping * current.velocity;
    
    const newVelocity = current.velocity + (springForce + dampingForce) * dt;
    const newPosition = current.position + newVelocity * dt;
    
    return { position: newPosition, velocity: newVelocity };
};
