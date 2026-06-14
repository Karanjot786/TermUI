// HMR cleanups
export const cleanupActiveInstances = (instances: Array<{ unmount?: () => void }>) => {
    instances.forEach((instance) => {
        if (typeof instance.unmount === 'function') {
            try {
                instance.unmount();
            } catch {
                // Safe cleanup without throwing/logging errors
            }
        }
    });
};
