const Redis = require('ioredis');

/**
 * Connects to Redis, subscribes to a channel, and forwards messages 
 * to an injected output service.
 */
class RedisBridge {
    constructor(redisConfig, outputService) {
        this.redisConfig = redisConfig;
        this.outputService = outputService;
        this.subscriber = null;
    }

    // --- Private Helper Methods ---

    _parseMessage(message) {
        try {
            return JSON.parse(message);
        } catch (e) {
            return { raw_message: message, format_error: true };
        }
    }

    _handleMessage = async (channel, message) => {
        console.log(`[BRIDGE] Received message on [${channel}]`);
        
        const eventData = {
            channel: channel,
            data: this._parseMessage(message)
        };

        await this.outputService.sendEvent(eventData);
    }

    // --- Public Service Methods ---

    async start() {
        const { host, port, channel } = this.redisConfig;
        
        this.subscriber = new Redis({
            host: host,
            port: port,
            maxRetriesPerRequest: null,
            
            // FIX 1: Disable queuing of commands while offline
            enableOfflineQueue: false, 
            
            // FIX 2: CRITICAL for Pub/Sub. Prevents ioredis from running 
            // the INFO/READYCHECK command which fails in subscriber mode.
            enableReadyCheck: false 
        });

        // NOTE: We change the 'connect' listener to 'ready' or just rely on the subscription success
        // Since we disabled the ready check, we can rely on the subscription callback itself for success logging.
        
        this.subscriber.on('connect', () => {
            console.log(`[REDIS] Attempting to subscribe to Redis at ${host}:${port}`);
            
            this.subscriber.subscribe(channel, (err) => {
                if (err) {
                    console.error(`[REDIS] Fatal Error subscribing:`, err);
                    process.exit(1);
                }
                console.log(`[REDIS] Successfully subscribed and listening on channel: ${channel}`);
                this.subscriber.on('message', this._handleMessage);
            });
        });

        this.subscriber.on('error', (err) => {
            // Note: This error is often benign during normal reconnection cycles, 
            // but we log it for awareness.
            console.error(`[REDIS ERROR] Connection issue observed:`, err.message);
        });
    }

    async stop() {
        console.log('\n[SHUTDOWN] Starting graceful cleanup...');
        
        await this.outputService.close();
        
        if (this.subscriber) {
            this.subscriber.disconnect();
            console.log('[SHUTDOWN] Redis subscriber disconnected.');
        }
    }
}

module.exports = RedisBridge;