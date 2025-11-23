# Testing Guide

## Overview

This project includes comprehensive unit and integration tests using Jest. Tests cover all major components and design patterns.

## Test Structure

```
test/
├── unit/                          # Unit tests (isolated components)
│   ├── Logger.test.js            # Logger (Singleton pattern)
│   ├── OutputStrategy.test.js    # OutputStrategy (Strategy pattern)
│   ├── EventhubMock.test.js     # EventHubMock implementation
│   ├── ServiceFactory.test.js    # ServiceFactory (Factory pattern)
│   └── config.test.js            # Configuration system
│
└── integration/                   # Integration tests
    └── RedisBridge.test.js       # RedisBridge with mocked dependencies
```

## Running Tests

### Install Dependencies

```bash
npm install
```

### Run All Tests

```bash
npm test
```

### Run Tests in Watch Mode

```bash
npm run test:watch
```

### Run Only Unit Tests

```bash
npm run test:unit
```

### Run Only Integration Tests

```bash
npm run test:integration
```

### Generate Coverage Report

```bash
npm test
# Coverage report will be in coverage/ directory
```

## Test Coverage

### Unit Tests

#### Logger.test.js
- ✅ Singleton pattern behavior
- ✅ Log level filtering
- ✅ Message formatting
- ✅ All log methods (error, warn, info, debug, trace)
- ✅ Timestamp inclusion
- ✅ Additional arguments handling

#### OutputStrategy.test.js
- ✅ Abstract class instantiation prevention
- ✅ Interface contract enforcement
- ✅ Statistics tracking
- ✅ Success rate calculation
- ✅ Default sendBatch implementation
- ✅ Health check functionality

#### EventhubMock.test.js
- ✅ File initialization
- ✅ Event sending (single and batch)
- ✅ Event enrichment with metadata
- ✅ JSONL format validation
- ✅ Error handling
- ✅ Statistics tracking
- ✅ Event ID generation

#### ServiceFactory.test.js
- ✅ Mock service creation
- ✅ Invalid output type handling
- ✅ Configuration validation
- ✅ Error messages
- ✅ Service interface verification

#### config.test.js
- ✅ Default values
- ✅ Environment variable parsing
- ✅ Redis configuration
- ✅ Output configuration
- ✅ Retry settings
- ✅ Batch settings
- ✅ Logging configuration
- ✅ Port validation
- ✅ Configuration immutability

### Integration Tests

#### RedisBridge.test.js
- ✅ Service initialization
- ✅ Redis client creation
- ✅ Event handler registration
- ✅ Message parsing and forwarding
- ✅ Non-JSON message handling
- ✅ Message enrichment
- ✅ Statistics tracking
- ✅ Error handling
- ✅ Reconnection logic with exponential backoff
- ✅ Graceful shutdown

## Test Examples

### Testing a Strategy Pattern Implementation

```javascript
describe('EventHubMock (Strategy Implementation)', () => {
    test('should implement OutputStrategy interface', () => {
        const mock = new EventHubMock('./test.jsonl');
        
        expect(mock.initialize).toBeDefined();
        expect(mock.sendEvent).toBeDefined();
        expect(mock.close).toBeDefined();
    });
});
```

### Testing Dependency Injection

```javascript
describe('RedisBridge with Dependency Injection', () => {
    test('should work with any OutputStrategy', async () => {
        const mockOutput = {
            initialize: jest.fn().mockResolvedValue(),
            sendEvent: jest.fn().mockResolvedValue(true),
            close: jest.fn().mockResolvedValue(),
        };
        
        const bridge = new RedisBridge(config, mockOutput);
        await bridge.start();
        
        expect(mockOutput.initialize).toHaveBeenCalled();
    });
});
```

### Testing Factory Pattern

```javascript
describe('ServiceFactory', () => {
    test('should create correct service based on config', () => {
        const config = { output: { type: 'mock', mockFile: './test.jsonl' } };
        const service = ServiceFactory.createOutputService(config);
        
        expect(service).toBeInstanceOf(EventHubMock);
    });
});
```

## Mocking

### Mocked Dependencies

- **ioredis** - Redis client (all tests)
- **fs/promises** - File system operations (EventHubMock tests)
- **console.log** - Logging output (Logger tests)

### Example Mock Setup

```javascript
jest.mock('ioredis');
const Redis = require('ioredis');

const mockClient = {
    on: jest.fn(),
    subscribe: jest.fn(),
    disconnect: jest.fn(),
};

Redis.mockImplementation(() => mockClient);
```

## Writing New Tests

### Unit Test Template

```javascript
const MyComponent = require('../../path/to/component');

describe('MyComponent', () => {
    let component;
    
    beforeEach(() => {
        component = new MyComponent();
    });
    
    describe('Feature', () => {
        test('should behave correctly', () => {
            // Arrange
            const input = 'test';
            
            // Act
            const result = component.doSomething(input);
            
            // Assert
            expect(result).toBe('expected');
        });
    });
});
```

### Integration Test Template

```javascript
describe('Integration: Component A + Component B', () => {
    let componentA;
    let componentB;
    
    beforeEach(() => {
        componentB = new ComponentB();
        componentA = new ComponentA(componentB);
    });
    
    test('should work together', async () => {
        await componentA.doSomething();
        
        expect(componentB.someMethod).toHaveBeenCalled();
    });
});
```

## Best Practices

### 1. Test Isolation
- Each test should be independent
- Use `beforeEach` to set up fresh state
- Use `afterEach` to clean up

### 2. Descriptive Names
```javascript
// Good
test('should throw error when port is out of range', () => {});

// Bad
test('port validation', () => {});
```

### 3. Arrange-Act-Assert Pattern
```javascript
test('should calculate sum correctly', () => {
    // Arrange
    const a = 5;
    const b = 3;
    
    // Act
    const result = add(a, b);
    
    // Assert
    expect(result).toBe(8);
});
```

### 4. Test Both Success and Failure Cases
```javascript
describe('sendEvent', () => {
    test('should succeed with valid data', async () => {
        const result = await service.sendEvent(validData);
        expect(result).toBe(true);
    });
    
    test('should fail with invalid data', async () => {
        const result = await service.sendEvent(invalidData);
        expect(result).toBe(false);
    });
});
```

### 5. Use Meaningful Assertions
```javascript
// Good
expect(result).toEqual({ id: 1, name: 'Test' });

// Less specific
expect(result).toBeTruthy();
```

## Continuous Integration

Add to your CI/CD pipeline:

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '14'
      - run: npm install
      - run: npm test
```

## Coverage Goals

Current coverage targets:
- **Statements**: > 80%
- **Branches**: > 75%
- **Functions**: > 80%
- **Lines**: > 80%

View coverage report:
```bash
npm test
open coverage/lcov-report/index.html
```

## Troubleshooting Tests

### Tests Failing Due to Async Issues
```javascript
// Make sure to use async/await or return promise
test('async test', async () => {
    await asyncOperation();
    expect(result).toBe(expected);
});
```

### Mock Not Working
```javascript
// Ensure mock is set up before importing module
jest.mock('module-name');
const module = require('module-name');
```

### Tests Passing Locally But Failing in CI
- Check for environment-specific code
- Ensure consistent Node.js version
- Look for timing issues (use fake timers if needed)

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Jest Matchers](https://jestjs.io/docs/expect)
- [Testing Best Practices](https://testingjavascript.com/)

## Next Steps

1. **Run the tests**: `npm test`
2. **Check coverage**: Look in `coverage/` directory
3. **Add more tests**: Follow the templates above
4. **Integrate with CI**: Add to your pipeline

Happy testing! 🧪
