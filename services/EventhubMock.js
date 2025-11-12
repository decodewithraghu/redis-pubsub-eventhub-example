const fs = require('fs/promises');

/**
 * Mocks the Azure Event Hub Producer client by writing events to a local file.
 */
class EventHubMock {
    constructor(filePath) {
        this.filePath = filePath;
        console.log(`[MOCK] Initialized. Writing output to: ${this.filePath}`);
    }

    /**
     * Simulates sending a batch of events to the external service.
     * @param {object} eventData - The payload to send.
     */
    async sendEvent(eventData) {
        try {
            const mockOutput = {
                source: 'RedisBridge',
                timestamp: new Date().toISOString(),
                ...eventData 
            };
            
            const outputLine = JSON.stringify(mockOutput) + '\n';
            
            // Append the data to the local file
            await fs.appendFile(this.filePath, outputLine);
            
            console.log(`[MOCK SUCCESS] Event written to file.`);
            return true; // Success
        } catch (error) {
            console.error('[MOCK FATAL] Error writing to output file:', error.message);
            // In a real scenario, this is where retry or DLQ logic would go.
            return false; // Failure
        }
    }

    /**
     * Placeholder for cleanup/closing connections (required for the real Azure producer).
     */
    async close() {
        console.log('[MOCK] Closing mock output service. (No connection to close)');
        // No file handle needs closing with fs.promises.appendFile
    }
}

module.exports = EventHubMock;