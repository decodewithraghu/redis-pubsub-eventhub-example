/**
 * ============================================================================
 * SERVICE FACTORY - Factory Pattern for Output Services
 * ============================================================================
 * 
 * DESIGN PATTERN: Factory Pattern
 * 
 * WHAT IS THE FACTORY PATTERN?
 * - Provides an interface for creating objects
 * - Lets subclasses/config decide which class to instantiate
 * - Encapsulates object creation logic
 * - Client code doesn't need to know about concrete classes
 * 
 * WHY USE THIS PATTERN?
 * - Centralized creation logic
 * - Easy to add new output types
 * - Configuration-driven instantiation
 * - Simplifies client code (no complex if/else chains)
 * 
 * STEP-BY-STEP HOW IT WORKS:
 * 1. Client calls factory with configuration
 * 2. Factory examines config.output.type
 * 3. Factory creates appropriate service instance
 * 4. Factory returns the instance to client
 * 5. Client uses the instance without knowing concrete type
 * 
 * ============================================================================
 */

const EventHubMock = require('./EventhubMock');
const { OUTPUT_TYPES, ERROR_MESSAGES } = require('../utils/constants');
const logger = require('../utils/Logger');

/**
 * SERVICE FACTORY CLASS
 * 
 * Creates output service instances based on configuration
 */
class ServiceFactory {
    /**
     * CREATE OUTPUT SERVICE
     * 
     * MAIN FACTORY METHOD
     * 
     * STEP 1: Read output type from config
     * STEP 2: Validate output type
     * STEP 3: Create appropriate service instance
     * STEP 4: Return the instance
     * 
     * @param {Object} config - Application configuration object
     * @returns {OutputStrategy} - Instance of appropriate output service
     * @throws {Error} - If output type is invalid or unsupported
     */
    static createOutputService(config) {
        const outputType = config.output.type;
        
        logger.info(`[ServiceFactory] Creating output service of type: ${outputType}`);
        
        // DECISION LOGIC: Which service to create?
        switch (outputType) {
            case OUTPUT_TYPES.MOCK:
                return ServiceFactory._createMockService(config);
                
            case OUTPUT_TYPES.AZURE:
                return ServiceFactory._createAzureService(config);
                
            case OUTPUT_TYPES.KAFKA:
                // Future implementation
                throw new Error('Kafka output not yet implemented');
                
            default:
                // Invalid output type
                const validTypes = Object.values(OUTPUT_TYPES).join(', ');
                throw new Error(
                    `${ERROR_MESSAGES.INVALID_OUTPUT_TYPE}: "${outputType}". ` +
                    `Valid types: ${validTypes}`
                );
        }
    }
    
    /**
     * CREATE MOCK SERVICE
     * 
     * PRIVATE HELPER METHOD
     * 
     * Creates and configures a mock (file-based) output service
     * 
     * STEP 1: Extract file path from config
     * STEP 2: Create EventHubMock instance
     * STEP 3: Return instance
     * 
     * @param {Object} config - Application configuration
     * @returns {EventHubMock} - Mock output service
     * @private
     */
    static _createMockService(config) {
        const filePath = config.output.mockFile;
        
        logger.debug(`[ServiceFactory] Creating Mock service with file: ${filePath}`);
        
        return new EventHubMock(filePath);
    }
    
    /**
     * CREATE AZURE EVENT HUB SERVICE
     * 
     * PRIVATE HELPER METHOD
     * 
     * Creates and configures an Azure Event Hubs output service
     * 
     * STEP 1: Extract Azure configuration
     * STEP 2: Validate required fields
     * STEP 3: Create AzureEventHub instance
     * STEP 4: Return instance
     * 
     * @param {Object} config - Application configuration
     * @returns {AzureEventHub} - Azure output service
     * @private
     */
    static _createAzureService(config) {
        const connectionString = config.output.azureConnectionString;
        const hubName = config.output.azureHubName;
        
        logger.debug(`[ServiceFactory] Creating Azure Event Hub service: ${hubName}`);
        
        // Note: Actual Azure implementation would be:
        // const AzureEventHub = require('./AzureEventHub');
        // return new AzureEventHub(connectionString, hubName);
        
        // For now, throw error since it's not implemented
        throw new Error(
            'Azure Event Hub output not yet implemented. ' +
            'To add it:\n' +
            '1. Install @azure/event-hubs package\n' +
            '2. Create services/AzureEventHub.js extending OutputStrategy\n' +
            '3. Implement initialize(), sendEvent(), sendBatch(), close()\n' +
            '4. Uncomment the code above'
        );
    }
    
    /**
     * CREATE KAFKA SERVICE (Placeholder)
     * 
     * FUTURE IMPLEMENTATION
     * 
     * @param {Object} config - Application configuration
     * @returns {KafkaProducer} - Kafka output service
     * @private
     */
    static _createKafkaService(config) {
        // Future implementation:
        // const KafkaProducer = require('./KafkaProducer');
        // return new KafkaProducer(config.output.kafkaBrokers, config.output.kafkaTopic);
        
        throw new Error('Kafka output not yet implemented');
    }
}

/**
 * ============================================================================
 * USAGE EXAMPLE:
 * ============================================================================
 * 
 * const config = require('../config');
 * const ServiceFactory = require('./ServiceFactory');
 * 
 * // Factory creates the right service based on config
 * const outputService = ServiceFactory.createOutputService(config);
 * 
 * // Initialize it
 * await outputService.initialize();
 * 
 * // Use it (works the same regardless of type!)
 * await outputService.sendEvent({ data: 'test' });
 * 
 * // Clean up
 * await outputService.close();
 * 
 * ============================================================================
 * 
 * BENEFITS:
 * 1. Client code is simple - just call the factory
 * 2. Adding new output types only requires changes here
 * 3. Configuration drives behavior (no code changes needed)
 * 4. Easy to test (can mock the factory)
 * 5. Follows Dependency Inversion Principle
 * 
 * ============================================================================
 */

module.exports = ServiceFactory;
