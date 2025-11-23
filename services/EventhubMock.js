/**
 * ============================================================================
 * EVENT HUB MOCK - File-based Mock Implementation
 * ============================================================================
 * 
 * DESIGN PATTERN: Strategy Pattern (Concrete Implementation)
 * 
 * PURPOSE:
 * This class implements the OutputStrategy interface by writing events
 * to a local file instead of sending to Azure Event Hubs.
 * 
 * USE CASES:
 * - Local development without Azure credentials
 * - Testing message flow without external dependencies
 * - Debugging and troubleshooting
 * - Recording events for analysis
 * 
 * STEP-BY-STEP HOW IT WORKS:
 * 1. Extends OutputStrategy base class
 * 2. Implements required methods (initialize, sendEvent, close)
 * 3. Writes JSON events to a local file (one per line - JSONL format)
 * 4. Simulates success/failure scenarios
 * 
 * ============================================================================
 */

const fs = require('fs/promises');
const OutputStrategy = require('./OutputStrategy');
const logger = require('../utils/Logger');
const { FILE_OUTPUT } = require('../utils/constants');

/**
 * MOCK OUTPUT STRATEGY CLASS
 * 
 * Concrete implementation of OutputStrategy that writes to a file
 */
class EventHubMock extends OutputStrategy {
    /**
     * CONSTRUCTOR
     * 
     * STEP 1: Call parent constructor with service name
     * STEP 2: Store file path configuration
     * STEP 3: Initialize file handle (will be set in initialize())
     * 
     * @param {string} filePath - Path to output file (JSONL format)
     */
    constructor(filePath) {
        // Call parent constructor with service name
        super('EventHubMock');
        
        this.filePath = filePath || FILE_OUTPUT.DEFAULT_PATH;
        this.encoding = FILE_OUTPUT.ENCODING;
        
        logger.info(`[${this.name}] Configured to write to: ${this.filePath}`);
    }
    
    /**
     * INITIALIZE - Set up the mock output service
     * 
     * IMPLEMENTATION OF ABSTRACT METHOD
     * 
     * STEP 1: Verify we can write to the file
     * STEP 2: Create file if it doesn't exist
     * STEP 3: Mark service as connected
     * STEP 4: Log success
     * 
     * @returns {Promise<void>}
     * @throws {Error} If file cannot be created/accessed
     */
    async initialize() {
        try {
            logger.debug(`[${this.name}] Initializing file output...`);
            
            // Test write access by creating/touching the file
            // This ensures we catch permission errors early
            await fs.appendFile(this.filePath, '', { encoding: this.encoding });
            
            this.isConnected = true;
            
            logger.info(`[${this.name}] Successfully initialized. Ready to write events.`);
        } catch (error) {
            this.isConnected = false;
            logger.error(`[${this.name}] Failed to initialize: ${error.message}`);
            throw new Error(`Mock initialization failed: ${error.message}`);
        }
    }
    
    /**
     * SEND EVENT - Write a single event to file
     * 
     * IMPLEMENTATION OF ABSTRACT METHOD
     * 
     * STEP 1: Enrich event with metadata (source, timestamp)
     * STEP 2: Convert to JSON string
     * STEP 3: Append to file with newline (JSONL format)
     * STEP 4: Update metrics
     * STEP 5: Return success/failure
     * 
     * @param {Object} eventData - The event to write
     * @returns {Promise<boolean>} - true if successful, false on error
     */
    async sendEvent(eventData) {
        // Defensive: Don't proceed if not initialized
        if (!this.isConnected) {
            logger.error(`[${this.name}] Cannot send event - not initialized`);
            this.errorCount++;
            return false;
        }
        
        try {
            // STEP 1: Enrich the event with metadata
            const enrichedEvent = {
                source: 'RedisBridge',
                timestamp: new Date().toISOString(),
                eventId: this._generateEventId(),
                ...eventData,
            };
            
            // STEP 2: Convert to JSON string with newline (JSONL format)
            // Each line is a valid JSON object
            const jsonLine = JSON.stringify(enrichedEvent) + '\n';
            
            // STEP 3: Append to file
            // Using appendFile is safe for concurrent writes on most systems
            await fs.appendFile(this.filePath, jsonLine, { encoding: this.encoding });
            
            // STEP 4: Update success metrics
            this.messagesSent++;
            
            // STEP 5: Log success (at debug level to avoid spam)
            logger.debug(`[${this.name}] Event written successfully (ID: ${enrichedEvent.eventId})`);
            
            return true;
            
        } catch (error) {
            // Handle errors gracefully - log but don't crash
            this.errorCount++;
            logger.error(`[${this.name}] Failed to write event: ${error.message}`);
            
            // In production, you might want to:
            // - Retry the operation
            // - Write to a dead-letter file
            // - Send alert notification
            
            return false;
        }
    }
    
    /**
     * SEND BATCH - Override for efficient batch writing
     * 
     * OPTIMIZED IMPLEMENTATION
     * 
     * Instead of calling sendEvent() multiple times (slow),
     * we write all events in a single file operation (fast).
     * 
     * STEP 1: Enrich all events
     * STEP 2: Convert all to JSONL format
     * STEP 3: Write all at once
     * STEP 4: Update metrics
     * 
     * @param {Array<Object>} events - Array of events to write
     * @returns {Promise<number>} - Count of successfully written events
     */
    async sendBatch(events) {
        if (!this.isConnected) {
            logger.error(`[${this.name}] Cannot send batch - not initialized`);
            return 0;
        }
        
        if (!events || events.length === 0) {
            return 0;
        }
        
        try {
            logger.debug(`[${this.name}] Writing batch of ${events.length} events`);
            
            // STEP 1 & 2: Enrich and convert all events to JSONL
            const jsonLines = events.map(eventData => {
                const enrichedEvent = {
                    source: 'RedisBridge',
                    timestamp: new Date().toISOString(),
                    eventId: this._generateEventId(),
                    ...eventData,
                };
                return JSON.stringify(enrichedEvent);
            }).join('\n') + '\n';
            
            // STEP 3: Single write operation for all events (much faster!)
            await fs.appendFile(this.filePath, jsonLines, { encoding: this.encoding });
            
            // STEP 4: Update metrics
            this.messagesSent += events.length;
            
            logger.info(`[${this.name}] Batch written successfully (${events.length} events)`);
            
            return events.length; // All succeeded
            
        } catch (error) {
            this.errorCount += events.length;
            logger.error(`[${this.name}] Failed to write batch: ${error.message}`);
            return 0; // All failed
        }
    }
    
    /**
     * CLOSE - Clean up resources
     * 
     * IMPLEMENTATION OF ABSTRACT METHOD
     * 
     * For file-based output, there's no persistent connection to close.
     * But we follow the contract for consistency.
     * 
     * STEP 1: Mark as disconnected
     * STEP 2: Log final statistics
     */
    async close() {
        logger.info(`[${this.name}] Closing output service...`);
        
        // Log final statistics
        const stats = this.getStats();
        logger.info(`[${this.name}] Final stats:`, stats);
        
        this.isConnected = false;
        
        logger.info(`[${this.name}] Closed successfully`);
    }
    
    /**
     * GENERATE UNIQUE EVENT ID
     * 
     * HELPER METHOD
     * 
     * Creates a unique identifier for each event.
     * Format: timestamp-random
     * 
     * @returns {string} - Unique event ID
     */
    _generateEventId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * GET FILE PATH - Useful for testing/debugging
     * 
     * @returns {string} - The output file path
     */
    getFilePath() {
        return this.filePath;
    }
}

/**
 * ============================================================================
 * USAGE EXAMPLE:
 * ============================================================================
 * 
 * const mock = new EventHubMock('./output.jsonl');
 * await mock.initialize();
 * 
 * // Send single event
 * await mock.sendEvent({ channel: 'test', data: { value: 123 } });
 * 
 * // Send batch
 * await mock.sendBatch([
 *     { channel: 'test', data: { value: 1 } },
 *     { channel: 'test', data: { value: 2 } },
 * ]);
 * 
 * // Cleanup
 * await mock.close();
 * 
 * ============================================================================
 */

module.exports = EventHubMock;