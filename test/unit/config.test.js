/**
 * ============================================================================
 * CONFIG UNIT TESTS
 * ============================================================================
 * 
 * Tests the configuration system (Builder + Validator patterns)
 * 
 * Test Coverage:
 * - Configuration validation
 * - Default values
 * - Environment variable parsing
 * - Error handling
 */

// Mock environment variables before requiring config
const originalEnv = process.env;

describe('Configuration System (Builder Pattern)', () => {
    beforeEach(() => {
        // Reset modules to get fresh config
        jest.resetModules();
        process.env = { ...originalEnv };
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    describe('Redis Configuration', () => {
        test('should use default values when env vars not set', () => {
            delete process.env.REDIS_HOST;
            delete process.env.REDIS_PORT;

            const config = require('../../config');

            expect(config.redis.host).toBe('127.0.0.1');
            expect(config.redis.port).toBe(6379);
        });

        test('should use environment variables when set', () => {
            process.env.REDIS_HOST = 'redis.example.com';
            process.env.REDIS_PORT = '6380';
            process.env.REDIS_CHANNEL = 'custom-channel';

            const config = require('../../config');

            expect(config.redis.host).toBe('redis.example.com');
            expect(config.redis.port).toBe(6380);
            expect(config.redis.channel).toBe('custom-channel');
        });

        test('should validate port number range', () => {
            process.env.REDIS_PORT = '99999'; // Invalid port

            expect(() => {
                require('../../config');
            }).toThrow(/Invalid port number/);
        });

        test('should support optional authentication', () => {
            process.env.REDIS_PASSWORD = 'secret';
            process.env.REDIS_USERNAME = 'user';

            const config = require('../../config');

            expect(config.redis.password).toBe('secret');
            expect(config.redis.username).toBe('user');
        });

        test('should support TLS configuration', () => {
            process.env.REDIS_USE_TLS = 'true';

            const config = require('../../config');

            expect(config.redis.useTLS).toBe(true);
        });
    });

    describe('Output Configuration', () => {
        test('should default to mock output type', () => {
            delete process.env.OUTPUT_TYPE;

            const config = require('../../config');

            expect(config.output.type).toBe('mock');
        });

        test('should validate output type', () => {
            process.env.OUTPUT_TYPE = 'invalid-type';

            expect(() => {
                require('../../config');
            }).toThrow(/Invalid output service type/);
        });

        test('should use mock file path from env', () => {
            process.env.OUTPUT_TYPE = 'mock';
            process.env.MOCK_OUTPUT_FILE = './custom.jsonl';

            const config = require('../../config');

            expect(config.output.mockFile).toBe('./custom.jsonl');
        });

        test('should require Azure config when type is azure', () => {
            process.env.OUTPUT_TYPE = 'azure';
            delete process.env.EVENT_HUB_CONNECTION_STRING;

            expect(() => {
                require('../../config');
            }).toThrow(/EVENT_HUB_CONNECTION_STRING/);
        });
    });

    describe('Retry Configuration', () => {
        test('should use default retry settings', () => {
            const config = require('../../config');

            expect(config.retry.maxAttempts).toBe(10);
            expect(config.retry.initialDelayMs).toBe(1000);
            expect(config.retry.maxDelayMs).toBe(30000);
        });

        test('should parse retry settings from env', () => {
            process.env.RETRY_MAX_ATTEMPTS = '20';
            process.env.RETRY_INITIAL_DELAY_MS = '2000';

            const config = require('../../config');

            expect(config.retry.maxAttempts).toBe(20);
            expect(config.retry.initialDelayMs).toBe(2000);
        });

        test('should handle jitter setting', () => {
            process.env.RETRY_JITTER = 'false';

            const config = require('../../config');

            expect(config.retry.jitter).toBe(false);
        });
    });

    describe('Batch Configuration', () => {
        test('should default batch settings', () => {
            const config = require('../../config');

            expect(config.batch.enabled).toBe(true);
            expect(config.batch.maxSize).toBe(100);
            expect(config.batch.timeoutMs).toBe(5000);
        });

        test('should parse batch settings from env', () => {
            process.env.BATCH_ENABLED = 'false';
            process.env.BATCH_MAX_SIZE = '500';

            const config = require('../../config');

            expect(config.batch.enabled).toBe(false);
            expect(config.batch.maxSize).toBe(500);
        });
    });

    describe('Logging Configuration', () => {
        test('should default to INFO log level', () => {
            delete process.env.LOG_LEVEL;

            const config = require('../../config');

            expect(config.logging.level).toBe(2); // INFO = 2
        });

        test('should parse log level from string', () => {
            process.env.LOG_LEVEL = 'DEBUG';

            const config = require('../../config');

            expect(config.logging.level).toBe(3); // DEBUG = 3
        });

        test('should throw error for invalid log level', () => {
            process.env.LOG_LEVEL = 'INVALID';

            expect(() => {
                require('../../config');
            }).toThrow(/Invalid log level/);
        });
    });

    describe('Configuration Immutability', () => {
        test('config object should be frozen', () => {
            const config = require('../../config');

            expect(Object.isFrozen(config)).toBe(true);
        });

        test('should not allow modification of top-level config', () => {
            const config = require('../../config');
            
            const originalRedis = config.redis;

            // Attempt to modify top-level property (will silently fail on frozen object)
            config.redis = { host: 'completely-new' };
            
            // Verify top-level didn't change
            expect(config.redis).toBe(originalRedis);
        });
    });
});
