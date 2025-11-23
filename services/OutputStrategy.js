/**
 * ============================================================================
 * OUTPUT STRATEGY - Base Interface for Output Services
 * ============================================================================
 * 
 * DESIGN PATTERN: Strategy Pattern
 * 
 * WHAT IS THE STRATEGY PATTERN?
 * - Defines a family of algorithms (output methods)
 * - Encapsulates each one (Mock, Azure, Kafka, etc.)
 * - Makes them interchangeable at runtime
 * - Client code doesn't need to know implementation details
 * 
 * WHY USE THIS PATTERN?
 * - Easy to add new output destinations without changing existing code
 * - Can switch output types via configuration
 * - Each strategy is independently testable
 * - Follows Open/Closed Principle (open for extension, closed for modification)
 * 
 * STEP-BY-STEP HOW IT WORKS:
 * 1. Define a base class (OutputStrategy) with common interface
 * 2. Each concrete implementation (Mock, Azure) extends this base
 * 3. Client code (RedisBridge) works with the interface, not specific implementations
 * 4. At runtime, we inject the appropriate strategy based on config
 * 
 * ============================================================================
 */

const logger = require('../utils/Logger');

/**
 * BASE OUTPUT STRATEGY CLASS
 * 
 * This is an ABSTRACT CLASS - it defines the contract that all output
 * services must follow, but doesn't provide complete implementation.
 * 
 * Think of this as a "blueprint" or "interface" that all output services
 * must implement.
 */
class OutputStrategy {
    /**
     * CONSTRUCTOR
     * 
     * @param {string} name - Human-readable name for this output service
     */
    constructor(name) {
        if (this.constructor === OutputStrategy) {
            throw new Error('OutputStrategy is abstract and cannot be instantiated directly');
        }
        
        this.name = name;
        this.isConnected = false;
        this.messagesSent = 0;
        this.errorCount = 0;
    }
    
    /**
     * INITIALIZE CONNECTION
     * 
     * ABSTRACT METHOD - Must be implemented by subclasses
     * 
     * PURPOSE:
     * - Set up connection to the output service
     * - Authenticate if needed
     * - Prepare for sending messages
     * 
     * STEP-BY-STEP:
     * 1. Connect to external service (Azure, Kafka, etc.)
     * 2. Authenticate with credentials
     * 3. Set isConnected = true on success
     * 4. Throw error on failure
     */
    async initialize() {
        throw new Error('initialize() must be implemented by subclass');
    }
    
    /**
     * SEND SINGLE EVENT
     * 
     * ABSTRACT METHOD - Must be implemented by subclasses
     * 
     * PURPOSE:
     * Send a single event/message to the output service
     * 
     * @param {Object} eventData - The message to send
     * @returns {Promise<boolean>} - true if successful, false otherwise
     * 
     * IMPLEMENTATION NOTES:
     * - Should handle retries internally
     * - Should log errors but not throw (to prevent bridge crash)
     * - Should update metrics (messagesSent, errorCount)
     */
    async sendEvent(eventData) {
        throw new Error('sendEvent() must be implemented by subclass');
    }
    
    /**
     * SEND BATCH OF EVENTS
     * 
     * OPTIONAL METHOD - Can be overridden for efficiency
     * 
     * PURPOSE:
     * Send multiple events in a single operation for better performance
     * 
     * DEFAULT IMPLEMENTATION:
     * Calls sendEvent() for each message (inefficient but works)
     * 
     * OVERRIDE THIS:
     * If your service supports batch operations for better throughput
     * 
     * @param {Array<Object>} events - Array of events to send
     * @returns {Promise<number>} - Count of successfully sent events
     */
    async sendBatch(events) {
        logger.debug(`[${this.name}] Sending batch of ${events.length} events`);
        
        let successCount = 0;
        
        // Default: send one at a time
        for (const event of events) {
            const success = await this.sendEvent(event);
            if (success) {
                successCount++;
            }
        }
        
        return successCount;
    }
    
    /**
     * CLOSE CONNECTION
     * 
     * ABSTRACT METHOD - Must be implemented by subclasses
     * 
     * PURPOSE:
     * Clean up resources and close connections gracefully
     * 
     * STEP-BY-STEP:
     * 1. Flush any pending messages
     * 2. Close network connections
     * 3. Release resources
     * 4. Set isConnected = false
     */
    async close() {
        throw new Error('close() must be implemented by subclass');
    }
    
    /**
     * GET STATISTICS
     * 
     * CONCRETE METHOD - Provided by base class
     * 
     * Returns metrics about this output service
     */
    getStats() {
        return {
            name: this.name,
            isConnected: this.isConnected,
            messagesSent: this.messagesSent,
            errorCount: this.errorCount,
            successRate: this.messagesSent > 0 
                ? ((this.messagesSent - this.errorCount) / this.messagesSent * 100).toFixed(2) + '%'
                : 'N/A',
        };
    }
    
    /**
     * HEALTH CHECK
     * 
     * CONCRETE METHOD - Can be overridden
     * 
     * Basic health check that can be enhanced by subclasses
     */
    async healthCheck() {
        return {
            healthy: this.isConnected && this.errorCount < 10,
            status: this.isConnected ? 'connected' : 'disconnected',
            ...this.getStats(),
        };
    }
}

/**
 * ============================================================================
 * USAGE EXAMPLE:
 * ============================================================================
 * 
 * To create a new output service:
 * 
 * class MyCustomOutput extends OutputStrategy {
 *     constructor(config) {
 *         super('MyCustomOutput');
 *         this.config = config;
 *     }
 * 
 *     async initialize() {
 *         // Connect to your service
 *         this.isConnected = true;
 *     }
 * 
 *     async sendEvent(eventData) {
 *         try {
 *             // Send to your service
 *             this.messagesSent++;
 *             return true;
 *         } catch (error) {
 *             this.errorCount++;
 *             return false;
 *         }
 *     }
 * 
 *     async close() {
 *         // Cleanup
 *         this.isConnected = false;
 *     }
 * }
 * 
 * ============================================================================
 */

module.exports = OutputStrategy;
