/**
 * ============================================================================
 * CONFIG.JS - Enhanced Configuration Manager
 * ============================================================================
 * 
 * DESIGN PATTERN: Builder Pattern + Validation Pattern
 * 
 * PURPOSE:
 * This module centralizes all application configuration with:
 * 1. Environment variable loading (.env file)
 * 2. Default value fallbacks
 * 3. Type conversion and validation
 * 4. Comprehensive error messages
 * 
 * STEP-BY-STEP FLOW:
 * STEP 1: Load .env file variables into process.env
 * STEP 2: Extract and parse each configuration value
 * STEP 3: Apply defaults where values are missing
 * STEP 4: Validate required fields
 * STEP 5: Validate value ranges and formats
 * STEP 6: Return validated configuration object
 */

require('dotenv').config();

const { 
    OUTPUT_TYPES, 
    REDIS_DEFAULTS, 
    RETRY_SETTINGS,
    BATCH_SETTINGS,
    FILE_OUTPUT,
    LOG_LEVELS,
    ERROR_MESSAGES 
} = require('./utils/constants');

/**
 * ============================================================================
 * CONFIGURATION VALIDATOR CLASS
 * ============================================================================
 * 
 * PATTERN: Validator Pattern
 * Separates validation logic from configuration building
 */
class ConfigValidator {
    /**
     * VALIDATE REQUIRED FIELD
     * 
     * Ensures a field exists and is not null/undefined/empty
     */
    static validateRequired(fieldName, value, context = '') {
        if (value === null || value === undefined || value === '') {
            const msg = `${ERROR_MESSAGES.CONFIG_MISSING_REQUIRED}: ${fieldName}${context ? ' in ' + context : ''}`;
            throw new Error(msg);
        }
    }
    
    /**
     * VALIDATE PORT NUMBER
     * 
     * STEP 1: Ensure it's a number
     * STEP 2: Check range (1-65535)
     */
    static validatePort(port) {
        const portNum = parseInt(port, 10);
        if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
            throw new Error(`Invalid port number: ${port}. Must be between 1 and 65535.`);
        }
        return portNum;
    }
    
    /**
     * VALIDATE OUTPUT TYPE
     * 
     * Ensures the output type is one of the supported values
     */
    static validateOutputType(type) {
        const validTypes = Object.values(OUTPUT_TYPES);
        if (!validTypes.includes(type)) {
            throw new Error(
                `${ERROR_MESSAGES.INVALID_OUTPUT_TYPE}: "${type}". ` +
                `Valid types: ${validTypes.join(', ')}`
            );
        }
        return type;
    }
    
    /**
     * VALIDATE LOG LEVEL
     * 
     * Converts string log level to numeric value
     */
    static validateLogLevel(level) {
        if (typeof level === 'number') {
            return level;
        }
        
        const upperLevel = level.toUpperCase();
        if (!LOG_LEVELS.hasOwnProperty(upperLevel)) {
            throw new Error(
                `Invalid log level: "${level}". ` +
                `Valid levels: ${Object.keys(LOG_LEVELS).join(', ')}`
            );
        }
        
        return LOG_LEVELS[upperLevel];
    }
}

/**
 * ============================================================================
 * CONFIGURATION BUILDER
 * ============================================================================
 * 
 * PATTERN: Builder Pattern
 * Constructs complex configuration object step by step
 */
class ConfigBuilder {
    /**
     * BUILD REDIS CONFIGURATION
     * 
     * STEP 1: Read environment variables
     * STEP 2: Apply defaults for missing values
     * STEP 3: Validate port number
     * STEP 4: Parse boolean flags
     * STEP 5: Return redis config object
     */
    static buildRedisConfig() {
        const host = process.env.REDIS_HOST || REDIS_DEFAULTS.HOST;
        const port = ConfigValidator.validatePort(
            process.env.REDIS_PORT || REDIS_DEFAULTS.PORT
        );
        const channel = process.env.REDIS_CHANNEL || REDIS_DEFAULTS.CHANNEL;
        
        // Optional authentication
        const password = process.env.REDIS_PASSWORD || null;
        const username = process.env.REDIS_USERNAME || null;
        
        // TLS support
        const useTLS = process.env.REDIS_USE_TLS === 'true';
        
        // Timeouts and retry settings
        const connectTimeout = parseInt(
            process.env.REDIS_CONNECT_TIMEOUT || REDIS_DEFAULTS.CONNECT_TIMEOUT, 
            10
        );
        
        return {
            host,
            port,
            channel,
            password,
            username,
            useTLS,
            connectTimeout,
            maxRetriesPerRequest: REDIS_DEFAULTS.MAX_RETRIES_PER_REQUEST,
            enableOfflineQueue: REDIS_DEFAULTS.ENABLE_OFFLINE_QUEUE,
            enableReadyCheck: REDIS_DEFAULTS.ENABLE_READY_CHECK,
        };
    }
    
    /**
     * BUILD OUTPUT CONFIGURATION
     * 
     * STEP 1: Determine output type (mock, azure, etc.)
     * STEP 2: Validate output type
     * STEP 3: Load type-specific configuration
     * STEP 4: Validate required fields for that type
     * STEP 5: Return output config object
     */
    static buildOutputConfig() {
        const type = ConfigValidator.validateOutputType(
            process.env.OUTPUT_TYPE || OUTPUT_TYPES.MOCK
        );
        
        const config = { type };
        
        // TYPE-SPECIFIC CONFIGURATION
        if (type === OUTPUT_TYPES.MOCK) {
            // Mock mode: writes to local file
            config.mockFile = process.env.MOCK_OUTPUT_FILE || FILE_OUTPUT.DEFAULT_PATH;
        } 
        else if (type === OUTPUT_TYPES.AZURE) {
            // Azure Event Hubs: requires connection string and hub name
            const connectionString = process.env.EVENT_HUB_CONNECTION_STRING;
            const hubName = process.env.EVENT_HUB_NAME;
            
            ConfigValidator.validateRequired('EVENT_HUB_CONNECTION_STRING', connectionString, 'Azure mode');
            ConfigValidator.validateRequired('EVENT_HUB_NAME', hubName, 'Azure mode');
            
            config.azureConnectionString = connectionString;
            config.azureHubName = hubName;
        }
        // Add more output types here (Kafka, etc.)
        
        return config;
    }
    
    /**
     * BUILD RETRY CONFIGURATION
     * 
     * STEP 1: Read retry settings from environment
     * STEP 2: Apply defaults
     * STEP 3: Parse numeric values
     * STEP 4: Return retry config
     */
    static buildRetryConfig() {
        return {
            maxAttempts: parseInt(
                process.env.RETRY_MAX_ATTEMPTS || RETRY_SETTINGS.MAX_ATTEMPTS, 
                10
            ),
            initialDelayMs: parseInt(
                process.env.RETRY_INITIAL_DELAY_MS || RETRY_SETTINGS.INITIAL_DELAY_MS, 
                10
            ),
            maxDelayMs: parseInt(
                process.env.RETRY_MAX_DELAY_MS || RETRY_SETTINGS.MAX_DELAY_MS, 
                10
            ),
            backoffMultiplier: parseFloat(
                process.env.RETRY_BACKOFF_MULTIPLIER || RETRY_SETTINGS.BACKOFF_MULTIPLIER
            ),
            jitter: process.env.RETRY_JITTER !== 'false', // Default true
        };
    }
    
    /**
     * BUILD BATCH CONFIGURATION
     * 
     * Controls message batching for efficient output
     */
    static buildBatchConfig() {
        return {
            enabled: process.env.BATCH_ENABLED !== 'false', // Default true
            maxSize: parseInt(
                process.env.BATCH_MAX_SIZE || BATCH_SETTINGS.MAX_BATCH_SIZE, 
                10
            ),
            timeoutMs: parseInt(
                process.env.BATCH_TIMEOUT_MS || BATCH_SETTINGS.BATCH_TIMEOUT_MS, 
                10
            ),
        };
    }
    
    /**
     * BUILD LOGGING CONFIGURATION
     * 
     * Controls log verbosity and format
     */
    static buildLoggingConfig() {
        const levelStr = process.env.LOG_LEVEL || 'INFO';
        
        return {
            level: ConfigValidator.validateLogLevel(levelStr),
            includeTimestamp: process.env.LOG_INCLUDE_TIMESTAMP !== 'false',
            sanitizeLogs: process.env.LOG_SANITIZE !== 'false', // Default true
        };
    }
}

/**
 * ============================================================================
 * BUILD AND EXPORT FINAL CONFIGURATION
 * ============================================================================
 * 
 * EXECUTION FLOW:
 * 1. This code runs when config.js is first imported
 * 2. All builders are called to construct configuration sections
 * 3. Any validation errors throw exceptions and stop the app
 * 4. Valid configuration is frozen (immutable) and exported
 * 5. Other modules import this to access configuration
 */
const config = Object.freeze({
    // Redis connection settings
    redis: ConfigBuilder.buildRedisConfig(),
    
    // Output destination settings
    output: ConfigBuilder.buildOutputConfig(),
    
    // Retry/reconnection behavior
    retry: ConfigBuilder.buildRetryConfig(),
    
    // Message batching
    batch: ConfigBuilder.buildBatchConfig(),
    
    // Logging configuration
    logging: ConfigBuilder.buildLoggingConfig(),
    
    // Application metadata
    app: {
        name: 'Redis-to-EventHub Bridge',
        version: '2.0.0',
        environment: process.env.NODE_ENV || 'development',
    },
});

/**
 * ============================================================================
 * USAGE EXAMPLE:
 * ============================================================================
 * 
 * In other files:
 * const config = require('./config');
 * 
 * console.log(config.redis.host);           // '127.0.0.1'
 * console.log(config.output.type);          // 'mock'
 * console.log(config.retry.maxAttempts);    // 10
 * console.log(config.batch.enabled);        // true
 */

module.exports = config;