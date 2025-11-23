/**
 * ============================================================================
 * REDIS BRIDGE - Core Service that Bridges Redis Pub/Sub to Output Services
 * ============================================================================
 * 
 * DESIGN PATTERNS USED:
 * 1. Dependency Injection - Output service is injected (not created here)
 * 2. Observer Pattern - Listens to Redis messages and events
 * 3. Retry Pattern - Implements exponential backoff for reconnection
 * 4. Circuit Breaker (Simplified) - Stops retrying after max attempts
 * 
 * PURPOSE:
 * This is the HEART of the application. It:
 * 1. Connects to Redis
 * 2. Subscribes to a channel
 * 3. Receives messages
 * 4. Forwards them to the output service
 * 5. Handles errors and reconnections
 * 
 * STEP-BY-STEP EXECUTION FLOW:
 * 
 * STARTUP:
 * 1. Constructor receives Redis config and output service
 * 2. start() method is called
 * 3. Creates Redis subscriber client
 * 4. Registers event handlers (connect, error, message, etc.)
 * 5. Connects to Redis
 * 6. Subscribes to configured channel
 * 7. Starts listening for messages
 * 
 * MESSAGE FLOW:
 * 1. Redis publishes message to channel
 * 2. 'message' event fires
 * 3. _handleMessage() is called
 * 4. Message is parsed (JSON)
 * 5. Message is enriched with metadata
 * 6. Message is sent to output service
 * 7. Success/failure is logged
 * 
 * ERROR HANDLING:
 * 1. Redis connection error occurs
 * 2. Error event fires
 * 3. _handleRedisError() is called
 * 4. Error is logged
 * 5. Reconnection is attempted (with exponential backoff)
 * 6. After max retries, process exits
 * 
 * SHUTDOWN:
 * 1. SIGINT/SIGTERM signal received
 * 2. stop() method is called
 * 3. Output service is closed (flushes pending messages)
 * 4. Redis subscriber is disconnected
 * 5. Process exits gracefully
 * 
 * ============================================================================
 */

const Redis = require('ioredis');
const logger = require('../utils/Logger');
const { 
    REDIS_DEFAULTS, 
    RETRY_SETTINGS,
    ERROR_MESSAGES,
    SHUTDOWN_SETTINGS 
} = require('../utils/constants');

/**
 * REDIS BRIDGE CLASS
 * 
 * Manages the Redis connection and message forwarding
 */
class RedisBridge {
    /**
     * CONSTRUCTOR - Initialize the bridge
     * 
     * PATTERN: Dependency Injection
     * - Output service is passed in (not created here)
     * - Makes testing easier
     * - Follows Dependency Inversion Principle
     * 
     * @param {Object} redisConfig - Redis connection configuration
     * @param {OutputStrategy} outputService - Injected output service
     */
    constructor(redisConfig, outputService) {
        // Store configuration
        this.redisConfig = redisConfig;
        this.outputService = outputService;
        
        // Redis client (created in start())
        this.subscriber = null;
        
        // State tracking
        this.isRunning = false;
        this.isSubscribed = false;
        
        // Retry tracking
        this.reconnectAttempts = 0;
        this.reconnectTimer = null;
        
        // Statistics
        this.messagesReceived = 0;
        this.messagesForwarded = 0;
        this.messagesFailed = 0;
        
        logger.debug('[RedisBridge] Instance created');
    }
    
    // ========================================================================
    // PRIVATE HELPER METHODS
    // ========================================================================
    
    /**
     * PARSE MESSAGE
     * 
     * STEP 1: Try to parse as JSON
     * STEP 2: If successful, return parsed object
     * STEP 3: If failed, wrap raw message with error flag
     * 
     * This ensures we never lose messages even if they're not valid JSON
     * 
     * @param {string} message - Raw message from Redis
     * @returns {Object} - Parsed message or error wrapper
     * @private
     */
    _parseMessage(message) {
        try {
            return JSON.parse(message);
        } catch (e) {
            // Invalid JSON - wrap it so we don't lose the data
            logger.warn('[RedisBridge] Received non-JSON message, wrapping it');
            return { 
                raw_message: message, 
                parse_error: true,
                error_details: e.message 
            };
        }
    }
    
    /**
     * HANDLE INCOMING MESSAGE
     * 
     * PATTERN: Observer Pattern Callback
     * This method is called whenever a message arrives
     * 
     * STEP 1: Log message arrival
     * STEP 2: Parse the message
     * STEP 3: Enrich with metadata (channel, timestamp)
     * STEP 4: Forward to output service
     * STEP 5: Update statistics
     * STEP 6: Handle any errors
     * 
     * IMPORTANT: This is an arrow function to preserve 'this' context
     * 
     * @param {string} channel - Redis channel name
     * @param {string} message - Raw message content
     * @private
     */
    _handleMessage = async (channel, message) => {
        // Track that we received a message
        this.messagesReceived++;
        
        logger.info(`[RedisBridge] 📨 Message #${this.messagesReceived} received on channel [${channel}]`);
        logger.debug(`[RedisBridge] Message #${this.messagesReceived} received on [${channel}]`);
        logger.trace(`[RedisBridge] Message content:`, message);
        
        try {
            // STEP 2: Parse the message
            const parsedData = this._parseMessage(message);
            logger.info(`[RedisBridge] ✓ Message parsed successfully`);
            
            // STEP 3: Enrich with metadata
            const eventData = {
                channel: channel,
                receivedAt: new Date().toISOString(),
                messageNumber: this.messagesReceived,
                data: parsedData
            };
            
            // STEP 4: Forward to output service
            logger.info(`[RedisBridge] 📤 Forwarding message to output service...`);
            const success = await this.outputService.sendEvent(eventData);
            
            // STEP 5: Update statistics
            if (success) {
                this.messagesForwarded++;
                logger.info(`[RedisBridge] ✅ Message #${this.messagesReceived} forwarded successfully (Total: ${this.messagesForwarded}/${this.messagesReceived})`);
                logger.debug(`[RedisBridge] Message forwarded successfully (${this.messagesForwarded}/${this.messagesReceived})`);
            } else {
                this.messagesFailed++;
                logger.warn(`[RedisBridge] ❌ Failed to forward message #${this.messagesReceived} (failures: ${this.messagesFailed})`);
            }
            
        } catch (error) {
            // STEP 6: Handle errors gracefully
            this.messagesFailed++;
            logger.error(`[RedisBridge] Error handling message:`, error.message);
            
            // In production, you might want to:
            // - Send to dead-letter queue
            // - Trigger alerts
            // - Retry with exponential backoff
        }
    }
    
    /**
     * HANDLE REDIS ERRORS
     * 
     * PATTERN: Error Handler + Observer
     * 
     * STEP 1: Log the error
     * STEP 2: Classify error severity
     * STEP 3: Decide on action (retry, exit, ignore)
     * 
     * NOTE: Some errors are benign (e.g., during reconnection)
     * 
     * @param {Error} error - Redis error object
     * @private
     */
    _handleRedisError = (error) => {
        logger.error('[RedisBridge] Redis error occurred:', error.message);
        
        // Some errors are expected during reconnection
        // Don't spam the logs or take drastic action
        
        // In production, you might want to:
        // - Check error type
        // - Implement circuit breaker
        // - Send alerts for critical errors
    }
    
    /**
     * HANDLE SUCCESSFUL CONNECTION
     * 
     * PATTERN: Observer Pattern Callback
     * 
     * Called when Redis client successfully connects
     * 
     * STEP 1: Log connection success
     * STEP 2: Reset retry counter
     * STEP 3: Attempt to subscribe to channel
     * 
     * @private
     */
    _handleConnect = () => {
        const { host, port, channel } = this.redisConfig;
        
        logger.info(`[RedisBridge] Connected to Redis at ${host}:${port}`);
        
        // Reset retry counter on successful connection
        this.reconnectAttempts = 0;
        
        // Subscribe to the channel
        logger.info(`[RedisBridge] Attempting to subscribe to channel: ${channel}`);
        
        this.subscriber.subscribe(channel, (err) => {
            if (err) {
                logger.error(`[RedisBridge] Fatal error subscribing to channel:`, err);
                process.exit(1);
            }
            
            this.isSubscribed = true;
            logger.info(`[RedisBridge] ✓ Successfully subscribed to channel: ${channel}`);
            logger.info(`[RedisBridge] 👂 Now listening for messages on channel [${channel}]...`);
            logger.info(`[RedisBridge] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        });
    }
    
    /**
     * HANDLE DISCONNECTION
     * 
     * PATTERN: Observer Pattern Callback
     * 
     * Called when connection to Redis is lost
     * 
     * STEP 1: Log disconnection
     * STEP 2: Update state
     * STEP 3: ioredis will auto-reconnect based on config
     * 
     * @private
     */
    _handleClose = () => {
        logger.warn('[RedisBridge] Redis connection closed');
        this.isSubscribed = false;
    }
    
    /**
     * HANDLE RECONNECTION ATTEMPT
     * 
     * PATTERN: Retry with Exponential Backoff
     * 
     * Called when ioredis tries to reconnect
     * 
     * STEP 1: Increment attempt counter
     * STEP 2: Check if max attempts exceeded
     * STEP 3: Calculate delay (exponential backoff)
     * STEP 4: Return delay or error
     * 
     * @param {number} times - Number of reconnection attempts
     * @returns {number|Error} - Delay in ms or Error to stop
     * @private
     */
    _handleReconnect = (times) => {
        this.reconnectAttempts = times;
        
        // Check if we've exceeded max attempts
        if (times > RETRY_SETTINGS.MAX_ATTEMPTS) {
            logger.error(`[RedisBridge] Max reconnection attempts (${RETRY_SETTINGS.MAX_ATTEMPTS}) exceeded`);
            return new Error(ERROR_MESSAGES.REDIS_CONNECTION_FAILED);
        }
        
        // Calculate delay with exponential backoff
        // Formula: initialDelay * (multiplier ^ attempts)
        const delay = Math.min(
            RETRY_SETTINGS.INITIAL_DELAY_MS * Math.pow(RETRY_SETTINGS.BACKOFF_MULTIPLIER, times - 1),
            RETRY_SETTINGS.MAX_DELAY_MS
        );
        
        // Add jitter (randomness) to prevent thundering herd
        const jitter = RETRY_SETTINGS.JITTER 
            ? Math.random() * 1000 
            : 0;
        
        const totalDelay = Math.floor(delay + jitter);
        
        logger.warn(`[RedisBridge] Reconnection attempt ${times}/${RETRY_SETTINGS.MAX_ATTEMPTS} in ${totalDelay}ms`);
        
        return totalDelay;
    }
    
    // ========================================================================
    // PUBLIC SERVICE METHODS
    // ========================================================================
    
    /**
     * START THE BRIDGE
     * 
     * MAIN ENTRY POINT
     * 
     * STEP 1: Initialize output service
     * STEP 2: Create Redis subscriber client
     * STEP 3: Configure connection options
     * STEP 4: Register event handlers
     * STEP 5: Connect to Redis (triggers subscription)
     * 
     * @returns {Promise<void>}
     */
    async start() {
        logger.info('[RedisBridge] Starting Redis Bridge...');
        
        // STEP 1: Initialize the output service
        logger.info('[RedisBridge] Initializing output service...');
        await this.outputService.initialize();
        logger.info('[RedisBridge] Output service ready');
        
        // STEP 2 & 3: Create Redis client with configuration
        const { host, port, password, username, useTLS, connectTimeout } = this.redisConfig;
        
        logger.info(`[RedisBridge] Creating Redis subscriber for ${host}:${port}`);
        
        this.subscriber = new Redis({
            host,
            port,
            password,
            username,
            
            // TLS configuration
            ...(useTLS && { tls: {} }),
            
            // Timeout settings
            connectTimeout,
            
            // Pub/Sub specific settings
            maxRetriesPerRequest: REDIS_DEFAULTS.MAX_RETRIES_PER_REQUEST,
            enableOfflineQueue: REDIS_DEFAULTS.ENABLE_OFFLINE_QUEUE,
            enableReadyCheck: REDIS_DEFAULTS.ENABLE_READY_CHECK,
            
            // Reconnection strategy
            retryStrategy: this._handleReconnect,
        });
        
        // STEP 4: Register event handlers (Observer pattern)
        this.subscriber.on('connect', this._handleConnect);
        this.subscriber.on('error', this._handleRedisError);
        this.subscriber.on('close', this._handleClose);
        this.subscriber.on('message', this._handleMessage);
        
        // Additional lifecycle events for better visibility
        this.subscriber.on('ready', () => {
            logger.info('[RedisBridge] Redis client is ready');
        });
        
        this.subscriber.on('reconnecting', () => {
            logger.info('[RedisBridge] Attempting to reconnect to Redis...');
        });
        
        this.isRunning = true;
        logger.info('[RedisBridge] Bridge is running');
        
        // STEP 5: Connection happens automatically
        // The 'connect' event will fire and trigger subscription
    }
    
    /**
     * STOP THE BRIDGE
     * 
     * GRACEFUL SHUTDOWN
     * 
     * STEP 1: Log shutdown initiation
     * STEP 2: Set flag to prevent new operations
     * STEP 3: Close output service (flushes pending messages)
     * STEP 4: Disconnect from Redis
     * STEP 5: Log final statistics
     * STEP 6: Wait briefly for cleanup
     * 
     * @returns {Promise<void>}
     */
    async stop() {
        logger.info('\n[RedisBridge] ===== GRACEFUL SHUTDOWN INITIATED =====');
        
        // STEP 1: Prevent new operations
        this.isRunning = false;
        
        // STEP 2: Close output service
        logger.info('[RedisBridge] Closing output service...');
        try {
            await this.outputService.close();
            logger.info('[RedisBridge] Output service closed');
        } catch (error) {
            logger.error('[RedisBridge] Error closing output service:', error.message);
        }
        
        // STEP 3: Disconnect from Redis
        if (this.subscriber) {
            logger.info('[RedisBridge] Disconnecting from Redis...');
            this.subscriber.disconnect();
            this.subscriber = null;
            logger.info('[RedisBridge] Redis disconnected');
        }
        
        // STEP 4: Log final statistics
        const stats = this.getStats();
        logger.info('[RedisBridge] Final Statistics:', stats);
        
        logger.info('[RedisBridge] ===== SHUTDOWN COMPLETE =====\n');
        
        // STEP 5: Small delay to ensure logs are flushed
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    /**
     * GET STATISTICS
     * 
     * Returns operational metrics for monitoring
     * 
     * @returns {Object} - Statistics object
     */
    getStats() {
        return {
            isRunning: this.isRunning,
            isSubscribed: this.isSubscribed,
            reconnectAttempts: this.reconnectAttempts,
            messagesReceived: this.messagesReceived,
            messagesForwarded: this.messagesForwarded,
            messagesFailed: this.messagesFailed,
            successRate: this.messagesReceived > 0
                ? ((this.messagesForwarded / this.messagesReceived) * 100).toFixed(2) + '%'
                : 'N/A',
            outputServiceStats: this.outputService ? this.outputService.getStats() : null,
        };
    }
}

/**
 * ============================================================================
 * USAGE EXAMPLE:
 * ============================================================================
 * 
 * const config = require('./config');
 * const ServiceFactory = require('./services/ServiceFactory');
 * const RedisBridge = require('./services/RedisBridge');
 * 
 * // Create output service (using factory)
 * const outputService = ServiceFactory.createOutputService(config);
 * 
 * // Create bridge (dependency injection)
 * const bridge = new RedisBridge(config.redis, outputService);
 * 
 * // Setup graceful shutdown
 * process.on('SIGINT', () => bridge.stop());
 * process.on('SIGTERM', () => bridge.stop());
 * 
 * // Start the bridge
 * await bridge.start();
 * 
 * ============================================================================
 */

module.exports = RedisBridge;