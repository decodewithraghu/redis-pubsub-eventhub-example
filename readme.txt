🌉 Redis-to-Azure Event Hubs Bridge
This project implements a scalable bridge service designed to subscribe to a channel in Redis Pub/Sub and reliably forward the incoming stream of messages to Azure Event Hubs.
The solution prioritizes best practices in software design, using Object-Oriented Programming (OOP) and the Dependency Injection pattern to ensure the core message routing logic is highly readable, testable, and completely decoupled from the output destination (Azure, file, or future services).
🚀 Getting Started
Prerequisites
Node.js (v16 or higher)
npm (Node Package Manager)
A running Redis instance (local or remote)
Installation
Clone the project repository:
code
Bash
git clone [your-repo-link]
cd redis-eventhub-bridge
Install required Node.js dependencies:
code
Bash
npm install
Set up the environment configuration:
code
Bash
rename .env.example to .env and run the applciation.
⚙️ Configuration
Populate the .env file with your specific environment settings.
Example .env File
code
Env
#################################################################
# CORE BRIDGE CONFIGURATION
#################################################################

# Operational mode: 
# 'mock' (sends output to a local file for development) 
# 'azure' (sends output to a real Azure Event Hub)
OUTPUT_TYPE=mock

#################################################################
# REDIS CONFIGURATION
#################################################################

REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_CHANNEL=data-stream-channel
# REDIS_PASSWORD=

#################################################################
# MOCK OUTPUT CONFIGURATION (Active when OUTPUT_TYPE=mock)
#################################################################

# Local file path where the simulated Event Hub output will be logged.
MOCK_OUTPUT_FILE=./output_events.jsonl


#################################################################
# AZURE EVENT HUBS CONFIGURATION (Active when OUTPUT_TYPE=azure)
#################################################################

# Full Connection String for the Event Hubs Namespace (requires 'Send' rights)
# EVENT_HUB_CONNECTION_STRING="Endpoint=sb://...;SharedAccessKeyName=...;SharedAccessKey=..."

# The specific name of the Event Hub instance
# EVENT_HUB_NAME="your-event-hub-name"
💻 Running the Bridge
A. Local Mocking Mode (Development)
This mode is used to verify the Redis subscription, connection logic, and message parsing without requiring an active Azure connection.
Ensure OUTPUT_TYPE=mock is set in your .env.
Start the bridge application:
code
Bash
node index.js
Test Publishing: In a separate terminal, send a message using the Redis CLI:
code
Bash
redis-cli
PUBLISH data-stream-channel '{"user_id": 102, "action": "checkout", "timestamp": "2024-05-01T12:00:00Z"}'
Verification: Check the contents of the output_events.jsonl file to confirm the event was successfully logged by the mock service.



B. Production Azure Mode (Deployment)
This mode requires a working implementation of the Azure Event Hubs client (which would replace EventHubMock.js).
Update .env to enable production mode and configure Azure credentials.
code
Env
OUTPUT_TYPE=azure
# ... fill in connection details ...
Start the bridge service:
code
Bash
node index.js
The service will now securely forward all published Redis messages directly to the specified Azure Event Hub.
📐 Project Structure
The project design ensures maximum extensibility:
Path	Description	Role
index.js	Main application entry point, initializes components and handles application lifecycle.	Entry Point
config.js	Central module for loading and validating all environment settings.	Configuration
services/RedisBridge.js	Core logic class; manages Redis connectivity, subscription, and message routing.	Core Logic
services/EventHubMock.js	Implementation of the output service interface for local file logging.	Mock Dependency
services/AzureEventHubsClient.js	(To be implemented) The actual service class using the @azure/event-hubs SDK.	Production Dependency
Extending to New Destinations
Thanks to Dependency Injection, adding a new output target (e.g., AWS Kinesis, Kafka, or a simple database log) is straightforward:
Create a new class (e.g., KafkaProducer.js) that implements the required methods (sendEvent(data) and close()).
Update config.js and index.js to recognize and instantiate the new client when its OUTPUT_TYPE is selected.

The core RedisBridge.js remains untouched.
