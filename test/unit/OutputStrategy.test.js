/**
 * ============================================================================
 * OUTPUT STRATEGY UNIT TESTS
 * ============================================================================
 * 
 * Tests the abstract OutputStrategy base class
 * 
 * Test Coverage:
 * - Abstract class behavior
 * - Interface contract
 * - Statistics tracking
 * - Health check functionality
 */

const OutputStrategy = require('../../services/OutputStrategy');

describe('OutputStrategy (Strategy Pattern)', () => {
    describe('Abstract Class Behavior', () => {
        test('should throw error when instantiated directly', () => {
            expect(() => {
                new OutputStrategy('Test');
            }).toThrow('OutputStrategy is abstract and cannot be instantiated directly');
        });

        test('should allow subclass instantiation', () => {
            class ConcreteStrategy extends OutputStrategy {
                async initialize() {}
                async sendEvent() {}
                async close() {}
            }

            const instance = new ConcreteStrategy('Concrete');
            expect(instance).toBeInstanceOf(OutputStrategy);
        });
    });

    describe('Interface Contract', () => {
        let strategy;

        beforeEach(() => {
            class TestStrategy extends OutputStrategy {
                constructor() {
                    super('TestStrategy');
                }
            }
            strategy = new TestStrategy();
        });

        test('should require initialize() implementation', async () => {
            await expect(strategy.initialize()).rejects.toThrow(
                'initialize() must be implemented by subclass'
            );
        });

        test('should require sendEvent() implementation', async () => {
            await expect(strategy.sendEvent({})).rejects.toThrow(
                'sendEvent() must be implemented by subclass'
            );
        });

        test('should require close() implementation', async () => {
            await expect(strategy.close()).rejects.toThrow(
                'close() must be implemented by subclass'
            );
        });
    });

    describe('Statistics Tracking', () => {
        let strategy;

        beforeEach(() => {
            class TestStrategy extends OutputStrategy {
                constructor() {
                    super('TestStrategy');
                }
                async initialize() { this.isConnected = true; }
                async sendEvent() { return true; }
                async close() { this.isConnected = false; }
            }
            strategy = new TestStrategy();
        });

        test('should initialize with zero stats', () => {
            expect(strategy.messagesSent).toBe(0);
            expect(strategy.errorCount).toBe(0);
            expect(strategy.isConnected).toBe(false);
        });

        test('getStats() should return current statistics', () => {
            strategy.messagesSent = 100;
            strategy.errorCount = 5;
            strategy.isConnected = true;

            const stats = strategy.getStats();

            expect(stats.messagesSent).toBe(100);
            expect(stats.errorCount).toBe(5);
            expect(stats.isConnected).toBe(true);
            expect(stats.successRate).toBe('95.00%');
        });

        test('should calculate success rate correctly', () => {
            strategy.messagesSent = 100;
            strategy.errorCount = 10;

            const stats = strategy.getStats();
            expect(stats.successRate).toBe('90.00%');
        });

        test('should handle zero messages sent', () => {
            const stats = strategy.getStats();
            expect(stats.successRate).toBe('N/A');
        });
    });

    describe('Default sendBatch Implementation', () => {
        let strategy;
        let sendEventSpy;

        beforeEach(() => {
            class TestStrategy extends OutputStrategy {
                constructor() {
                    super('TestStrategy');
                }
                async initialize() { this.isConnected = true; }
                async sendEvent() { return true; }
                async close() {}
            }
            strategy = new TestStrategy();
            sendEventSpy = jest.spyOn(strategy, 'sendEvent');
        });

        test('should call sendEvent for each event in batch', async () => {
            const events = [{ id: 1 }, { id: 2 }, { id: 3 }];

            const result = await strategy.sendBatch(events);

            expect(sendEventSpy).toHaveBeenCalledTimes(3);
            expect(result).toBe(3);
        });

        test('should count successful sends', async () => {
            sendEventSpy.mockResolvedValueOnce(true)
                       .mockResolvedValueOnce(false)
                       .mockResolvedValueOnce(true);

            const events = [{ id: 1 }, { id: 2 }, { id: 3 }];
            const result = await strategy.sendBatch(events);

            expect(result).toBe(2); // 2 successful
        });
    });

    describe('Health Check', () => {
        let strategy;

        beforeEach(() => {
            class TestStrategy extends OutputStrategy {
                constructor() {
                    super('TestStrategy');
                }
                async initialize() { this.isConnected = true; }
                async sendEvent() { return true; }
                async close() {}
            }
            strategy = new TestStrategy();
        });

        test('should return healthy when connected with low errors', async () => {
            strategy.isConnected = true;
            strategy.errorCount = 5;

            const health = await strategy.healthCheck();

            expect(health.healthy).toBe(true);
            expect(health.status).toBe('connected');
        });

        test('should return unhealthy when disconnected', async () => {
            strategy.isConnected = false;

            const health = await strategy.healthCheck();

            expect(health.healthy).toBe(false);
            expect(health.status).toBe('disconnected');
        });

        test('should return unhealthy with too many errors', async () => {
            strategy.isConnected = true;
            strategy.errorCount = 15;

            const health = await strategy.healthCheck();

            expect(health.healthy).toBe(false);
        });
    });
});
