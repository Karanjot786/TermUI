// Spring scroll helper
export interface ScrollSpringState {
    position: number;
    velocity: number;
}

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
