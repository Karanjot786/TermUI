export interface KeyframeStep {
  value: number;
  duration: number;
}

export function keyframes(steps: KeyframeStep[]) {
  if (!steps || steps.length === 0) {
    return () => 0;
  }

  // Calculate the total duration of the animation timeline loop
  const totalDuration = steps.reduce((sum, step) => sum + step.duration, 0);

  return (elapsedTime: number) => {
    const t = elapsedTime % totalDuration;
    let accumulatedTime = 0;

    for (let i = 0; i < steps.length; i++) {
      const currentStep = steps[i];
      const nextStep = steps[(i + 1) % steps.length];
      
      if (t >= accumulatedTime && t <= accumulatedTime + currentStep.duration) {
        const stepProgress = (t - accumulatedTime) / currentStep.duration;
        return currentStep.value + stepProgress * (nextStep.value - currentStep.value);
      }
      accumulatedTime += currentStep.duration;
    }

    return steps[steps.length - 1].value;
  };
}
