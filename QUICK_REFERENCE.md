# 🚀 Quick Reference Guide

## Table of Contents
- [File Structure](#file-structure)
- [Environment Variables](#environment-variables)
- [Running the Application](#running-the-application)
- [Design Patterns Cheat Sheet](#design-patterns-cheat-sheet)
- [Common Tasks](#common-tasks)
- [Troubleshooting](#troubleshooting)

---

## 📁 File Structure

```
├── index.js                 # Application entry point
├── config.js                # Configuration with validation
├── package.json             # Dependencies and scripts
│
├── services/                # Business logic
│   ├── OutputStrategy.js    # Abstract base for outputs
│   ├── EventhubMock.js     # File-based mock output
│   ├── RedisBridge.js      # Core Redis subscriber
│   └── ServiceFactory.js   # Creates output services
│
├── utils/                   # Utilities
│   ├── constants.js        # Application constants
│   └── Logger.js           # Logging utility (Singleton)
│
└── docs/                    # Documentation
    ├── GUIDE.md            # Comprehensive guide
    ├── DESIGN_PATTERNS.md  # Pattern explanations
    ├── WALKTHROUGH.md      # Complete code walkthrough
    └── IMPROVEMENTS.md     # What was improved
```

---

## ⚙️ Environment Variables

### Quick Setup
```bash
# Copy example file
cp .env.example .env

# Edit with your values
# (Use nano, vim, or any text editor)
```

### Essential Variables
```bash
# Redis connection
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_CHANNEL=data-stream-channel

# Output destination
OUTPUT_TYPE=mock
MOCK_OUTPUT_FILE=./output_events.jsonl

# Logging
LOG_LEVEL=INFO
```

### All Available Variables
See `.env.example` for complete list with descriptions.

---

## 🏃 Running the Application

### Start Application
```bash
npm start
```

### Development Mode (More Logging)
```bash
npm run dev
# OR
LOG_LEVEL=DEBUG npm start
```

### Test Message Publishing
```bash
# In another terminal
redis-cli PUBLISH data-stream-channel '{"event":"test","value":123}'
```

### View Output
```bash
# Raw output
cat output_events.jsonl

# Pretty printed
cat output_events.jsonl | jq

# Watch in real-time
tail -f output_events.jsonl | jq
```

### Stop Application
```
Ctrl+C (graceful shutdown with cleanup)
```

---

## 🎨 Design Patterns Cheat Sheet

### 1. Strategy Pattern
**When to use:** Multiple algorithms for same task

**Example:**
```javascript
// Different output strategies
class OutputStrategy { }
class EventHubMock extends OutputStrategy { }
class AzureEventHub extends OutputStrategy { }

// Use any strategy
const output = new EventHubMock();
await output.sendEvent(data); // Works with any strategy!
```

### 2. Factory Pattern
**When to use:** Creating objects based on configuration

**Example:**
```javascript
// Instead of complex if/else
const service = ServiceFactory.createOutputService(config);
```

### 3. Dependency Injection
**When to use:** Reduce coupling, improve testability

**Example:**
```javascript
// Inject dependencies (don't create them)
const bridge = new RedisBridge(config, outputService);
```

### 4. Singleton Pattern
**When to use:** Only one instance needed (e.g., Logger)

**Example:**
```javascript
const logger = require('./utils/Logger');
// Same instance everywhere!
```

### 5. Observer Pattern
**When to use:** React to events

**Example:**
```javascript
subscriber.on('message', handleMessage);
// handleMessage called when message arrives
```

---

## 🛠️ Common Tasks

### Add New Output Type (e.g., Kafka)

**Step 1:** Create new strategy
```javascript
// services/KafkaProducer.js
class KafkaProducer extends OutputStrategy {
    async initialize() { /* Connect to Kafka */ }
    async sendEvent(data) { /* Send to Kafka */ }
    async close() { /* Disconnect */ }
}
```

**Step 2:** Add to factory
```javascript
// services/ServiceFactory.js
case OUTPUT_TYPES.KAFKA:
    return ServiceFactory._createKafkaService(config);
```

**Step 3:** Add to constants
```javascript
// utils/constants.js
OUTPUT_TYPES: {
    KAFKA: 'kafka',
}
```

**Step 4:** Add configuration
```javascript
// config.js - ConfigBuilder.buildOutputConfig()
else if (type === OUTPUT_TYPES.KAFKA) {
    config.kafkaBrokers = process.env.KAFKA_BROKERS;
    config.kafkaTopic = process.env.KAFKA_TOPIC;
}
```

---

### Change Log Level at Runtime

**Option 1:** Environment variable
```bash
LOG_LEVEL=DEBUG npm start
```

**Option 2:** In code (temporary)
```javascript
const logger = require('./utils/Logger');
logger.setLevel('DEBUG');
```

---

### Add New Configuration Option

**Step 1:** Add to constants
```javascript
// utils/constants.js
MY_FEATURE_SETTINGS: Object.freeze({
    ENABLED: true,
    TIMEOUT: 5000,
})
```

**Step 2:** Add to config builder
```javascript
// config.js
static buildMyFeatureConfig() {
    return {
        enabled: process.env.MY_FEATURE_ENABLED !== 'false',
        timeout: parseInt(process.env.MY_FEATURE_TIMEOUT || 5000, 10),
    };
}
```

**Step 3:** Use in your code
```javascript
if (config.myFeature.enabled) {
    // Your feature logic
}
```

---

### Enable/Disable Batching

**Enable:**
```bash
BATCH_ENABLED=true
BATCH_MAX_SIZE=100
BATCH_TIMEOUT_MS=5000
```

**Disable:**
```bash
BATCH_ENABLED=false
```

---

### Add Custom Logging

```javascript
const logger = require('./utils/Logger');

// Different levels
logger.error('Critical error!');      // Always shown
logger.warn('Warning message');       // If level >= WARN
logger.info('Normal operation');      // If level >= INFO
logger.debug('Debugging info');       // If level >= DEBUG
logger.trace('Very detailed info');   // If level >= TRACE
```

---

## 🐛 Troubleshooting

### Application Won't Start

**Check Redis:**
```bash
redis-cli ping
# Should respond: PONG
```

**Check .env file:**
```bash
cat .env
# Verify all required variables are set
```

**Check Node version:**
```bash
node --version
# Should be >= 14.0.0
```

---

### No Messages Received

**Verify channel:**
```bash
redis-cli PUBSUB CHANNELS
# Should list your channel
```

**Check subscription:**
Look for this in logs:
```
[RedisBridge] Successfully subscribed to channel: your-channel
```

**Increase logging:**
```bash
LOG_LEVEL=DEBUG npm start
```

---

### Output File Not Created

**Check permissions:**
```bash
ls -la ./output_events.jsonl
# Verify you have write access
```

**Check path:**
```bash
echo $MOCK_OUTPUT_FILE
# Verify path is correct
```

**Look for errors:**
```bash
LOG_LEVEL=DEBUG npm start
# Check for file-related errors
```

---

### Redis Connection Errors

**Error: ECONNREFUSED**
- Redis is not running
- Wrong host/port

**Solution:**
```bash
# Start Redis
redis-server

# Or check if running
ps aux | grep redis
```

**Error: NOAUTH Authentication required**
- Redis requires password
- REDIS_PASSWORD not set

**Solution:**
```bash
# Add to .env
REDIS_PASSWORD=your-password
```

---

### Memory Issues

**Symptoms:**
- Process crashes
- High memory usage

**Solutions:**

1. **Enable batching** (reduces memory)
```bash
BATCH_ENABLED=true
BATCH_MAX_SIZE=100
```

2. **Increase batch timeout** (flush more often)
```bash
BATCH_TIMEOUT_MS=3000
```

3. **Monitor memory:**
```bash
node --max-old-space-size=512 index.js
```

---

## 📊 Monitoring & Statistics

### Get Statistics

Statistics are logged:
- On startup (configuration)
- During runtime (message counts)
- On shutdown (final stats)

**Example output:**
```
Final Statistics: {
  isRunning: false,
  messagesReceived: 1234,
  messagesForwarded: 1230,
  messagesFailed: 4,
  successRate: '99.68%'
}
```

---

## 🔑 Key Commands

```bash
# Install dependencies
npm install

# Start application
npm start

# Start with debug logging
npm run dev

# Test with Redis CLI
redis-cli PUBLISH data-stream-channel '{"test":123}'

# View output
cat output_events.jsonl | jq

# Watch output in real-time
tail -f output_events.jsonl | jq

# Stop application
Ctrl+C
```

---

## 📚 Documentation Files

| File | Purpose | When to Read |
|------|---------|--------------|
| **README.md** | Project overview | First |
| **GUIDE.md** | Comprehensive guide | To understand architecture |
| **DESIGN_PATTERNS.md** | Pattern explanations | To learn patterns |
| **WALKTHROUGH.md** | Step-by-step execution | To understand flow |
| **IMPROVEMENTS.md** | What changed | To see enhancements |
| **Quick Reference** (this file) | Quick lookups | Daily use |

---

## 💡 Tips

1. **Start simple:** Use mock mode first
2. **Check logs:** Increase LOG_LEVEL when debugging
3. **Test locally:** Use Redis CLI to publish test messages
4. **Monitor output:** Use `tail -f` to watch in real-time
5. **Read errors:** Error messages are descriptive
6. **Use .env:** Don't hardcode configuration
7. **Enable batching:** Better performance for high volume

---

## 🎯 Next Steps

1. ✅ Read GUIDE.md for architecture overview
2. ✅ Set up .env file with your values
3. ✅ Start the application
4. ✅ Publish test messages
5. ✅ View output
6. ✅ Experiment with configuration
7. ✅ Read DESIGN_PATTERNS.md to learn patterns
8. ✅ Read WALKTHROUGH.md to understand flow

---

## 🆘 Getting Help

1. **Check logs** with DEBUG level
2. **Review troubleshooting** section above
3. **Read error messages** carefully (they're descriptive)
4. **Check documentation** in docs/ folder
5. **Review inline comments** in source code

---

## 📝 Remember

- **Configuration is flexible** - Customize via environment variables
- **Logs are your friend** - Use LOG_LEVEL=DEBUG when troubleshooting
- **Patterns make it extensible** - Easy to add features
- **Documentation is comprehensive** - Everything is explained
- **Code is self-documenting** - Read the inline comments

Happy coding! 🚀
