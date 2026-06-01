let count = 0;
const interval = setInterval(() => {
    count++;
    console.log(`[Worker] Emitted counter event: ${count}`);
    if (count >= 20) {
        console.log(`[Worker] Reached target count of 20. Shutting down.`);
        clearInterval(interval);
        process.exit(0);
    }
}, 500);

process.on('SIGTERM', () => {
    console.log('[Worker] Received SIGTERM, exiting');
    process.exit(0);
});
