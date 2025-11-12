const config = require('./config');
const RedisBridge = require('./services/RedisBridge');
const EventHubMock = require('./services/EventhubMock');
// NOTE: If using Azure, you would require the real Azure class here.

/**
 * Main application function to initialize and run the bridge.
 */
async function main() {
    console.log(`--- Redis to Event Hub Bridge (Mock Mode) ---`);

    // 1. Initialize the Output Service (Dependency Injection)
    // We instantiate the specific class based on the chosen output type (MOCK)
    let outputService;
    if (config.output.type === 'mock') {
        outputService = new EventHubMock(config.output.mockFile);
    } else {
        // Here you would instantiate the real Azure Event Hubs client:
        // outputService = new AzureEventHubClient(config.output.azureConnectionString, config.output.azureName);
        throw new Error(`Unsupported output type: ${config.output.type}`);
    }

    // 2. Initialize the Bridge with the necessary services
    const bridge = new RedisBridge(config.redis, outputService);
    
    // 3. Setup graceful shutdown hooks
    process.on('SIGINT', () => { bridge.stop(); }); 
    process.on('SIGTERM', () => { bridge.stop(); });

    // 4. Start the main service
    await bridge.start();
}

main().catch(error => {
    console.error(`Application Failed: ${error.message}`);
    process.exit(1);
});