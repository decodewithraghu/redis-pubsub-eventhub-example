/**
 * ============================================================================
 * LOGGER.JS - Structured Logging Utility
 * ============================================================================
 * 
 * DESIGN PATTERN: Singleton Pattern
 * - Ensures only one logger instance exists across the application
 * - Provides centralized logging configuration
 * - Maintains consistent log formatting
 * 
 * STEP-BY-STEP EXPLANATION:
 * 1. Logger is created once and reused throughout the app
 * 2. Supports multiple log levels (ERROR, WARN, INFO, DEBUG, TRACE)
 * 3. Filters messages based on configured log level
 * 4. Adds timestamps and consistent formatting
 * 5. Can be extended to write to files or external services
 */

const { LOG_LEVELS, LOG_SETTINGS } = require('./constants');

/**
 * SINGLETON LOGGER CLASS
 * 
 * HOW IT WORKS:
 * - Private constructor prevents direct instantiation
 * - getInstance() returns the same instance every time
 * - All parts of the app share the same logger configuration
 */
class Logger {
    // Private static instance (Singleton pattern implementation)
    static #instance = null;
    
    /**
     * PRIVATE CONSTRUCTOR
     * Called only once to create the singleton instance
     */
    constructor() {
        // Prevent direct instantiation
        if (Logger.#instance) {
            throw new Error('Use Logger.getInstance() instead of new Logger()');
        }
        
        this.level = LOG_SETTINGS.DEFAULT_LEVEL;
        this.includeTimestamp = LOG_SETTINGS.INCLUDE_TIMESTAMP;
        this.includeLevel = LOG_SETTINGS.INCLUDE_LEVEL;
        
        // Color codes for terminal output (ANSI escape codes)
        this.colors = {
            reset: '\x1b[0m',
            red: '\x1b[31m',
            yellow: '\x1b[33m',
            blue: '\x1b[34m',
            gray: '\x1b[90m',
            green: '\x1b[32m',
        };
    }
    
    /**
     * GET SINGLETON INSTANCE
     * 
     * STEP 1: Check if instance exists
     * STEP 2: If not, create it
     * STEP 3: Return the instance
     * 
     * This ensures all code uses the same logger with the same settings.
     */
    static getInstance() {
        if (!Logger.#instance) {
            Logger.#instance = new Logger();
        }
        return Logger.#instance;
    }
    
    /**
     * SET LOG LEVEL
     * 
     * Controls which messages are displayed:
     * - ERROR (0): Only errors
     * - WARN (1): Warnings and errors
     * - INFO (2): Info, warnings, and errors
     * - DEBUG (3): Debug messages and above
     * - TRACE (4): Everything
     */
    setLevel(level) {
        if (typeof level === 'string') {
            this.level = LOG_LEVELS[level.toUpperCase()] ?? LOG_SETTINGS.DEFAULT_LEVEL;
        } else {
            this.level = level;
        }
    }
    
    /**
     * FORMAT LOG MESSAGE
     * 
     * STEP 1: Add timestamp if enabled
     * STEP 2: Add log level prefix
     * STEP 3: Add the actual message
     * STEP 4: Apply color coding
     * 
     * Example output: "[2025-11-22T10:30:45.123Z] [INFO] Redis connected"
     */
    #formatMessage(level, message, color) {
        let formatted = '';
        
        // Add timestamp
        if (this.includeTimestamp) {
            formatted += `[${new Date().toISOString()}] `;
        }
        
        // Add level
        if (this.includeLevel) {
            formatted += `[${level}] `;
        }
        
        // Add message
        formatted += message;
        
        // Apply color if enabled
        if (LOG_SETTINGS.COLORIZE && color) {
            formatted = `${color}${formatted}${this.colors.reset}`;
        }
        
        return formatted;
    }
    
    /**
     * LOG METHOD - Generic logging function
     * 
     * STEP 1: Check if this level should be logged
     * STEP 2: Format the message
     * STEP 3: Output to console (or could send to external service)
     */
    #log(levelNum, levelName, color, message, ...args) {
        // Filter based on configured log level
        if (levelNum > this.level) {
            return; // Don't log if below threshold
        }
        
        const formatted = this.#formatMessage(levelName, message, color);
        console.log(formatted, ...args);
    }
    
    // ========================================================================
    // PUBLIC LOGGING METHODS - One for each log level
    // ========================================================================
    
    /**
     * ERROR - Critical failures that need immediate attention
     * Use for: Connection failures, data loss, crashes
     */
    error(message, ...args) {
        this.#log(LOG_LEVELS.ERROR, 'ERROR', this.colors.red, message, ...args);
    }
    
    /**
     * WARN - Important issues that don't stop execution
     * Use for: Retries, degraded performance, deprecated features
     */
    warn(message, ...args) {
        this.#log(LOG_LEVELS.WARN, 'WARN', this.colors.yellow, message, ...args);
    }
    
    /**
     * INFO - Normal operational messages
     * Use for: Startup, shutdown, major state changes
     */
    info(message, ...args) {
        this.#log(LOG_LEVELS.INFO, 'INFO', this.colors.blue, message, ...args);
    }
    
    /**
     * DEBUG - Detailed information for troubleshooting
     * Use for: Configuration values, function entry/exit
     */
    debug(message, ...args) {
        this.#log(LOG_LEVELS.DEBUG, 'DEBUG', this.colors.gray, message, ...args);
    }
    
    /**
     * TRACE - Very detailed information
     * Use for: Message content, loop iterations, detailed flow
     */
    trace(message, ...args) {
        this.#log(LOG_LEVELS.TRACE, 'TRACE', this.colors.gray, message, ...args);
    }
}

// ============================================================================
// EXPORT SINGLETON INSTANCE
// 
// USAGE IN OTHER FILES:
// const logger = require('./utils/Logger');
// logger.info('Application started');
// ============================================================================
module.exports = Logger.getInstance();
