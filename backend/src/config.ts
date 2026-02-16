import { config as dotenvConfig } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load .env from backend directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenvConfig({ path: join(__dirname, '..', '.env') });

interface Config {
  port: number;
  nodeEnv: string;
  database: {
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
    ssl: boolean;
  };
  mqtt: {
    brokerUrl: string;
    username?: string;
    password?: string;
    topic: string;
    topics: string[]; // Support multiple topics
  };
  cors: {
    origin: string;
  };
  apiPrefix: string;
}

export const config: Config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'smart_farm',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    ssl: process.env.DB_SSL === 'true',
  },
  mqtt: {
    brokerUrl: process.env.MQTT_BROKER_URL || 'mqtt://test.mosquitto.org:1883',
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
    topic: process.env.MQTT_TOPIC || 'smartfarm/telemetry/#', // เปลี่ยนกลับมาใช้ env variable
    // Support multiple topics - can be comma-separated in env
    // Falls back to MQTT_TOPIC if MQTT_TOPICS is not set
    topics: process.env.MQTT_TOPICS 
      ? process.env.MQTT_TOPICS.split(',').map(t => t.trim())
      : [process.env.MQTT_TOPIC || 'smartfarm/telemetry/#'],
  },
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  },
  apiPrefix: process.env.API_PREFIX || '/api',
};
