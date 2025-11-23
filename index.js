/**
 * ============================================================================
 * INDEX.JS - Application Entry Point
 * ============================================================================
 * 
 * ARCHITECTURE OVERVIEW:
 * This application follows a layered, pattern-based architecture:
 * 
 * 1. CONFIGURATION LAYER (config.js)
 *    - Loads environment variables
 *    - Validates configuration
 *    - Provides application settings
 * 
 * 2. SERVICE LAYER (services/)
 *    - RedisBridge: Core message processing
 *    - OutputStrategy: Abstract interface for outputs
 *    - EventHubMock: File-based mock implementation
 *    - ServiceFactory: Creates output services
 * 
 * 3. UTILITY LAYER (utils/)
 *    - Logger: Centralized logging (Singleton pattern)
 *    - Constants: Application-wide constants
 * 
 * DESIGN PATTERNS USED:
 * ✓ Strategy Pattern - Interchangeable output services
 * ✓ Factory Pattern - Creates output services based on config
 * ✓ Dependency Injection - Services are injected, not created internally
 * ✓ Singleton Pattern - Single logger instance across app
 * ✓ Observer Pattern - Event-driven message handling
 * 
 * APPLICATION FLOW (Step-by-Step):
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * PHASE 1: INITIALIZATION
 * ─────────────────────────
 * 1. Load configuration from environment
 * 2. Configure logger with appropriate level
 * 3. Validate all required configuration
 * 4. Display startup banner
 * 
 * PHASE 2: SERVICE CREATION
 * ─────────────────────────
 * 5. Use Factory to create output service (Mock, Azure, etc.)
 * 6. Inject output service into RedisBridge (Dependency Injection)
 * 7. Services are now ready but not started
 * 
 * PHASE 3: STARTUP
 * ─────────────────
 * 8. Register graceful shutdown handlers (SIGINT, SIGTERM)
 * 9. Call bridge.start()
 *    a. Output service initializes
 *    b. Redis client connects
 *    c. Subscribe to configured channel
 *    d. Start listening for messages
 * 10. Application is now running
 * 
 * PHASE 4: RUNTIME (Message Processing Loop)
 * ───────────────────────────────────────────
 * 11. Redis publishes message to channel
 * 12. Bridge receives message
 * 13. Message is parsed (JSON)
 * 14. Message is enriched with metadata
 * 15. Message is forwarded to output service
 * 16. Output service writes/sends message
 * 17. Loop continues until shutdown signal
 * 
 * PHASE 5: SHUTDOWN (Graceful Cleanup)
 * ─────────────────────────────────────
 * 18. User presses Ctrl+C or sends SIGTERM
 * 19. Shutdown handler is triggered
 * 20. Bridge stops accepting new messages
 * 21. Output service flushes pending messages
 * 22. Output service closes connection
 * 23. Redis subscriber disconnects
 * 24. Final statistics are logged
 * 25. Process exits cleanly
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ============================================================================
// STEP 1: IMPORT DEPENDENCIES
// ============================================================================

const config = require('./config');
const logger = require('./utils/Logger');
const RedisBridge = require('./services/RedisBridge');
const ServiceFactory = require('./services/ServiceFactory');
const { SHUTDOWN_SETTINGS } = require('./utils/constants');

// ============================================================================
// STEP 2: CONFIGURE LOGGER
// ============================================================================

// Set log level from configuration
logger.setLevel(config.logging.level);

// ============================================================================
// STEP 3: DISPLAY STARTUP BANNER
// ============================================================================

/**
 * DISPLAY APPLICATION BANNER
 * 
 * Shows configuration and environment info at startup
 */
function displayBanner() {
    logger.info('═══════════════════════════════════════════════════════════════');
    logger.info(`   ${config.app.name} v${config.app.version}`);
    logger.info('═══════════════════════════════════════════════════════════════');
    logger.info('');
    logger.info('Configuration:');
    logger.info(`  Environment:    ${config.app.environment}`);
    logger.info(`  Redis Host:     ${config.redis.host}:${config.redis.port}`);
    logger.info(`  Redis Channel:  ${config.redis.channel}`);
    logger.info(`  Output Type:    ${config.output.type.toUpperCase()}`);
    
    if (config.output.type === 'mock') {
        logger.info(`  Output File:    ${config.output.mockFile}`);
    }
    
    logger.info(`  Log Level:      ${Object.keys(config.logging).find(k => config.logging[k] === config.logging.level) || 'CUSTOM'}`);
    logger.info(`  Batch Enabled:  ${config.batch.enabled}`);
    
    if (config.batch.enabled) {
        logger.info(`  Batch Size:     ${config.batch.maxSize}`);
    }
    
    logger.info('');
    logger.info('Design Patterns:');
    logger.info('  ✓ Strategy Pattern (Output Services)');
    logger.info('  ✓ Factory Pattern (Service Creation)');
    logger.info('  ✓ Dependency Injection (Loose Coupling)');
    logger.info('  ✓ Singleton Pattern (Logger)');
    logger.info('  ✓ Observer Pattern (Event Handling)');
    logger.info('');
    logger.info('═══════════════════════════════════════════════════════════════');
    logger.info('');
}

// ============================================================================
// STEP 4: MAIN APPLICATION FUNCTION
// ============================================================================

/**
 * MAIN APPLICATION FUNCTION
 * 
 * Orchestrates the entire application lifecycle
 * 
 * STEP-BY-STEP EXECUTION:
 * 1. Display startup banner
 * 2. Create output service using Factory pattern
 * 3. Create RedisBridge with dependency injection
 * 4. Setup graceful shutdown handlers
 * 5. Start the bridge
 * 6. Application runs until shutdown signal
 * 
 * ERROR HANDLING:
 * - Any errors in initialization will be caught
 * - Error is logged with full context
 * - Process exits with error code
 * 
 * @returns {Promise<void>}
 */
async function main() {
    // ────────────────────────────────────────────────────────────────────────
    // PHASE 1: DISPLAY CONFIGURATION
    // ────────────────────────────────────────────────────────────────────────
    displayBanner();
    
    // ────────────────────────────────────────────────────────────────────────
    // PHASE 2: CREATE SERVICES
    // ────────────────────────────────────────────────────────────────────────
    
    logger.info('[MAIN] Creating output service...');
    
    // FACTORY PATTERN:
    // We don't create the service directly (e.g., new EventHubMock())
    // Instead, we ask the factory to create the right service based on config
    // This makes it easy to switch between Mock, Azure, Kafka, etc.
    const outputService = ServiceFactory.createOutputService(config);
    
    logger.info(`[MAIN] Output service created: ${outputService.name}`);
    
    // DEPENDENCY INJECTION:
    // We pass the output service TO the bridge, rather than having
    // the bridge create it. This makes testing easier and reduces coupling.
    logger.info('[MAIN] Creating Redis Bridge...');
    const bridge = new RedisBridge(config.redis, outputService);
    logger.info('[MAIN] Bridge created successfully');
    
    // ────────────────────────────────────────────────────────────────────────
    // PHASE 3: SETUP GRACEFUL SHUTDOWN
    // ────────────────────────────────────────────────────────────────────────
    
    logger.info('[MAIN] Setting up graceful shutdown handlers...');
    
    // Variable to track if shutdown is already in progress
    let isShuttingDown = false;
    
    /**
     * GRACEFUL SHUTDOWN HANDLER
     * 
     * Called when process receives SIGINT (Ctrl+C) or SIGTERM
     * 
     * STEP 1: Check if already shutting down (prevent double shutdown)
     * STEP 2: Set shutdown flag
     * STEP 3: Log shutdown signal
     * STEP 4: Call bridge.stop() to cleanup
     * STEP 5: Wait for cleanup with timeout
     * STEP 6: Exit process with appropriate code
     * 
     * @param {string} signal - Signal name (SIGINT, SIGTERM, etc.)
     */
    const gracefulShutdown = async (signal) => {
        // Prevent multiple shutdowns
        if (isShuttingDown) {
            logger.warn(`[MAIN] Shutdown already in progress, ignoring ${signal}`);
            return;
        }
        
        isShuttingDown = true;
        
        logger.info('');
        logger.info(`[MAIN] Received ${signal} - Initiating graceful shutdown...`);
        
        try {
            // Create a timeout promise
            const shutdownPromise = bridge.stop();
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => {
                    reject(new Error('Shutdown timeout exceeded'));
                }, SHUTDOWN_SETTINGS.GRACE_PERIOD_MS);
            });
            
            // Race between shutdown and timeout
            await Promise.race([shutdownPromise, timeoutPromise]);
            
            logger.info('[MAIN] Graceful shutdown completed successfully');
            process.exit(SHUTDOWN_SETTINGS.NORMAL_EXIT_CODE);
            
        } catch (error) {
            logger.error(`[MAIN] Error during shutdown: ${error.message}`);
            logger.warn('[MAIN] Forcing exit...');
            process.exit(SHUTDOWN_SETTINGS.FORCE_EXIT_CODE);
        }
    };
    
    // Register shutdown handlers for different signals
    // SIGINT = Ctrl+C in terminal
    // SIGTERM = Kill command (default signal)
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    
    // Also handle uncaught errors
    process.on('uncaughtException', (error) => {
        logger.error('[MAIN] Uncaught Exception:', error);
        gracefulShutdown('UNCAUGHT_EXCEPTION');
    });
    
    process.on('unhandledRejection', (reason, promise) => {
        logger.error('[MAIN] Unhandled Promise Rejection:', reason);
        gracefulShutdown('UNHANDLED_REJECTION');
    });
    
    logger.info('[MAIN] Shutdown handlers registered');
    
    // ────────────────────────────────────────────────────────────────────────
    // PHASE 4: START THE APPLICATION
    // ────────────────────────────────────────────────────────────────────────
    
    logger.info('');
    logger.info('[MAIN] Starting the bridge...');
    logger.info('');
    
    // This will:
    // 1. Initialize the output service
    // 2. Connect to Redis
    // 3. Subscribe to the channel
    // 4. Start listening for messages
    await bridge.start();
    
    logger.info('');
    logger.info('[MAIN] ✓ Application is running!');
    logger.info('[MAIN] Press Ctrl+C to stop gracefully');
    logger.info('[MAIN] Or type "exit" or "quit" and press Enter');
    logger.info('');
    
    // ────────────────────────────────────────────────────────────────────────
    // PHASE 5: SETUP STDIN FOR MANUAL EXIT
    // ────────────────────────────────────────────────────────────────────────
    
    // Allow user to type 'exit' or 'quit' to stop the application
    if (process.stdin.isTTY) {
        process.stdin.setEncoding('utf8');
        process.stdin.on('data', (data) => {
            const input = data.toString().trim().toLowerCase();
            if (input === 'exit' || input === 'quit' || input === 'q') {
                logger.info(`[MAIN] Manual exit command received: "${input}"`);
                gracefulShutdown('MANUAL_EXIT');
            }
        });
        
        // Resume stdin to start listening
        process.stdin.resume();
    }
    
    // ────────────────────────────────────────────────────────────────────────
    // PHASE 6: RUN FOREVER (until shutdown signal)
    // ────────────────────────────────────────────────────────────────────────
    
    // The application now runs indefinitely, processing messages
    // Event loop keeps the process alive
    // Only way to stop is via shutdown signal (Ctrl+C, SIGTERM, etc.)
}

// ============================================================================
// STEP 5: RUN THE APPLICATION
// ============================================================================

/**
 * APPLICATION ENTRY POINT
 * 
 * This is the first code that executes when the script runs
 * 
 * FLOW:
 * 1. Call main() function
 * 2. If main() succeeds, application runs forever
 * 3. If main() throws error, catch it here
 * 4. Log the error with full details
 * 5. Exit with error code
 */
main().catch((error) => {
    // Top-level error handler
    // Any errors during initialization will be caught here
    
    logger.error('');
    logger.error('═══════════════════════════════════════════════════════════════');
    logger.error('   FATAL ERROR - Application Failed to Start');
    logger.error('═══════════════════════════════════════════════════════════════');
    logger.error('');
    logger.error('Error Details:');
    logger.error(`  Message: ${error.message}`);
    
    if (error.stack) {
        logger.error('');
        logger.error('Stack Trace:');
        logger.error(error.stack);
    }
    
    logger.error('');
    logger.error('Troubleshooting:');
    logger.error('  1. Check your .env file exists and has correct values');
    logger.error('  2. Verify Redis is running and accessible');
    logger.error('  3. Ensure all required environment variables are set');
    logger.error('  4. Check file permissions for output file');
    logger.error('  5. Review the error message above for specific issues');
    logger.error('');
    logger.error('═══════════════════════════════════════════════════════════════');
    logger.error('');
    
    // Exit with error code
    process.exit(SHUTDOWN_SETTINGS.FORCE_EXIT_CODE);
});

/**
 * ============================================================================
 * ARCHITECTURE DIAGRAM:
 * ============================================================================
 * 
 *                    ┌─────────────────────────┐
 *                    │      index.js           │
 *                    │   (Entry Point)         │
 *                    └───────────┬─────────────┘
 *                                │
 *                                │ 1. Loads
 *                                ▼
 *                    ┌─────────────────────────┐
 *                    │      config.js          │
 *                    │  (Configuration Layer)  │
 *                    └───────────┬─────────────┘
 *                                │
 *                                │ 2. Used by
 *                                ▼
 *                    ┌─────────────────────────┐
 *                    │   ServiceFactory        │
 *                    │  (Factory Pattern)      │
 *                    └───────────┬─────────────┘
 *                                │
 *                                │ 3. Creates
 *                                ▼
 *                    ┌─────────────────────────┐
 *                    │   OutputStrategy        │ ◄── Abstract Base
 *                    │   (Strategy Pattern)    │
 *                    └───────────┬─────────────┘
 *                                │
 *                   ┌────────────┴────────────┐
 *                   │                         │
 *                   ▼                         ▼
 *        ┌──────────────────┐    ┌──────────────────┐
 *        │  EventHubMock    │    │  AzureEventHub   │
 *        │  (File Output)   │    │  (Azure Output)  │
 *        └──────────────────┘    └──────────────────┘
 *                   │                         │
 *                   └────────────┬────────────┘
 *                                │
 *                                │ 4. Injected into
 *                                ▼
 *                    ┌─────────────────────────┐
 *                    │     RedisBridge         │
 *                    │  (Core Service)         │
 *                    │  - Connects to Redis    │
 *                    │  - Subscribes to channel│
 *                    │  - Forwards messages    │
 *                    └───────────┬─────────────┘
 *                                │
 *                                │ 5. Uses
 *                                ▼
 *                    ┌─────────────────────────┐
 *                    │       Logger            │
 *                    │   (Singleton Pattern)   │
 *                    └─────────────────────────┘
 * 
 * ============================================================================
 * DATA FLOW:
 * ============================================================================
 * 
 *  Redis Pub/Sub    →    RedisBridge    →    OutputStrategy    →    Destination
 *  ─────────────         ────────────         ──────────────         ───────────
 *  Publishes             1. Receives          1. Receives             File or
 *  message to            2. Parses JSON       2. Enriches             Cloud
 *  channel               3. Enriches          3. Writes/Sends         Service
 *                        4. Forwards          4. Returns status
 * 
 * ============================================================================
 */