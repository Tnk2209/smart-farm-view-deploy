import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { testConnection, closeConnection } from './database/connection.js';
import { initializeMqttSubscriber, closeMqttConnection } from './mqtt/subscriber.js';

// Import routes
import stationsRouter from './routes/stations.js';
import sensorsRouter from './routes/sensors.js';
import alertsRouter from './routes/alerts.js';
import thresholdsRouter from './routes/thresholds.js';

const app = express();

// Middleware
app.use(cors({ origin: config.cors.origin }));
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'smart-farm-backend',
  });
});

// API Routes
app.use(`${config.apiPrefix}/stations`, stationsRouter);
app.use(`${config.apiPrefix}/sensors`, sensorsRouter);
app.use(`${config.apiPrefix}/alerts`, alertsRouter);
app.use(`${config.apiPrefix}/thresholds`, thresholdsRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
  });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
});

// Start server
async function startServer() {
  try {
    console.log('🚀 Starting Smart Farm Backend...\n');

    // Test database connection
    const dbConnected = await testConnection();
    if (!dbConnected) {
      throw new Error('Failed to connect to database');
    }

    // Initialize MQTT subscriber
    initializeMqttSubscriber();

    // Start HTTP server
    app.listen(config.port, () => {
      console.log(`\n✅ Server running on port ${config.port}`);
      console.log(`📍 API: http://localhost:${config.port}${config.apiPrefix}`);
      console.log(`🏥 Health: http://localhost:${config.port}/health`);
      console.log(`\n🎯 Environment: ${config.nodeEnv}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\n🛑 Shutting down gracefully...');
  
  try {
    await closeMqttConnection();
    await closeConnection();
    console.log('✅ All connections closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  console.log('\n\n🛑 Received SIGTERM, shutting down...');
  
  try {
    await closeMqttConnection();
    await closeConnection();
    console.log('✅ All connections closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});

// Start the server
startServer();
