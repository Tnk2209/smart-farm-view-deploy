import mqtt from 'mqtt';
import { config } from '../config.js';
import { processTelemetryMessage, validateTelemetryMessage } from '../services/telemetryService.js';

let mqttClient: mqtt.MqttClient | null = null;

/**
 * Initialize MQTT subscriber
 * Connects to MQTT broker and subscribes to telemetry topic
 */
export function initializeMqttSubscriber(): void {
  console.log('🔌 Connecting to MQTT broker:', config.mqtt.brokerUrl);

  const options: mqtt.IClientOptions = {
    clientId: `smartfarm-backend-${Math.random().toString(16).slice(2, 10)}`,
    clean: true,
    connectTimeout: 4000,
    reconnectPeriod: 1000,
  };

  // Add credentials if provided
  if (config.mqtt.username) {
    options.username = config.mqtt.username;
    options.password = config.mqtt.password;
  }

  mqttClient = mqtt.connect(config.mqtt.brokerUrl, options);

  // Connection successful
  mqttClient.on('connect', () => {
    console.log('✅ Connected to MQTT broker');
    
    // Subscribe to telemetry topic
    mqttClient!.subscribe(config.mqtt.topic, (err) => {
      if (err) {
        console.error('❌ Failed to subscribe to topic:', err);
      } else {
        console.log(`📡 Subscribed to topic: ${config.mqtt.topic}`);
      }
    });
  });

  // Receive message
  mqttClient.on('message', async (topic, message) => {
    console.log(`\n📨 Received message on topic: ${topic}`);
    
    try {
      // Parse JSON payload
      const payload = JSON.parse(message.toString());
      console.log('📦 Payload:', JSON.stringify(payload, null, 2));

      // Validate telemetry structure
      if (!validateTelemetryMessage(payload)) {
        console.error('❌ Invalid telemetry message structure');
        return;
      }

      // Process telemetry
      const result = await processTelemetryMessage(payload);
      
      if (result.success) {
        console.log(`✅ ${result.message}`);
        console.log(`   📊 Records created: ${result.recordsCreated}`);
        console.log(`   ⚠️  Alerts triggered: ${result.alertsTriggered}`);
        
        if (result.errors && result.errors.length > 0) {
          console.log('   ⚠️  Warnings:', result.errors);
        }
      } else {
        console.error(`❌ ${result.message}`);
      }
      
    } catch (error) {
      console.error('❌ Error processing MQTT message:', error);
    }
  });

  // Handle errors
  mqttClient.on('error', (error) => {
    console.error('❌ MQTT connection error:', error);
  });

  // Handle disconnect
  mqttClient.on('close', () => {
    console.log('🔌 MQTT connection closed');
  });

  // Handle reconnect
  mqttClient.on('reconnect', () => {
    console.log('🔄 Reconnecting to MQTT broker...');
  });
}

/**
 * Publish a message to MQTT broker (for testing)
 */
export function publishMessage(topic: string, message: string | object): void {
  if (!mqttClient || !mqttClient.connected) {
    console.error('❌ MQTT client not connected');
    return;
  }

  const payload = typeof message === 'string' ? message : JSON.stringify(message);
  
  mqttClient.publish(topic, payload, (err) => {
    if (err) {
      console.error('❌ Failed to publish message:', err);
    } else {
      console.log(`✅ Published message to topic: ${topic}`);
    }
  });
}

/**
 * Close MQTT connection gracefully
 */
export function closeMqttConnection(): Promise<void> {
  return new Promise((resolve) => {
    if (mqttClient) {
      mqttClient.end(() => {
        console.log('MQTT connection closed');
        resolve();
      });
    } else {
      resolve();
    }
  });
}
