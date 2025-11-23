# Redis to Event Hub Bridge

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen)](https://nodejs.org/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)
[![Design Patterns](https://img.shields.io/badge/Design%20Patterns-6-orange)]()

> A robust, enterprise-grade Node.js bridge service that forwards messages from Redis Pub/Sub to Azure Event Hubs (or other outputs) with comprehensive error handling, retry logic, and design patterns.

## ✨ Features

- 🏗️ **6 Design Patterns** - Strategy, Factory, Dependency Injection, Singleton, Observer, Builder
- ⚙️ **Highly Configurable** - 40+ environment variables with validation
- 🔄 **Auto-Reconnection** - Exponential backoff with jitter
- 📊 **Batch Processing** - Efficient message batching
- 🔐 **Security** - Redis authentication and TLS support
- 📝 **Comprehensive Logging** - 5 log levels (ERROR, WARN, INFO, DEBUG, TRACE)
- 🧪 **Easy to Test** - Dependency injection makes mocking simple
- 🔌 **Extensible** - Easy to add new output types

## 🚀 Quick Start

### Prerequisites

- Node.js >= 14.0.0
- Redis server running

### Installation

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit configuration
nano .env
```

### Configuration

Minimal `.env` file:

```bash
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_CHANNEL=data-stream-channel
OUTPUT_TYPE=mock
MOCK_OUTPUT_FILE=./output_events.jsonl
LOG_LEVEL=INFO
```

See [.env.example](.env.example) for all available options.

### Run

```bash
# Production mode
npm start

# Development mode (verbose logging)
npm run dev
```

### Test

In another terminal:

```bash
# Publish test message
redis-cli PUBLISH data-stream-channel '{"event":"test","value":123}'

# View output
cat output_events.jsonl | jq
```

## 📚 Documentation

Comprehensive documentation is available:

| Document | Description | Read Time |
|----------|-------------|-----------|
| [QUICK_REFERENCE.md](QUICK_REFERENCE.md) | Quick lookups and common tasks | 5 min |
| [GUIDE.md](GUIDE.md) | Complete architecture guide | 20 min |
| [DESIGN_PATTERNS.md](DESIGN_PATTERNS.md) | Design patterns explained | 15 min |
| [WALKTHROUGH.md](WALKTHROUGH.md) | Step-by-step code execution | 30 min |
| [IMPROVEMENTS.md](IMPROVEMENTS.md) | What was improved | 10 min |

**Start here:** [QUICK_REFERENCE.md](QUICK_REFERENCE.md) for immediate productivity.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      index.js                            │
│                 (Orchestrator + DI)                      │
└──────────────┬──────────────────────────────────────────┘
               │
        ┌──────┴────────┐
        ▼               ▼
   ┌─────────┐    ┌──────────────┐
   │ Config  │    │ServiceFactory│
   │(Builder)│    │  (Factory)   │
   └─────────┘    └──────┬───────┘
                         │
                         ▼
              ┌────────────────────┐
              │  OutputStrategy    │ (Strategy)
              │   (Abstract Base)  │
              └─────────┬──────────┘
                        │
              ┌─────────┴──────────┐
              ▼                    ▼
        ┌──────────┐        ┌───────────┐
        │EventHub  │        │  Azure    │
        │  Mock    │        │ EventHub  │
        └──────────┘        └───────────┘
              │                    │
              └─────────┬──────────┘
                        │ Injected into
                        ▼
              ┌───────────────────┐
              │   RedisBridge     │ (Observer)
              │  (Core Service)   │
              └───────────────────┘
```

## 🎨 Design Patterns

This project demonstrates 6 professional design patterns:

1. **Strategy Pattern** - Interchangeable output services
2. **Factory Pattern** - Centralized service creation
3. **Dependency Injection** - Loose coupling
4. **Singleton Pattern** - Single logger instance
5. **Observer Pattern** - Event-driven message handling
6. **Builder Pattern** - Complex configuration construction

See [DESIGN_PATTERNS.md](DESIGN_PATTERNS.md) for detailed explanations.

## 📁 Project Structure

```
├── index.js                      # Application entry point
├── config.js                     # Configuration with validation
├── package.json                  # Dependencies and scripts
│
├── services/                     # Business logic layer
│   ├── OutputStrategy.js         # Abstract base for outputs
│   ├── EventhubMock.js          # File-based mock output
│   ├── RedisBridge.js           # Core Redis subscriber
│   └── ServiceFactory.js        # Factory for creating services
│
├── utils/                        # Utility layer
│   ├── constants.js             # Application-wide constants
│   └── Logger.js                # Logging utility (Singleton)
│
└── docs/                         # Documentation
    ├── QUICK_REFERENCE.md       # Quick lookups
    ├── GUIDE.md                 # Comprehensive guide
    ├── DESIGN_PATTERNS.md       # Pattern explanations
    ├── WALKTHROUGH.md           # Complete walkthrough
    └── IMPROVEMENTS.md          # Enhancement summary
```

## ⚙️ Configuration

### Environment Variables

**Redis:**
- `REDIS_HOST` - Redis server hostname (default: 127.0.0.1)
- `REDIS_PORT` - Redis server port (default: 6379)
- `REDIS_CHANNEL` - Pub/Sub channel to subscribe to
- `REDIS_PASSWORD` - Optional authentication
- `REDIS_USE_TLS` - Enable TLS/SSL (default: false)

**Output:**
- `OUTPUT_TYPE` - Output service type: `mock`, `azure`, `kafka`
- `MOCK_OUTPUT_FILE` - File path for mock output (JSONL format)
- `EVENT_HUB_CONNECTION_STRING` - Azure Event Hubs connection
- `EVENT_HUB_NAME` - Azure Event Hub name

**Logging:**
- `LOG_LEVEL` - Log verbosity: `ERROR`, `WARN`, `INFO`, `DEBUG`, `TRACE`

**Batching:**
- `BATCH_ENABLED` - Enable message batching (default: true)
- `BATCH_MAX_SIZE` - Maximum messages per batch (default: 100)
- `BATCH_TIMEOUT_MS` - Batch timeout in milliseconds (default: 5000)

**Retry:**
- `RETRY_MAX_ATTEMPTS` - Max reconnection attempts (default: 10)
- `RETRY_INITIAL_DELAY_MS` - Initial retry delay (default: 1000)
- `RETRY_MAX_DELAY_MS` - Maximum retry delay (default: 30000)

See [.env.example](.env.example) for complete list.

## 🧪 Testing

Comprehensive test coverage using Jest.

### Run All Tests
```bash
npm test
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

### Run Unit Tests Only
```bash
npm run test:unit
```

### Run Integration Tests Only
```bash
npm run test:integration
```

### View Coverage Report
```bash
npm test
# Open coverage/lcov-report/index.html
```

**Test Structure:**
- Unit tests: `test/unit/` - Logger, OutputStrategy, EventHubMock, ServiceFactory, config
- Integration tests: `test/integration/` - RedisBridge with mocked dependencies

**Coverage:** See [TESTING.md](TESTING.md) for detailed testing guide.

## 🔧 Usage Examples

### Basic Usage

```javascript
const config = require('./config');
const ServiceFactory = require('./services/ServiceFactory');
const RedisBridge = require('./services/RedisBridge');

// Create output service (Factory pattern)
const outputService = ServiceFactory.createOutputService(config);

// Create bridge (Dependency Injection)
const bridge = new RedisBridge(config.redis, outputService);

// Start the bridge
await bridge.start();
```

### Adding a New Output Type

```javascript
// 1. Create new strategy
class KafkaProducer extends OutputStrategy {
    async initialize() { /* Connect to Kafka */ }
    async sendEvent(data) { /* Send message */ }
    async close() { /* Cleanup */ }
}

// 2. Add to factory
case OUTPUT_TYPES.KAFKA:
    return new KafkaProducer(config.kafka);

// 3. Configure and use
OUTPUT_TYPE=kafka
KAFKA_BROKERS=localhost:9092
KAFKA_TOPIC=my-topic
```

## 🐛 Troubleshooting

### Common Issues

**Application won't start:**
- Check Redis is running: `redis-cli ping`
- Verify `.env` file exists and has required variables
- Check Node.js version: `node --version` (>= 14.0.0)

**No messages received:**
- Verify channel name matches
- Check subscription logs for success message
- Increase log level: `LOG_LEVEL=DEBUG`

**Output file not created:**
- Check file path is valid
- Verify write permissions
- Look for errors in logs

See [QUICK_REFERENCE.md](QUICK_REFERENCE.md) for more troubleshooting tips.

## 📊 Monitoring

Statistics are logged throughout the application lifecycle:

```
Final Statistics: {
  isRunning: false,
  messagesReceived: 1234,
  messagesForwarded: 1230,
  messagesFailed: 4,
  successRate: '99.68%'
}
```

## 🧪 Testing

While unit tests are not yet implemented, the architecture supports easy testing:

```javascript
// Example: Test RedisBridge with mock output
const mockOutput = {
    initialize: jest.fn(),
    sendEvent: jest.fn().mockResolvedValue(true),
    close: jest.fn(),
};

const bridge = new RedisBridge(config.redis, mockOutput);
// Test bridge behavior
```

## 🤝 Contributing

Contributions are welcome! Please:

1. Read the documentation to understand the architecture
2. Follow the existing design patterns
3. Add comprehensive inline comments
4. Update documentation if needed

## 📄 License

ISC License - see [LICENSE](LICENSE) file for details.

## 👤 Author

**Raghu Raghavan**

## 🙏 Acknowledgments

- Design patterns inspired by Gang of Four
- Redis client powered by [ioredis](https://github.com/luin/ioredis)
- Environment management by [dotenv](https://github.com/motdotla/dotenv)

---

## 🎓 Learning Resources

This project is designed to be educational. It demonstrates:

- ✅ Professional software architecture
- ✅ Industry-standard design patterns
- ✅ Enterprise-grade error handling
- ✅ Comprehensive documentation practices
- ✅ Configuration-driven design
- ✅ SOLID principles

**Perfect for:**
- Learning design patterns
- Understanding enterprise Node.js architecture
- Building production-ready services
- Portfolio/resume projects

---

**Start Reading:** [QUICK_REFERENCE.md](QUICK_REFERENCE.md) → [GUIDE.md](GUIDE.md) → [DESIGN_PATTERNS.md](DESIGN_PATTERNS.md) → [WALKTHROUGH.md](WALKTHROUGH.md)

**Happy Coding! 🚀**
