// HMR cleanups
export const cleanupActiveInstances = (instances: Array<{ unmount?: () => void }>) => {
    instances.forEach((instance, index) => {
        if (typeof instance.unmount === 'function') {
            try {
                instance.unmount();
            } catch (error) {
                console.error(`Failed to unmount instance at index ${index}:`, error);
            }
        }
    });
};
