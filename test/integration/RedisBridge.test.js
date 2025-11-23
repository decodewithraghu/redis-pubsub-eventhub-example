/**
 * ============================================================================
 * REDIS BRIDGE INTEGRATION TESTS
 * ============================================================================
 * 
 * Integration tests for RedisBridge with mocked Redis client
 * 
 * Test Coverage:
 * - Service startup and initialization
 * - Message handling
 * - Error handling and reconnection
 * - Statistics tracking
 * - Graceful shutdown
 */

const RedisBridge = require('../../services/RedisBridge');
const EventHubMock = require('../../services/EventhubMock');

// Mock ioredis
jest.mock('ioredis');
const Redis = require('ioredis');

describe('RedisBridge Integration Tests', () => {
    let bridge;
    let mockOutputService;
    let mockRedisClient;
    const testConfig = {
        host: '127.0.0.1',
        port: 6379,
        channel: 'test-channel',
        password: null,
        username: null,
        useTLS: false,
        connectTimeout: 10000,
        maxRetriesPerRequest: null,
        enableOfflineQueue: false,
        enableReadyCheck: false,
    };

    beforeEach(() => {
        // Create mock Redis client
        mockRedisClient = {
            on: jest.fn(),
            subscribe: jest.fn((channel, callback) => callback(null)),
            disconnect: jest.fn(),
        };

        Redis.mockImplementation(() => mockRedisClient);

        // Create mock output service
        mockOutputService = {
            name: 'MockOutput',
            initialize: jest.fn().mockResolvedValue(),
            sendEvent: jest.fn().mockResolvedValue(true),
            close: jest.fn().mockResolvedValue(),
            getStats: jest.fn().mockReturnValue({
                messagesSent: 0,
                errorCount: 0,
            }),
        };

        bridge = new RedisBridge(testConfig, mockOutputService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Initialization and Startup', () => {
        test('should initialize output service on start', async () => {
            await bridge.start();

            expect(mockOutputService.initialize).toHaveBeenCalled();
        });

        test('should create Redis client with correct config', async () => {
            await bridge.start();

            expect(Redis).toHaveBeenCalledWith(
                expect.objectContaining({
                    host: testConfig.host,
                    port: testConfig.port,
                    password: testConfig.password,
                })
            );
        });

        test('should register event handlers', async () => {
            await bridge.start();

            expect(mockRedisClient.on).toHaveBeenCalledWith('connect', expect.any(Function));
            expect(mockRedisClient.on).toHaveBeenCalledWith('error', expect.any(Function));
            expect(mockRedisClient.on).toHaveBeenCalledWith('close', expect.any(Function));
            expect(mockRedisClient.on).toHaveBeenCalledWith('message', expect.any(Function));
        });

        test('should set isRunning flag', async () => {
            await bridge.start();

            expect(bridge.isRunning).toBe(true);
        });
    });

    describe('Message Handling', () => {
        let messageHandler;

        beforeEach(async () => {
            await bridge.start();
            // Get the message handler that was registered
            const onCalls = mockRedisClient.on.mock.calls;
            const messageCall = onCalls.find(call => call[0] === 'message');
            messageHandler = messageCall[1];
        });

        test('should parse and forward JSON messages', async () => {
            const channel = 'test-channel';
            const message = JSON.stringify({ event: 'test', value: 123 });

            await messageHandler(channel, message);

            expect(mockOutputService.sendEvent).toHaveBeenCalledWith(
                expect.objectContaining({
                    channel: 'test-channel',
                    data: { event: 'test', value: 123 },
                })
            );
        });

        test('should handle non-JSON messages gracefully', async () => {
            const channel = 'test-channel';
            const message = 'not-json-message';

            await messageHandler(channel, message);

            expect(mockOutputService.sendEvent).toHaveBeenCalledWith(
                expect.objectContaining({
                    channel: 'test-channel',
                    data: expect.objectContaining({
                        raw_message: 'not-json-message',
                        parse_error: true,
                    }),
                })
            );
        });

        test('should enrich messages with metadata', async () => {
            const channel = 'test-channel';
            const message = JSON.stringify({ data: 'test' });

            await messageHandler(channel, message);

            const sentEvent = mockOutputService.sendEvent.mock.calls[0][0];
            expect(sentEvent.receivedAt).toBeDefined();
            expect(sentEvent.messageNumber).toBeDefined();
            expect(sentEvent.channel).toBe('test-channel');
        });

        test('should increment messagesReceived counter', async () => {
            const channel = 'test-channel';
            const message = JSON.stringify({ data: 'test' });

            await messageHandler(channel, message);
            await messageHandler(channel, message);
            await messageHandler(channel, message);

            expect(bridge.messagesReceived).toBe(3);
        });

        test('should track forwarded messages', async () => {
            mockOutputService.sendEvent.mockResolvedValue(true);
            const channel = 'test-channel';
            const message = JSON.stringify({ data: 'test' });

            await messageHandler(channel, message);

            expect(bridge.messagesForwarded).toBe(1);
        });

        test('should track failed messages', async () => {
            mockOutputService.sendEvent.mockResolvedValue(false);
            const channel = 'test-channel';
            const message = JSON.stringify({ data: 'test' });

            await messageHandler(channel, message);

            expect(bridge.messagesFailed).toBe(1);
        });

        test('should handle output service errors gracefully', async () => {
            mockOutputService.sendEvent.mockRejectedValue(new Error('Output error'));
            const channel = 'test-channel';
            const message = JSON.stringify({ data: 'test' });

            await messageHandler(channel, message);

            expect(bridge.messagesFailed).toBe(1);
        });
    });

    describe('Error Handling', () => {
        let errorHandler;

        beforeEach(async () => {
            await bridge.start();
            const onCalls = mockRedisClient.on.mock.calls;
            const errorCall = onCalls.find(call => call[0] === 'error');
            errorHandler = errorCall[1];
        });

        test('should handle Redis errors without crashing', () => {
            const error = new Error('Connection lost');

            expect(() => {
                errorHandler(error);
            }).not.toThrow();
        });
    });

    describe('Reconnection Logic', () => {
        test('should implement retry strategy with exponential backoff', async () => {
            await bridge.start();

            const retryStrategy = Redis.mock.calls[0][0].retryStrategy;

            // Test retry delays
            const delay1 = retryStrategy(1);
            const delay2 = retryStrategy(2);
            const delay3 = retryStrategy(3);

            expect(delay1).toBeLessThan(delay2);
            expect(delay2).toBeLessThan(delay3);
        });

        test('should stop retrying after max attempts', async () => {
            await bridge.start();

            const retryStrategy = Redis.mock.calls[0][0].retryStrategy;

            const result = retryStrategy(11); // Exceeds max (10)

            expect(result).toBeInstanceOf(Error);
        });

        test('should cap delay at maximum (plus jitter)', async () => {
            await bridge.start();

            const retryStrategy = Redis.mock.calls[0][0].retryStrategy;

            // Test with attempt number within max attempts (10)
            // but large enough to trigger max delay
            const delay = retryStrategy(8); // Large but < max attempts

            // Max delay is 30000ms, but jitter adds up to 1000ms more
            expect(delay).toBeLessThanOrEqual(31000); // Max delay + max jitter
            expect(delay).toBeGreaterThanOrEqual(30000); // Should be at max
        });
    });

    describe('Statistics', () => {
        test('should return current statistics', async () => {
            await bridge.start();

            const stats = bridge.getStats();

            expect(stats.isRunning).toBe(true);
            expect(stats.messagesReceived).toBe(0);
            expect(stats.messagesForwarded).toBe(0);
            expect(stats.messagesFailed).toBe(0);
        });

        test('should calculate success rate', async () => {
            bridge.messagesReceived = 100;
            bridge.messagesForwarded = 95;

            const stats = bridge.getStats();

            expect(stats.successRate).toBe('95.00%');
        });

        test('should include output service stats', async () => {
            await bridge.start();

            const stats = bridge.getStats();

            expect(stats.outputServiceStats).toBeDefined();
        });
    });

    describe('Graceful Shutdown', () => {
        test('should close output service on stop', async () => {
            await bridge.start();
            await bridge.stop();

            expect(mockOutputService.close).toHaveBeenCalled();
        });

        test('should disconnect Redis client on stop', async () => {
            await bridge.start();
            await bridge.stop();

            expect(mockRedisClient.disconnect).toHaveBeenCalled();
        });

        test('should set isRunning to false on stop', async () => {
            await bridge.start();
            await bridge.stop();

            expect(bridge.isRunning).toBe(false);
        });

        test('should handle errors during shutdown gracefully', async () => {
            await bridge.start();
            mockOutputService.close.mockRejectedValue(new Error('Close error'));

            await expect(bridge.stop()).resolves.not.toThrow();
        });
    });
});
