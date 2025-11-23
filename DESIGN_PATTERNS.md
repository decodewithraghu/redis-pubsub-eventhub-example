# Design Patterns Implementation Guide

## 📋 Overview

This document explains how each design pattern is implemented in the codebase and **why** we chose it.

---

## 1. Strategy Pattern

### 📍 Location
- `services/OutputStrategy.js` - Abstract base class
- `services/EventhubMock.js` - Concrete implementation
- Future: `services/AzureEventHub.js`, `services/KafkaProducer.js`

### 🎯 Purpose
Define a family of algorithms (output methods), encapsulate each one, and make them interchangeable.

### ❓ Problem It Solves
Without Strategy pattern:
```javascript
// BAD: Hard to maintain, violates Open/Closed Principle
class RedisBridge {
    async sendToOutput(data) {
        if (this.outputType === 'mock') {
            await fs.appendFile(this.file, JSON.stringify(data));
        } else if (this.outputType === 'azure') {
            await this.azureClient.send(data);
        } else if (this.outputType === 'kafka') {
            await this.kafkaProducer.send(data);
        }
        // Adding new output type requires modifying this class!
    }
}
```

With Strategy pattern:
```javascript
// GOOD: Each strategy is independent
class RedisBridge {
    constructor(config, outputService) {
        this.outputService = outputService; // Any OutputStrategy
    }
    
    async sendToOutput(data) {
        await this.outputService.sendEvent(data);
        // Works with ANY output type! No if/else needed.
    }
}
```

### ✅ Benefits
1. **Open/Closed Principle**: Open for extension, closed for modification
2. **Testability**: Easy to mock different output services
3. **Flexibility**: Switch strategies at runtime via configuration
4. **Maintainability**: Each strategy is self-contained

### 🔄 How It Works (Step-by-Step)

```
STEP 1: Define abstract base class (OutputStrategy)
        ↓
STEP 2: Create concrete implementations (EventHubMock, AzureEventHub)
        ↓
STEP 3: Client code (RedisBridge) works with base class
        ↓
STEP 4: At runtime, appropriate strategy is injected
        ↓
STEP 5: Client calls interface methods, concrete implementation executes
```

### 💡 Real-World Analogy
Think of payment methods in an e-commerce app:
- **Strategy**: PaymentStrategy (interface)
- **Concrete**: CreditCard, PayPal, Bitcoin
- **Client**: Checkout process (doesn't care HOW payment is made)

---

## 2. Factory Pattern

### 📍 Location
- `services/ServiceFactory.js`

### 🎯 Purpose
Provide an interface for creating objects without specifying their concrete classes.

### ❓ Problem It Solves
Without Factory:
```javascript
// BAD: Client code is complex and tightly coupled
let outputService;
if (config.output.type === 'mock') {
    outputService = new EventHubMock(config.output.mockFile);
} else if (config.output.type === 'azure') {
    outputService = new AzureEventHub(
        config.output.azureConnectionString,
        config.output.azureHubName
    );
} else if (config.output.type === 'kafka') {
    outputService = new KafkaProducer(
        config.output.kafkaBrokers,
        config.output.kafkaTopic
    );
}
// This logic is duplicated everywhere we need to create a service!
```

With Factory:
```javascript
// GOOD: One line, no complexity
const outputService = ServiceFactory.createOutputService(config);
```

### ✅ Benefits
1. **Centralized Creation**: All creation logic in one place
2. **Simplified Client Code**: Clients don't need complex if/else
3. **Easy to Extend**: Adding new types only changes the factory
4. **Configuration-Driven**: Type determined by config, not code

### 🔄 How It Works (Step-by-Step)

```
STEP 1: Client calls ServiceFactory.createOutputService(config)
        ↓
STEP 2: Factory examines config.output.type
        ↓
STEP 3: Factory creates appropriate service instance
        ↓
STEP 4: Factory returns instance to client
        ↓
STEP 5: Client uses instance (doesn't know concrete type)
```

### 💡 Real-World Analogy
Restaurant kitchen:
- **Customer orders**: "I want a vegetarian meal" (config)
- **Chef (Factory)**: Decides what to make based on order
- **Customer receives**: A meal (doesn't care how it was made)

---

## 3. Dependency Injection

### 📍 Location
- `index.js` - Orchestrates DI
- `services/RedisBridge.js` - Receives dependencies

### 🎯 Purpose
Invert control of dependency creation and injection.

### ❓ Problem It Solves
Without DI:
```javascript
// BAD: RedisBridge creates its own dependencies
class RedisBridge {
    constructor(config) {
        // Tightly coupled to EventHubMock!
        this.outputService = new EventHubMock(config.output.mockFile);
        
        // Hard to test: Can't swap with a test double
        // Hard to change: Requires modifying RedisBridge
    }
}
```

With DI:
```javascript
// GOOD: Dependencies are injected
class RedisBridge {
    constructor(config, outputService) {
        this.outputService = outputService; // Injected!
        
        // Easy to test: Pass in a mock
        // Easy to change: Just inject different service
        // Follows Dependency Inversion Principle
    }
}

// In index.js
const outputService = ServiceFactory.createOutputService(config);
const bridge = new RedisBridge(config.redis, outputService); // Injected!
```

### ✅ Benefits
1. **Testability**: Easy to inject mocks/stubs for testing
2. **Flexibility**: Can swap implementations without changing class
3. **Loose Coupling**: Class doesn't depend on concrete implementations
4. **SOLID Principles**: Follows Dependency Inversion Principle

### 🔄 How It Works (Step-by-Step)

```
STEP 1: Orchestrator (index.js) creates dependencies
        ↓
STEP 2: Dependencies are passed to constructor or setter
        ↓
STEP 3: Class stores and uses dependencies
        ↓
STEP 4: Class doesn't know/care about concrete types
```

### 💡 Real-World Analogy
Electric appliances:
- **Without DI**: Appliance has built-in, non-removable battery
- **With DI**: Appliance accepts any compatible battery (injected)

---

## 4. Singleton Pattern

### 📍 Location
- `utils/Logger.js`

### 🎯 Purpose
Ensure a class has only one instance and provide global access to it.

### ❓ Problem It Solves
Without Singleton:
```javascript
// BAD: Multiple logger instances with different configs
// In file1.js
const logger1 = new Logger();
logger1.setLevel('DEBUG');

// In file2.js
const logger2 = new Logger();
logger2.setLevel('INFO'); // Different config!

// Inconsistent logging behavior across the app
```

With Singleton:
```javascript
// GOOD: Same instance everywhere
// In file1.js
const logger = require('./utils/Logger');
logger.setLevel('DEBUG');

// In file2.js
const logger = require('./utils/Logger');
// Same instance! Level is still DEBUG
```

### ✅ Benefits
1. **Controlled Access**: Single point of access to the instance
2. **Reduced Memory**: Only one instance exists
3. **Consistent State**: Configuration shared across entire app
4. **Global Access**: Available anywhere via import/require

### 🔄 How It Works (Step-by-Step)

```
STEP 1: Class has private static instance variable
        ↓
STEP 2: Constructor checks if instance already exists
        ↓
STEP 3: If exists, throw error (use getInstance() instead)
        ↓
STEP 4: getInstance() creates instance if needed
        ↓
STEP 5: getInstance() always returns same instance
```

### 💡 Real-World Analogy
Government president/prime minister:
- Only **one** at a time
- Everyone refers to **the same person**
- Centralized authority

---

## 5. Observer Pattern

### 📍 Location
- `services/RedisBridge.js` - Subscribes to Redis events

### 🎯 Purpose
Define a one-to-many dependency where when one object changes state, all dependents are notified.

### ❓ Problem It Solves
Without Observer:
```javascript
// BAD: Polling - inefficient and complex
while (true) {
    const message = redis.checkForNewMessage(); // Constant polling!
    if (message) {
        handleMessage(message);
    }
    await sleep(100); // Wasted CPU cycles
}
```

With Observer:
```javascript
// GOOD: Event-driven - efficient and clean
subscriber.on('message', (channel, message) => {
    handleMessage(message); // Called only when message arrives
});
// No polling! CPU idle until event occurs
```

### ✅ Benefits
1. **Loose Coupling**: Subject doesn't know about observers
2. **Dynamic Relationships**: Can add/remove observers at runtime
3. **Event-Driven**: Reactive, not polling-based
4. **Scalability**: Multiple observers can listen to same subject

### 🔄 How It Works (Step-by-Step)

```
STEP 1: Observer subscribes to subject's events
        subscriber.on('message', handleMessage)
        ↓
STEP 2: Subject maintains list of observers
        ↓
STEP 3: When subject's state changes (message arrives)
        ↓
STEP 4: Subject notifies all observers
        ↓
STEP 5: Each observer reacts to notification
        handleMessage() is called
```

### 💡 Real-World Analogy
YouTube subscriptions:
- **Subject**: YouTube channel
- **Observers**: Subscribers
- **Event**: New video uploaded
- **Notification**: All subscribers get notified

---

## 6. Builder Pattern

### 📍 Location
- `config.js` - ConfigBuilder class

### 🎯 Purpose
Separate construction of a complex object from its representation.

### ❓ Problem It Solves
Without Builder:
```javascript
// BAD: Complex, error-prone initialization
const config = {
    redis: {
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        // Validation mixed with construction
        // Hard to test individual parts
    },
    output: {
        type: process.env.OUTPUT_TYPE || 'mock',
        // More complex logic...
    }
    // etc...
};
```

With Builder:
```javascript
// GOOD: Step-by-step construction
class ConfigBuilder {
    static buildRedisConfig() {
        // Focus: Build Redis config only
    }
    
    static buildOutputConfig() {
        // Focus: Build output config only
    }
}

const config = {
    redis: ConfigBuilder.buildRedisConfig(),
    output: ConfigBuilder.buildOutputConfig(),
};
```

### ✅ Benefits
1. **Separation of Concerns**: Each builder builds one thing
2. **Testability**: Can test each builder independently
3. **Readability**: Clear, step-by-step construction
4. **Validation**: Each builder can validate its part

---

## 🎓 Pattern Interaction Diagram

```
┌─────────────────────────────────────────────────────────┐
│                      index.js                            │
│                   (DI Container)                         │
└──────────────┬──────────────────────────────────────────┘
               │
               │ Uses Builder Pattern
               ▼
┌─────────────────────────────────────────────────────────┐
│                     config.js                            │
│                  (Builder Pattern)                       │
└──────────────┬──────────────────────────────────────────┘
               │
               │ Passed to Factory
               ▼
┌─────────────────────────────────────────────────────────┐
│                 ServiceFactory                           │
│                 (Factory Pattern)                        │
└──────────────┬──────────────────────────────────────────┘
               │
               │ Creates Strategy
               ▼
┌─────────────────────────────────────────────────────────┐
│              OutputStrategy (Abstract)                   │
│               (Strategy Pattern)                         │
└──────────────┬──────────────────────────────────────────┘
               │
     ┌─────────┴─────────┐
     ▼                   ▼
┌──────────┐      ┌──────────┐
│EventHub  │      │  Azure   │
│  Mock    │      │EventHub  │
└──────────┘      └──────────┘
     │                   │
     └─────────┬─────────┘
               │
               │ Injected into (DI)
               ▼
┌─────────────────────────────────────────────────────────┐
│                   RedisBridge                            │
│              (Observer Pattern Consumer)                 │
│              Uses Singleton Logger                       │
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 Summary

| Pattern | Purpose | Location | Key Benefit |
|---------|---------|----------|-------------|
| **Strategy** | Interchangeable algorithms | OutputStrategy | Flexibility |
| **Factory** | Centralized object creation | ServiceFactory | Simplification |
| **Dependency Injection** | Loose coupling | index.js, RedisBridge | Testability |
| **Singleton** | Single instance | Logger | Consistency |
| **Observer** | Event notification | RedisBridge | Reactivity |
| **Builder** | Complex object construction | ConfigBuilder | Clarity |

---

## 📚 Further Reading

- **Design Patterns: Elements of Reusable Object-Oriented Software** (Gang of Four)
- **Head First Design Patterns** (Freeman & Freeman)
- **Refactoring.Guru** - https://refactoring.guru/design-patterns

---

## 🛠️ Adding New Patterns

When you add a new pattern to this codebase:

1. **Document it here** with the same structure
2. **Add step-by-step explanations** in the code
3. **Update the architecture diagram** in GUIDE.md
4. **Provide usage examples**

Remember: **Patterns are tools, not rules.** Use them when they solve a problem, not just because they exist.
