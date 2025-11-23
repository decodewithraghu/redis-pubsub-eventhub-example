# Redis to Event Hub Bridge - Step-by-Step Guide

## 📚 Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Design Patterns Explained](#design-patterns-explained)
3. [Code Structure](#code-structure)
4. [Configuration Guide](#configuration-guide)
5. [How It Works (Step-by-Step)](#how-it-works-step-by-step)
6. [Running the Application](#running-the-application)
7. [Understanding Each Component](#understanding-each-component)

---

## 🏗️ Architecture Overview

This application is a **message bridge** that:
- Listens to Redis Pub/Sub messages
- Forwards them to an output service (Mock file, Azure Event Hubs, etc.)
- Handles errors, reconnections, and graceful shutdowns

### High-Level Flow
```
┌─────────┐      ┌──────────────┐      ┌────────────────┐      ┌──────────────┐
│  Redis  │ ───> │ RedisBridge  │ ───> │ OutputStrategy │ ───> │  Destination │
│ Pub/Sub │      │ (Subscriber) │      │   (Mock/Azure) │      │  (File/Cloud)│
└─────────┘      └──────────────┘      └────────────────┘      └──────────────┘
```

---

## 🎨 Design Patterns Explained

### 1. **Strategy Pattern** (OutputStrategy)
**What:** Defines a family of algorithms (output methods) and makes them interchangeable.

**Why:** You can switch between Mock, Azure, Kafka without changing the core logic.

**Example:**
```javascript
// All output services implement the same interface
class OutputStrategy {
    async sendEvent(data) { /* ... */ }
    async close() { /* ... */ }
}

// Concrete implementations
class EventHubMock extends OutputStrategy { /* File output */ }
class AzureEventHub extends OutputStrategy { /* Azure output */ }
```

### 2. **Factory Pattern** (ServiceFactory)
**What:** Provides a centralized way to create objects based on configuration.

**Why:** Client code doesn't need if/else chains to create the right service.

**Example:**
```javascript
// Instead of this:
let service;
if (type === 'mock') {
    service = new EventHubMock(...);
} else if (type === 'azure') {
    service = new AzureEventHub(...);
}

// We do this:
const service = ServiceFactory.createOutputService(config);
```

### 3. **Dependency Injection**
**What:** Services are "injected" (passed in) rather than created internally.

**Why:** Makes testing easier, reduces coupling, follows SOLID principles.

**Example:**
```javascript
// Bad: RedisBridge creates its own output service
class RedisBridge {
    constructor() {
        this.output = new EventHubMock(); // Hard-coded!
    }
}

// Good: RedisBridge receives output service
class RedisBridge {
    constructor(config, outputService) { // Injected!
        this.output = outputService;
    }
}
```

### 4. **Singleton Pattern** (Logger)
**What:** Ensures only one instance of a class exists.

**Why:** Centralized logging configuration, shared across all modules.

**Example:**
```javascript
// No matter how many times you require it, same instance
const logger = require('./utils/Logger');
logger.setLevel('DEBUG'); // Affects all modules
```

### 5. **Observer Pattern** (Event Handling)
**What:** Objects subscribe to events and react when they occur.

**Why:** Decouples event producers (Redis) from consumers (Bridge).

**Example:**
```javascript
// Subscribe to events
subscriber.on('message', handleMessage);
subscriber.on('error', handleError);

// When Redis publishes, handleMessage is called automatically
```

---

## 📁 Code Structure

```
redis-pubsub-eventhub-example/
├── config.js                    # Configuration with validation
├── index.js                     # Application entry point
├── package.json                 # Dependencies
│
├── services/                    # Business logic layer
│   ├── OutputStrategy.js        # Abstract base class
│   ├── EventhubMock.js         # File-based implementation
│   ├── RedisBridge.js          # Core Redis subscriber
│   └── ServiceFactory.js       # Factory for creating services
│
└── utils/                       # Utility layer
    ├── constants.js             # Application constants
    └── Logger.js                # Logging utility (Singleton)
```

---

## ⚙️ Configuration Guide

### Environment Variables

Create a `.env` file in the project root:

```bash
# Redis Configuration
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_CHANNEL=data-stream-channel
REDIS_PASSWORD=                  # Optional: Redis password
REDIS_USE_TLS=false             # Optional: Use TLS/SSL

# Output Configuration
OUTPUT_TYPE=mock                 # Options: mock, azure
MOCK_OUTPUT_FILE=./output_events.jsonl

# Azure Event Hubs (if OUTPUT_TYPE=azure)
EVENT_HUB_CONNECTION_STRING=
EVENT_HUB_NAME=

# Logging
LOG_LEVEL=INFO                   # Options: ERROR, WARN, INFO, DEBUG, TRACE

# Batch Settings
BATCH_ENABLED=true
BATCH_MAX_SIZE=100
BATCH_TIMEOUT_MS=5000

# Retry Settings
RETRY_MAX_ATTEMPTS=10
RETRY_INITIAL_DELAY_MS=1000
RETRY_MAX_DELAY_MS=30000
```

### Configuration Hierarchy

1. **Environment variables** (highest priority)
2. **.env file** values
3. **Default values** in constants.js (fallback)

---

## 🔄 How It Works (Step-by-Step)

### Startup Sequence

```
1. Load .env file
   ↓
2. Parse and validate configuration
   ↓
3. Configure logger with log level
   ↓
4. Display startup banner
   ↓
5. Create output service (using Factory)
   ↓
6. Create RedisBridge (inject output service)
   ↓
7. Register shutdown handlers (Ctrl+C, SIGTERM)
   ↓
8. Start the bridge:
   - Initialize output service
   - Connect to Redis
   - Subscribe to channel
   ↓
9. Application running - listening for messages
```

### Message Processing Flow

```
1. Redis publishes message to channel
   ↓
2. Redis client receives message (Observer pattern)
   ↓
3. 'message' event fires
   ↓
4. RedisBridge._handleMessage() is called
   ↓
5. Parse message (JSON)
   ↓
6. Enrich with metadata (timestamp, channel, etc.)
   ↓
7. Call outputService.sendEvent(data)
   ↓
8. Output service writes to file/cloud
   ↓
9. Return success/failure status
   ↓
10. Update statistics
   ↓
11. Log result
   ↓
12. Ready for next message
```

### Shutdown Sequence

```
1. User presses Ctrl+C or sends SIGTERM
   ↓
2. Shutdown handler triggered
   ↓
3. Set isShuttingDown flag (prevent double shutdown)
   ↓
4. Call bridge.stop()
   ↓
5. Stop accepting new messages
   ↓
6. Close output service (flush pending messages)
   ↓
7. Disconnect from Redis
   ↓
8. Log final statistics
   ↓
9. Exit process with code 0 (success)
```

---

## 🚀 Running the Application

### Prerequisites

```bash
# 1. Install Node.js (v14 or higher)
node --version

# 2. Install dependencies
npm install

# 3. Ensure Redis is running
redis-cli ping
# Should respond: PONG
```

### Start the Application

```bash
# Method 1: Using npm
npm start

# Method 2: Direct node
node index.js
```

### Test Message Publishing

In another terminal:

```bash
# Connect to Redis CLI
redis-cli

# Publish a test message
PUBLISH data-stream-channel '{"event":"test","value":123}'

# Publish multiple messages
PUBLISH data-stream-channel '{"event":"user_login","userId":"abc123"}'
PUBLISH data-stream-channel '{"event":"order_placed","orderId":"order-456"}'
```

### Check Output

```bash
# View the output file
cat output_events.jsonl

# Or use jq for pretty printing
cat output_events.jsonl | jq
```

### Stop the Application

```bash
# Press Ctrl+C in the terminal running the application
# You'll see graceful shutdown messages
```

---

## 📖 Understanding Each Component

### 1. config.js - Configuration Manager

**Purpose:** Centralized configuration with validation.

**Key Concepts:**
- **Builder Pattern:** Constructs complex config step-by-step
- **Validation:** Ensures required fields exist and are valid
- **Defaults:** Falls back to sensible defaults

**How to read it:**
```javascript
// Step 1: ConfigBuilder builds each section
const redis = ConfigBuilder.buildRedisConfig();

// Step 2: ConfigValidator validates values
ConfigValidator.validatePort(port);

// Step 3: All sections combined into final config
const config = { redis, output, retry, ... };
```

### 2. utils/Logger.js - Logging Utility

**Purpose:** Centralized, consistent logging.

**Key Concepts:**
- **Singleton Pattern:** One logger instance for entire app
- **Log Levels:** Filter messages by severity
- **Formatting:** Consistent timestamp and level prefixes

**Usage:**
```javascript
const logger = require('./utils/Logger');

logger.error('Critical failure!');     // Always shown
logger.warn('Something suspicious');   // Shown if level >= WARN
logger.info('Normal operation');       // Shown if level >= INFO
logger.debug('Detailed info');         // Shown if level >= DEBUG
logger.trace('Very detailed');         // Shown if level >= TRACE
```

### 3. utils/constants.js - Constants

**Purpose:** Single source of truth for all magic numbers and strings.

**Why?** 
- Easy to change behavior without hunting through code
- Prevents typos and inconsistencies
- Self-documenting

**Usage:**
```javascript
const { RETRY_SETTINGS, OUTPUT_TYPES } = require('./utils/constants');

// Instead of hardcoding:
const maxRetries = 10;

// Use constant:
const maxRetries = RETRY_SETTINGS.MAX_ATTEMPTS;
```

### 4. services/OutputStrategy.js - Abstract Base

**Purpose:** Defines the contract that all output services must follow.

**Key Concepts:**
- **Abstract Class:** Cannot be instantiated directly
- **Contract:** Subclasses must implement specific methods
- **Polymorphism:** All implementations can be used interchangeably

**Methods to implement:**
```javascript
async initialize()    // Set up connection
async sendEvent()     // Send single message
async sendBatch()     // Send multiple messages (optional)
async close()         // Clean up resources
```

### 5. services/EventhubMock.js - Mock Implementation

**Purpose:** File-based mock for testing without external dependencies.

**How it works:**
1. Extends OutputStrategy
2. Implements required methods
3. Writes messages to JSONL file (one JSON per line)
4. Tracks statistics

**Why JSONL?**
- Each line is valid JSON
- Easy to parse line-by-line
- Append-only (safe for concurrent writes)

### 6. services/ServiceFactory.js - Factory

**Purpose:** Creates the right output service based on configuration.

**How it works:**
```javascript
// Examines config.output.type
switch (outputType) {
    case 'mock':
        return new EventHubMock(filePath);
    case 'azure':
        return new AzureEventHub(connectionString);
    // Easy to add more!
}
```

**Benefits:**
- Client code is simple: `ServiceFactory.createOutputService(config)`
- Adding new types only requires changes in one place
- Configuration drives behavior

### 7. services/RedisBridge.js - Core Service

**Purpose:** The heart of the application - bridges Redis to output.

**Key Responsibilities:**
1. Connect to Redis
2. Subscribe to channel
3. Listen for messages
4. Parse and enrich messages
5. Forward to output service
6. Handle errors and reconnections

**Event Handlers:**
```javascript
subscriber.on('connect', () => { /* Subscribe to channel */ });
subscriber.on('message', (channel, msg) => { /* Forward message */ });
subscriber.on('error', (err) => { /* Log error */ });
subscriber.on('close', () => { /* Mark disconnected */ });
```

**Retry Strategy:**
- Exponential backoff: 1s → 2s → 4s → 8s → ...
- Jitter: Random delay added to prevent thundering herd
- Max attempts: Gives up after configurable limit

### 8. index.js - Entry Point

**Purpose:** Orchestrates the entire application.

**Flow:**
1. Load configuration
2. Configure logger
3. Display banner
4. Create services (Factory + DI)
5. Setup shutdown handlers
6. Start the bridge
7. Run until shutdown signal

**Error Handling:**
- Top-level try/catch for startup errors
- Graceful shutdown on signals
- Timeout for cleanup (prevents hanging)

---

## 🎓 Learning Path

### If you're new to this codebase:

1. **Start with:** `index.js` - See the big picture
2. **Then read:** `config.js` - Understand configuration
3. **Next:** `services/OutputStrategy.js` - Learn the interface
4. **Then:** `services/EventhubMock.js` - See an implementation
5. **Then:** `services/RedisBridge.js` - Understand the core logic
6. **Finally:** `utils/` - Explore utilities

### If you want to add a feature:

**Add new output type (e.g., Kafka):**
1. Create `services/KafkaProducer.js` extending `OutputStrategy`
2. Implement required methods
3. Add to `ServiceFactory.createOutputService()`
4. Add Kafka config to `config.js`
5. Add constants to `utils/constants.js`

**Add new configuration option:**
1. Add to `utils/constants.js` with default value
2. Add to `config.js` ConfigBuilder
3. Add validation if needed
4. Use in appropriate service

---

## 🐛 Troubleshooting

### Application won't start
- Check Redis is running: `redis-cli ping`
- Verify .env file exists and has correct values
- Check file permissions for output file

### Messages not being received
- Verify channel name matches: `redis-cli PUBSUB CHANNELS`
- Check Redis logs for subscription issues
- Increase log level to DEBUG: `LOG_LEVEL=DEBUG`

### Output file not created
- Check file path is valid
- Verify write permissions
- Look for errors in console

---

## 📝 Summary

This application demonstrates professional software engineering practices:

✅ **Separation of Concerns** - Each class has one responsibility  
✅ **Design Patterns** - Industry-standard solutions  
✅ **Configuration-Driven** - Behavior controlled by config  
✅ **Error Handling** - Graceful degradation and recovery  
✅ **Logging** - Comprehensive visibility  
✅ **Documentation** - Step-by-step explanations  
✅ **Extensibility** - Easy to add new features  

The code is structured to be **readable**, **maintainable**, and **scalable**.
