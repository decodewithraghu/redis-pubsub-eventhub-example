# Redis to Event Hub Bridge - Complete Code Walkthrough

## 🎯 What You'll Learn

This document provides a **complete step-by-step walkthrough** of how the application works, from startup to shutdown. Perfect for understanding the entire codebase flow.

---

## 📋 Prerequisites Knowledge

Before diving in, you should understand:
- Basic JavaScript (async/await, classes, modules)
- Node.js (require/module.exports)
- Redis Pub/Sub concepts
- Environment variables

---

## 🚀 Application Lifecycle (Complete Flow)

### Phase 1: Bootstrap (Application Startup)

```
User runs: npm start
    ↓
Node executes: node index.js
    ↓
index.js starts executing from top to bottom
    ↓
STEP 1: Import statements execute
```

**What happens in imports:**
```javascript
const config = require('./config');
```
This line executes `config.js` **immediately**:

1. `dotenv.config()` loads `.env` file into `process.env`
2. `ConfigBuilder.buildRedisConfig()` executes:
   - Reads `process.env.REDIS_HOST` (or uses default)
   - Validates port number (must be 1-65535)
   - Constructs redis config object
3. `ConfigBuilder.buildOutputConfig()` executes:
   - Reads `process.env.OUTPUT_TYPE`
   - Validates it's a valid type
   - Builds type-specific config
4. All builders run, config object is frozen (immutable)
5. Config is returned and stored in `config` variable

**Result:** `config` now contains validated configuration

---

```javascript
const logger = require('./utils/Logger');
```
This executes `Logger.js`:

1. Class definition is loaded
2. `Logger.getInstance()` at bottom executes
3. Creates singleton instance (first time only)
4. Returns the instance
5. Future imports return **same instance**

**Result:** `logger` is the singleton Logger instance

---

```javascript
const RedisBridge = require('./services/RedisBridge');
```
This loads the **class definition** only, doesn't create instance yet.

---

### Phase 2: Configuration

```javascript
logger.setLevel(config.logging.level);
```

**Step-by-step:**
1. Gets `config.logging.level` (number: 0-4)
2. Calls `logger.setLevel(level)`
3. Logger stores this as its threshold
4. Future log calls check: `if (levelNum > this.level) return;`

**Result:** Logger now only shows messages at or above configured level

---

### Phase 3: Display Banner

```javascript
displayBanner();
```

**Execution:**
1. Function reads config properties
2. Formats them into nice display
3. Calls `logger.info()` for each line
4. Logger checks level (INFO = 2)
5. If `this.level >= 2`, message is displayed
6. Timestamp and formatting applied
7. Output to console

**Result:** User sees startup banner with configuration

---

### Phase 4: Service Creation

```javascript
const outputService = ServiceFactory.createOutputService(config);
```

**Step-by-step execution:**

1. **Enter ServiceFactory.createOutputService()**
   ```javascript
   static createOutputService(config) {
       const outputType = config.output.type; // 'mock'
   ```

2. **Log creation:**
   ```javascript
   logger.info(`Creating output service of type: ${outputType}`);
   ```

3. **Switch statement evaluation:**
   ```javascript
   switch (outputType) {
       case OUTPUT_TYPES.MOCK: // Matches!
           return ServiceFactory._createMockService(config);
   ```

4. **Enter _createMockService():**
   ```javascript
   static _createMockService(config) {
       const filePath = config.output.mockFile; // './output_events.jsonl'
       return new EventHubMock(filePath);
   ```

5. **EventHubMock constructor executes:**
   ```javascript
   constructor(filePath) {
       super('EventHubMock'); // Call OutputStrategy constructor
       this.filePath = filePath;
       // ... initialization
   ```

6. **OutputStrategy constructor executes:**
   ```javascript
   constructor(name) {
       this.name = name; // 'EventHubMock'
       this.isConnected = false;
       this.messagesSent = 0;
       this.errorCount = 0;
   ```

**Result:** 
- `outputService` = new EventHubMock instance
- Instance has methods: `initialize()`, `sendEvent()`, `close()`
- Not initialized yet (isConnected = false)

---

```javascript
const bridge = new RedisBridge(config.redis, outputService);
```

**Step-by-step:**

1. **RedisBridge constructor executes:**
   ```javascript
   constructor(redisConfig, outputService) {
       this.redisConfig = redisConfig; // Store config
       this.outputService = outputService; // Store injected service!
       this.subscriber = null; // No Redis client yet
       this.isRunning = false;
       // ... other initialization
   ```

**Result:**
- `bridge` = new RedisBridge instance
- Has reference to `outputService` (dependency injection!)
- Not started yet (isRunning = false)
- No Redis connection yet (subscriber = null)

---

### Phase 5: Graceful Shutdown Setup

```javascript
const gracefulShutdown = async (signal) => { /* ... */ };
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
```

**What this does:**
1. Defines a function to handle shutdown
2. Registers it as event listener
3. When user presses Ctrl+C:
   - OS sends SIGINT signal to process
   - Node.js emits 'SIGINT' event
   - Our handler is called
   - Cleanup begins

**Result:** Shutdown handlers are registered, waiting for signals

---

### Phase 6: Start the Bridge

```javascript
await bridge.start();
```

This is where the **main logic** begins! Let's trace it step-by-step:

**Step 6.1: Initialize Output Service**
```javascript
async start() {
    logger.info('[RedisBridge] Starting...');
    await this.outputService.initialize();
```

**What happens in outputService.initialize():**
```javascript
async initialize() {
    // In EventHubMock
    await fs.appendFile(this.filePath, '', { encoding: 'utf8' });
    // Creates file if doesn't exist, verifies write access
    this.isConnected = true;
    logger.info('Successfully initialized');
}
```

**Result:** Output service is ready to receive events

---

**Step 6.2: Create Redis Client**
```javascript
this.subscriber = new Redis({
    host: config.redis.host,
    port: config.redis.port,
    // ... other options
    retryStrategy: this._handleReconnect,
});
```

**What happens:**
1. ioredis creates a new client instance
2. Connection starts automatically
3. Client begins connecting to Redis server
4. No events fired yet (connection not established)

---

**Step 6.3: Register Event Handlers**
```javascript
this.subscriber.on('connect', this._handleConnect);
this.subscriber.on('error', this._handleRedisError);
this.subscriber.on('message', this._handleMessage);
```

**What this does:**
1. Tells Redis client: "When 'connect' event happens, call this._handleConnect"
2. Same for 'error' and 'message' events
3. Handlers are registered but **not called yet**

**Observer Pattern in action:**
- **Subject:** Redis client
- **Observers:** Our handler functions
- **Events:** connect, error, message

---

**Step 6.4: Connection Establishes**

Redis client connects, fires 'connect' event:

```javascript
_handleConnect = () => {
    logger.info('Connected to Redis');
    this.reconnectAttempts = 0; // Reset retry counter
    
    // Subscribe to channel
    this.subscriber.subscribe(channel, (err) => {
        if (err) {
            logger.error('Fatal error subscribing:', err);
            process.exit(1);
        }
        
        this.isSubscribed = true;
        logger.info('Successfully subscribed to channel');
    });
}
```

**Execution flow:**
1. Client connects to Redis
2. 'connect' event fires
3. `_handleConnect()` is called
4. Calls `subscriber.subscribe(channel, callback)`
5. Redis server acknowledges subscription
6. Callback is called with err=null
7. Sets isSubscribed = true
8. Logs success

**Result:**
- Connected to Redis ✓
- Subscribed to channel ✓
- Ready to receive messages ✓

---

**Step 6.5: Application Running**

```javascript
await bridge.start(); // Completes
logger.info('Application is running!');
// Event loop keeps process alive
```

**Current state:**
- ✅ Config loaded and validated
- ✅ Logger configured
- ✅ Output service initialized
- ✅ Redis connected
- ✅ Channel subscribed
- ✅ Event handlers registered
- ✅ Graceful shutdown prepared

**Process is now idle**, waiting for:
- Messages from Redis (will trigger 'message' event)
- Errors (will trigger 'error' event)
- Shutdown signals (SIGINT/SIGTERM)

---

### Phase 7: Runtime (Message Processing)

Someone publishes a message to Redis:
```bash
redis-cli PUBLISH data-stream-channel '{"event":"test","value":123}'
```

**Here's what happens, step-by-step:**

**Step 7.1: Redis Receives Publish**
1. Redis server receives PUBLISH command
2. Finds all subscribers to 'data-stream-channel'
3. Sends message to our application

**Step 7.2: ioredis Receives Message**
1. Network data arrives at our application
2. ioredis parses the Redis protocol
3. Fires 'message' event with (channel, message)

**Step 7.3: Our Handler is Called**
```javascript
_handleMessage = async (channel, message) => {
    // message = '{"event":"test","value":123}'
    this.messagesReceived++; // Increment counter
```

**Step 7.4: Parse Message**
```javascript
const parsedData = this._parseMessage(message);

_parseMessage(message) {
    try {
        return JSON.parse(message);
        // Returns: { event: 'test', value: 123 }
    } catch (e) {
        // If not valid JSON, wrap it
        return { raw_message: message, parse_error: true };
    }
}
```

**Step 7.5: Enrich Event**
```javascript
const eventData = {
    channel: 'data-stream-channel',
    receivedAt: '2025-11-22T10:30:45.123Z',
    messageNumber: 1,
    data: { event: 'test', value: 123 }
};
```

**Step 7.6: Forward to Output Service**
```javascript
const success = await this.outputService.sendEvent(eventData);
```

**What happens in sendEvent():**
```javascript
async sendEvent(eventData) {
    // EventHubMock implementation
    
    // Enrich more
    const enrichedEvent = {
        source: 'RedisBridge',
        timestamp: '2025-11-22T10:30:45.123Z',
        eventId: '1732275045123-a1b2c3d4e',
        channel: 'data-stream-channel',
        receivedAt: '2025-11-22T10:30:45.123Z',
        messageNumber: 1,
        data: { event: 'test', value: 123 }
    };
    
    // Convert to JSON string with newline
    const jsonLine = JSON.stringify(enrichedEvent) + '\n';
    
    // Append to file
    await fs.appendFile(this.filePath, jsonLine);
    
    // Update metrics
    this.messagesSent++;
    
    return true; // Success!
}
```

**Step 7.7: Update Statistics**
```javascript
if (success) {
    this.messagesForwarded++;
    logger.debug('Message forwarded successfully');
} else {
    this.messagesFailed++;
    logger.warn('Failed to forward message');
}
```

**Step 7.8: Return to Idle**
- Handler completes
- Process returns to event loop
- Waits for next message

**Result:** Message successfully received, processed, and written to file!

**File contents:**
```json
{"source":"RedisBridge","timestamp":"2025-11-22T10:30:45.123Z","eventId":"1732275045123-a1b2c3d4e","channel":"data-stream-channel","receivedAt":"2025-11-22T10:30:45.123Z","messageNumber":1,"data":{"event":"test","value":123}}
```

---

### Phase 8: Shutdown (Graceful Cleanup)

User presses Ctrl+C:

**Step 8.1: Signal Received**
```
User presses Ctrl+C
    ↓
OS sends SIGINT to process
    ↓
Node.js emits 'SIGINT' event
    ↓
Our handler is called
```

**Step 8.2: Shutdown Handler Executes**
```javascript
const gracefulShutdown = async (signal) => {
    // Check if already shutting down
    if (isShuttingDown) return;
    isShuttingDown = true;
    
    logger.info('Received SIGINT - Initiating graceful shutdown');
```

**Step 8.3: Stop the Bridge**
```javascript
await bridge.stop();
```

**What happens in stop():**

**Step 8.3.1: Close Output Service**
```javascript
async stop() {
    this.isRunning = false; // Stop accepting new messages
    
    await this.outputService.close();
```

**In outputService.close():**
```javascript
async close() {
    // EventHubMock
    const stats = this.getStats();
    logger.info('Final stats:', stats);
    // Prints: { messagesSent: 1, errorCount: 0, ... }
    
    this.isConnected = false;
}
```

**Step 8.3.2: Disconnect from Redis**
```javascript
if (this.subscriber) {
    this.subscriber.disconnect();
    // Closes TCP connection to Redis
    // Stops receiving messages
    this.subscriber = null;
}
```

**Step 8.3.3: Log Final Stats**
```javascript
const stats = this.getStats();
logger.info('Final Statistics:', stats);
// Shows total messages received, forwarded, failed
```

**Step 8.4: Exit Process**
```javascript
process.exit(0); // Clean exit
```

**Result:**
- All connections closed ✓
- Pending messages flushed ✓
- Resources released ✓
- Statistics logged ✓
- Process terminated cleanly ✓

---

## 🔍 Error Handling Walkthrough

### Scenario: Redis Connection Fails

**Step 1: Connection Error Occurs**
```
Redis server is down
    ↓
ioredis tries to connect
    ↓
Connection times out
    ↓
'error' event fires
```

**Step 2: Error Handler Called**
```javascript
_handleRedisError = (error) => {
    logger.error('[Redis error]:', error.message);
    // Logs error but doesn't crash
}
```

**Step 3: Retry Strategy Kicks In**
```javascript
_handleReconnect = (times) => {
    this.reconnectAttempts = times;
    
    // Check max attempts
    if (times > RETRY_SETTINGS.MAX_ATTEMPTS) {
        return new Error('Max reconnection attempts exceeded');
        // This stops retrying and kills process
    }
    
    // Calculate delay with exponential backoff
    const delay = Math.min(
        1000 * Math.pow(2, times - 1), // 1s, 2s, 4s, 8s, ...
        30000 // Max 30 seconds
    );
    
    logger.warn(`Reconnection attempt ${times} in ${delay}ms`);
    
    return delay; // ioredis waits this long before retrying
}
```

**Retry Timeline:**
```
Attempt 1: Wait 1 second    (1000ms)
Attempt 2: Wait 2 seconds   (2000ms)
Attempt 3: Wait 4 seconds   (4000ms)
Attempt 4: Wait 8 seconds   (8000ms)
Attempt 5: Wait 16 seconds  (16000ms)
Attempt 6: Wait 30 seconds  (30000ms - capped)
...
Attempt 10: Wait 30 seconds
Attempt 11: Give up - exit process
```

---

## 📊 Complete Data Flow Diagram

```
┌──────────────┐
│ Redis Server │
└──────┬───────┘
       │ PUBLISH message
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│                      ioredis                            │
│  1. Receives network data                               │
│  2. Parses Redis protocol                               │
│  3. Fires 'message' event                               │
└──────┬──────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│            RedisBridge._handleMessage()                 │
│  1. messagesReceived++                                  │
│  2. parsedData = JSON.parse(message)                    │
│  3. eventData = { channel, receivedAt, data }           │
└──────┬──────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│         outputService.sendEvent(eventData)              │
│  (Could be EventHubMock, AzureEventHub, etc.)           │
└──────┬──────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│              EventHubMock.sendEvent()                   │
│  1. enrichedEvent = { source, timestamp, ...data }      │
│  2. jsonLine = JSON.stringify(enrichedEvent) + '\n'     │
│  3. fs.appendFile(filePath, jsonLine)                   │
│  4. messagesSent++                                      │
│  5. return true                                         │
└──────┬──────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│                  output_events.jsonl                    │
│  { "source": "RedisBridge", "data": {...} }             │
└─────────────────────────────────────────────────────────┘
```

---

## 💡 Key Takeaways

1. **Imports execute code:** When you `require()` a module, its code runs immediately
2. **Constructors initialize state:** They set up properties but don't start services
3. **start() begins operation:** Connections are made, subscriptions happen
4. **Events drive execution:** Most runtime activity is event-driven (Observer pattern)
5. **Dependencies are injected:** Services receive what they need, don't create it
6. **Shutdown is orderly:** Services close in reverse order of startup
7. **Errors are handled gracefully:** Retry logic prevents crashes from transient issues

---

## 🎓 Next Steps

Now that you understand the complete flow:

1. **Modify it:** Change log messages, add metrics
2. **Extend it:** Add a new output service type
3. **Debug it:** Set breakpoints and step through
4. **Test it:** Write unit tests for components
5. **Deploy it:** Run in production with real Redis and Azure

Remember: The best way to learn is to **change something and see what happens**!
