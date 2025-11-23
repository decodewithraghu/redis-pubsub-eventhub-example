/**
 * ============================================================================
 * CONSTANTS.JS - Application-wide Constants and Enumerations
 * ============================================================================
 * 
 * PURPOSE:
 * This file centralizes all magic numbers, strings, and configuration defaults
 * used throughout the application. This follows the DRY (Don't Repeat Yourself)
 * principle and makes the codebase more maintainable.
 * 
 * PATTERN: Constants Module Pattern
 * - Provides a single source of truth for configuration values
 * - Makes it easy to modify behavior without searching through code
 * - Improves testability by having consistent values
 */

// ============================================================================
// OUTPUT SERVICE TYPES - Defines supported output destinations
// ============================================================================
const OUTPUT_TYPES = Object.freeze({
    MOCK: 'mock',           // File-based mock for testing
    AZURE: 'azure',         // Azure Event Hubs
    KAFKA: 'kafka',         // Future: Kafka support
    // Add more output types as needed
});

// ============================================================================
// REDIS CONNECTION SETTINGS - Default values for Redis configuration
// ============================================================================
const REDIS_DEFAULTS = Object.freeze({
    HOST: '127.0.0.1',
    PORT: 6379,
    CHANNEL: 'data-stream-channel',
    MAX_RETRIES_PER_REQUEST: null,      // null = unlimited (for pub/sub)
    ENABLE_OFFLINE_QUEUE: false,        // Don't queue commands when disconnected
    ENABLE_READY_CHECK: false,          // Critical for pub/sub mode
    CONNECT_TIMEOUT: 10000,             // 10 seconds
    RECONNECT_ON_ERROR: true,
});

// ============================================================================
// RETRY STRATEGY SETTINGS - Exponential backoff configuration
// ============================================================================
const RETRY_SETTINGS = Object.freeze({
    MAX_ATTEMPTS: 10,                   // Maximum retry attempts
    INITIAL_DELAY_MS: 1000,             // Start with 1 second
    MAX_DELAY_MS: 30000,                // Cap at 30 seconds
    BACKOFF_MULTIPLIER: 2,              // Double the delay each time
    JITTER: true,                       // Add randomness to prevent thundering herd
});

// ============================================================================
// BATCHING SETTINGS - For efficient message processing
// ============================================================================
const BATCH_SETTINGS = Object.freeze({
    MAX_BATCH_SIZE: 100,                // Maximum messages per batch
    BATCH_TIMEOUT_MS: 5000,             // Send batch after 5 seconds even if not full
    ENABLE_BATCHING: true,              // Feature flag
});

// ============================================================================
// LOGGING SETTINGS - Log levels and output configuration
// ============================================================================
const LOG_LEVELS = Object.freeze({
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3,
    TRACE: 4,
});

const LOG_SETTINGS = Object.freeze({
    DEFAULT_LEVEL: LOG_LEVELS.INFO,
    INCLUDE_TIMESTAMP: true,
    INCLUDE_LEVEL: true,
    COLORIZE: true,
});

// ============================================================================
// SHUTDOWN SETTINGS - Graceful shutdown behavior
// ============================================================================
const SHUTDOWN_SETTINGS = Object.freeze({
    GRACE_PERIOD_MS: 30000,             // Wait up to 30 seconds for cleanup
    FORCE_EXIT_CODE: 1,
    NORMAL_EXIT_CODE: 0,
});

// ============================================================================
// HEALTH CHECK SETTINGS - Service health monitoring
// ============================================================================
const HEALTH_CHECK = Object.freeze({
    INTERVAL_MS: 30000,                 // Check every 30 seconds
    TIMEOUT_MS: 5000,                   // Health check timeout
    ENABLE: false,                      // Disabled by default
});

// ============================================================================
// MESSAGE VALIDATION - Limits for incoming messages
// ============================================================================
const MESSAGE_LIMITS = Object.freeze({
    MAX_MESSAGE_SIZE_BYTES: 1048576,    // 1 MB limit
    MAX_MESSAGE_SIZE_KB: 1024,
    VALIDATE_JSON: true,
    SANITIZE_LOGS: true,                // Hide sensitive data in logs
});

// ============================================================================
// FILE OUTPUT SETTINGS - For mock mode
// ============================================================================
const FILE_OUTPUT = Object.freeze({
    DEFAULT_PATH: './output_events.jsonl',
    ENCODING: 'utf8',
    APPEND_MODE: 'a',
});

// ============================================================================
// ERROR MESSAGES - Standardized error messages
// ============================================================================
const ERROR_MESSAGES = Object.freeze({
    CONFIG_MISSING_REQUIRED: 'Configuration Error: Missing required field',
    REDIS_CONNECTION_FAILED: 'Failed to connect to Redis',
    REDIS_SUBSCRIPTION_FAILED: 'Failed to subscribe to Redis channel',
    OUTPUT_SERVICE_FAILED: 'Output service failed to send event',
    INVALID_OUTPUT_TYPE: 'Invalid output service type specified',
    SHUTDOWN_TIMEOUT: 'Graceful shutdown timeout exceeded',
    MESSAGE_TOO_LARGE: 'Message exceeds maximum size limit',
});3

// ============================================================================
// EXPORTS - Make all constants available to other modules
// ============================================================================
module.exports = {
    OUTPUT_TYPES,
    REDIS_DEFAULTS,
    RETRY_SETTINGS,
    BATCH_SETTINGS,
    LOG_LEVELS,
    LOG_SETTINGS,
    SHUTDOWN_SETTINGS,
    HEALTH_CHECK,
    MESSAGE_LIMITS,
    FILE_OUTPUT,
    ERROR_MESSAGES,
};
