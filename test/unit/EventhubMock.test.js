/**
 * ============================================================================
 * EVENTHUB MOCK UNIT TESTS
 * ============================================================================
 * 
 * Tests the EventHubMock implementation (Strategy Pattern)
 * 
 * Test Coverage:
 * - File initialization
 * - Event sending (single and batch)
 * - Event enrichment
 * - Error handling
 * - Statistics tracking
 */

const EventHubMock = require('../../services/EventhubMock');
const fs = require('fs/promises');
const path = require('path');

// Mock fs module
jest.mock('fs/promises');

describe('EventHubMock (Strategy Implementation)', () => {
    let mock;
    const testFilePath = './test_output.jsonl';

    beforeEach(() => {
        mock = new EventHubMock(testFilePath);
        jest.clearAllMocks();
    });

    describe('Initialization', () => {
        test('should create instance with file path', () => {
            expect(mock).toBeInstanceOf(EventHubMock);
            expect(mock.filePath).toBe(testFilePath);
            expect(mock.name).toBe('EventHubMock');
        });

        test('should use default file path if not provided', () => {
            const defaultMock = new EventHubMock();
            expect(defaultMock.filePath).toContain('output_events.jsonl');
        });

        test('initialize() should verify file access', async () => {
            fs.appendFile.mockResolvedValue();

            await mock.initialize();

            expect(fs.appendFile).toHaveBeenCalledWith(testFilePath, '', expect.any(Object));
            expect(mock.isConnected).toBe(true);
        });

        test('initialize() should throw error on file access failure', async () => {
            fs.appendFile.mockRejectedValue(new Error('Permission denied'));

            await expect(mock.initialize()).rejects.toThrow('Mock initialization failed');
            expect(mock.isConnected).toBe(false);
        });
    });

    describe('Send Event', () => {
        beforeEach(async () => {
            fs.appendFile.mockResolvedValue();
            await mock.initialize();
        });

        test('should send event successfully', async () => {
            const eventData = {
                channel: 'test-channel',
                data: { value: 123 }
            };

            const result = await mock.sendEvent(eventData);

            expect(result).toBe(true);
            expect(fs.appendFile).toHaveBeenCalledTimes(2); // init + send
            expect(mock.messagesSent).toBe(1);
        });

        test('should enrich event with metadata', async () => {
            const eventData = {
                channel: 'test-channel',
                data: { value: 123 }
            };

            await mock.sendEvent(eventData);

            const writeCall = fs.appendFile.mock.calls[1];
            const writtenData = writeCall[1];
            const parsedEvent = JSON.parse(writtenData.trim());

            expect(parsedEvent.source).toBe('RedisBridge');
            expect(parsedEvent.timestamp).toBeDefined();
            expect(parsedEvent.eventId).toBeDefined();
            expect(parsedEvent.channel).toBe('test-channel');
            expect(parsedEvent.data).toEqual({ value: 123 });
        });

        test('should write JSONL format (JSON + newline)', async () => {
            await mock.sendEvent({ data: 'test' });

            const writeCall = fs.appendFile.mock.calls[1];
            const writtenData = writeCall[1];

            expect(writtenData).toMatch(/}\n$/); // Ends with newline
            expect(() => JSON.parse(writtenData.trim())).not.toThrow();
        });

        test('should return false if not initialized', async () => {
            const uninitializedMock = new EventHubMock(testFilePath);

            const result = await uninitializedMock.sendEvent({ data: 'test' });

            expect(result).toBe(false);
            expect(uninitializedMock.errorCount).toBe(1);
        });

        test('should handle write errors gracefully', async () => {
            fs.appendFile.mockRejectedValueOnce(new Error('Disk full'));

            const result = await mock.sendEvent({ data: 'test' });

            expect(result).toBe(false);
            expect(mock.errorCount).toBe(1);
        });

        test('should increment messagesSent counter', async () => {
            await mock.sendEvent({ data: 'test1' });
            await mock.sendEvent({ data: 'test2' });
            await mock.sendEvent({ data: 'test3' });

            expect(mock.messagesSent).toBe(3);
        });
    });

    describe('Send Batch', () => {
        beforeEach(async () => {
            fs.appendFile.mockResolvedValue();
            await mock.initialize();
        });

        test('should send batch of events', async () => {
            const events = [
                { channel: 'test', data: { id: 1 } },
                { channel: 'test', data: { id: 2 } },
                { channel: 'test', data: { id: 3 } }
            ];

            const result = await mock.sendBatch(events);

            expect(result).toBe(3);
            expect(mock.messagesSent).toBe(3);
        });

        test('should write all events in single operation', async () => {
            const events = [
                { data: { id: 1 } },
                { data: { id: 2 } }
            ];

            await mock.sendBatch(events);

            // init + batch (not multiple calls)
            expect(fs.appendFile).toHaveBeenCalledTimes(2);
        });

        test('should return 0 for empty batch', async () => {
            const result = await mock.sendBatch([]);

            expect(result).toBe(0);
        });

        test('should return 0 if not initialized', async () => {
            const uninitializedMock = new EventHubMock(testFilePath);

            const result = await uninitializedMock.sendBatch([{ data: 'test' }]);

            expect(result).toBe(0);
        });

        test('should handle batch write errors', async () => {
            fs.appendFile.mockRejectedValueOnce(new Error('Write failed'));

            const events = [{ data: 1 }, { data: 2 }];
            const result = await mock.sendBatch(events);

            expect(result).toBe(0);
            expect(mock.errorCount).toBe(2); // All events failed
        });
    });

    describe('Close', () => {
        test('should close successfully', async () => {
            fs.appendFile.mockResolvedValue();
            await mock.initialize();

            await mock.close();

            expect(mock.isConnected).toBe(false);
        });

        test('should log final statistics on close', async () => {
            fs.appendFile.mockResolvedValue();
            await mock.initialize();
            mock.messagesSent = 100;

            await mock.close();

            // Should have logged stats (implementation logs them)
            expect(mock.isConnected).toBe(false);
        });
    });

    describe('Get File Path', () => {
        test('should return configured file path', () => {
            expect(mock.getFilePath()).toBe(testFilePath);
        });
    });

    describe('Event ID Generation', () => {
        test('should generate unique event IDs', async () => {
            fs.appendFile.mockResolvedValue();
            await mock.initialize();

            await mock.sendEvent({ data: 'test1' });
            await mock.sendEvent({ data: 'test2' });

            const call1 = fs.appendFile.mock.calls[1][1];
            const call2 = fs.appendFile.mock.calls[2][1];

            const event1 = JSON.parse(call1.trim());
            const event2 = JSON.parse(call2.trim());

            expect(event1.eventId).not.toBe(event2.eventId);
        });

        test('event ID should contain timestamp and random component', async () => {
            fs.appendFile.mockResolvedValue();
            await mock.initialize();

            await mock.sendEvent({ data: 'test' });

            const writeCall = fs.appendFile.mock.calls[1][1];
            const event = JSON.parse(writeCall.trim());

            // Format: timestamp-random
            expect(event.eventId).toMatch(/^\d+-[a-z0-9]+$/);
        });
    });
});
