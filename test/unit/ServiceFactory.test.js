/**
 * ============================================================================
 * SERVICE FACTORY UNIT TESTS
 * ============================================================================
 * 
 * Tests the ServiceFactory (Factory Pattern)
 * 
 * Test Coverage:
 * - Mock service creation
 * - Invalid output type handling
 * - Configuration validation
 * - Factory method behavior
 */

const ServiceFactory = require('../../services/ServiceFactory');
const EventHubMock = require('../../services/EventhubMock');
const { OUTPUT_TYPES } = require('../../utils/constants');

describe('ServiceFactory (Factory Pattern)', () => {
    describe('Create Output Service', () => {
        test('should create mock service when type is mock', () => {
            const config = {
                output: {
                    type: OUTPUT_TYPES.MOCK,
                    mockFile: './test_output.jsonl'
                }
            };

            const service = ServiceFactory.createOutputService(config);

            expect(service).toBeInstanceOf(EventHubMock);
            expect(service.filePath).toBe('./test_output.jsonl');
        });

        test('should throw error for invalid output type', () => {
            const config = {
                output: {
                    type: 'invalid-type'
                }
            };

            expect(() => {
                ServiceFactory.createOutputService(config);
            }).toThrow(/Invalid output service type/);
        });

        test('should throw error for azure type (not implemented)', () => {
            const config = {
                output: {
                    type: OUTPUT_TYPES.AZURE,
                    azureConnectionString: 'test',
                    azureHubName: 'test-hub'
                }
            };

            expect(() => {
                ServiceFactory.createOutputService(config);
            }).toThrow(/Azure Event Hub output not yet implemented/);
        });

        test('should throw error for kafka type (not implemented)', () => {
            const config = {
                output: {
                    type: OUTPUT_TYPES.KAFKA
                }
            };

            expect(() => {
                ServiceFactory.createOutputService(config);
            }).toThrow(/Kafka output not yet implemented/);
        });
    });

    describe('Mock Service Creation', () => {
        test('should use file path from config', () => {
            const config = {
                output: {
                    type: OUTPUT_TYPES.MOCK,
                    mockFile: './custom_output.jsonl'
                }
            };

            const service = ServiceFactory.createOutputService(config);

            expect(service.getFilePath()).toBe('./custom_output.jsonl');
        });

        test('created service should have all required methods', () => {
            const config = {
                output: {
                    type: OUTPUT_TYPES.MOCK,
                    mockFile: './test.jsonl'
                }
            };

            const service = ServiceFactory.createOutputService(config);

            expect(service.initialize).toBeDefined();
            expect(service.sendEvent).toBeDefined();
            expect(service.sendBatch).toBeDefined();
            expect(service.close).toBeDefined();
            expect(service.getStats).toBeDefined();
        });
    });

    describe('Error Messages', () => {
        test('should provide helpful error for invalid type', () => {
            const config = {
                output: {
                    type: 'unknown'
                }
            };

            expect(() => {
                ServiceFactory.createOutputService(config);
            }).toThrow(/Valid types:/);
        });

        test('error should list valid output types', () => {
            const config = {
                output: {
                    type: 'unknown'
                }
            };

            try {
                ServiceFactory.createOutputService(config);
                fail('Should have thrown error');
            } catch (error) {
                expect(error.message).toContain('mock');
                expect(error.message).toContain('azure');
            }
        });
    });
});
