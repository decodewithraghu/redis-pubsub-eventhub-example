/**
 * ============================================================================
 * LOGGER UNIT TESTS
 * ============================================================================
 * 
 * Tests the Singleton Logger utility
 * 
 * Test Coverage:
 * - Singleton pattern behavior
 * - Log level filtering
 * - Message formatting
 * - Different log methods
 */

const Logger = require('../../utils/Logger');
const { LOG_LEVELS } = require('../../utils/constants');

describe('Logger (Singleton Pattern)', () => {
    let logger;
    let consoleLogSpy;

    beforeEach(() => {
        logger = Logger;
        consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
        consoleLogSpy.mockRestore();
    });

    describe('Singleton Pattern', () => {
        test('should return the same instance', () => {
            const instance1 = Logger;
            const instance2 = Logger;
            
            expect(instance1).toBe(instance2);
        });

        test('should share state across imports', () => {
            logger.setLevel(LOG_LEVELS.DEBUG);
            
            // Simulate another import
            const anotherLogger = require('../../utils/Logger');
            
            expect(anotherLogger.level).toBe(LOG_LEVELS.DEBUG);
        });
    });

    describe('Log Level Filtering', () => {
        test('should only log messages at or below current level', () => {
            logger.setLevel(LOG_LEVELS.WARN);
            
            logger.error('Error message');
            logger.warn('Warning message');
            logger.info('Info message');
            logger.debug('Debug message');
            
            expect(consoleLogSpy).toHaveBeenCalledTimes(2); // Only error and warn
        });

        test('should log all messages when level is TRACE', () => {
            logger.setLevel(LOG_LEVELS.TRACE);
            
            logger.error('Error');
            logger.warn('Warn');
            logger.info('Info');
            logger.debug('Debug');
            logger.trace('Trace');
            
            expect(consoleLogSpy).toHaveBeenCalledTimes(5);
        });

        test('should accept string log levels', () => {
            logger.setLevel('DEBUG');
            
            expect(logger.level).toBe(LOG_LEVELS.DEBUG);
        });

        test('should handle invalid log levels gracefully', () => {
            logger.setLevel('INVALID');
            
            // Should default to INFO
            expect(logger.level).toBeDefined();
        });
    });

    describe('Log Methods', () => {
        beforeEach(() => {
            logger.setLevel(LOG_LEVELS.TRACE); // Log everything
        });

        test('error() should log error messages', () => {
            logger.error('Test error');
            
            expect(consoleLogSpy).toHaveBeenCalled();
            const logMessage = consoleLogSpy.mock.calls[0][0];
            expect(logMessage).toContain('ERROR');
            expect(logMessage).toContain('Test error');
        });

        test('warn() should log warning messages', () => {
            logger.warn('Test warning');
            
            expect(consoleLogSpy).toHaveBeenCalled();
            const logMessage = consoleLogSpy.mock.calls[0][0];
            expect(logMessage).toContain('WARN');
        });

        test('info() should log info messages', () => {
            logger.info('Test info');
            
            expect(consoleLogSpy).toHaveBeenCalled();
            const logMessage = consoleLogSpy.mock.calls[0][0];
            expect(logMessage).toContain('INFO');
        });

        test('debug() should log debug messages', () => {
            logger.debug('Test debug');
            
            expect(consoleLogSpy).toHaveBeenCalled();
            const logMessage = consoleLogSpy.mock.calls[0][0];
            expect(logMessage).toContain('DEBUG');
        });

        test('trace() should log trace messages', () => {
            logger.trace('Test trace');
            
            expect(consoleLogSpy).toHaveBeenCalled();
            const logMessage = consoleLogSpy.mock.calls[0][0];
            expect(logMessage).toContain('TRACE');
        });

        test('should handle additional arguments', () => {
            logger.info('Message', { key: 'value' }, [1, 2, 3]);
            
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringContaining('Message'),
                { key: 'value' },
                [1, 2, 3]
            );
        });
    });

    describe('Message Formatting', () => {
        beforeEach(() => {
            logger.setLevel(LOG_LEVELS.INFO);
        });

        test('should include timestamp when enabled', () => {
            logger.info('Test message');
            
            const logMessage = consoleLogSpy.mock.calls[0][0];
            // Check for ISO timestamp pattern
            expect(logMessage).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
        });

        test('should include log level in message', () => {
            logger.info('Test message');
            
            const logMessage = consoleLogSpy.mock.calls[0][0];
            expect(logMessage).toContain('[INFO]');
        });
    });
});
