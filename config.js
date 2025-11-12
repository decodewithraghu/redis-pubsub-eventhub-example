require('dotenv').config();

const config = {
    redis: {
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: parseInt(process.env.REDIS_PORT, 10) || 6379,
        channel: process.env.REDIS_CHANNEL || 'data-stream-channel',
    },
    output: {
        type: process.env.OUTPUT_TYPE || 'mock',
        mockFile: process.env.MOCK_OUTPUT_FILE || './mock_eventhub_output.jsonl',
        azureConnectionString: process.env.EVENT_HUB_CONNECTION_STRING,
        azureName: process.env.EVENT_HUB_NAME,
    }
};

if (config.output.type === 'mock' && !config.output.mockFile) {
    throw new Error("Configuration Error: MOCK_OUTPUT_FILE must be set for mock mode.");
}

module.exports = config;