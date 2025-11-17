import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { agentRouter } from './routes/agent';
import { errorHandler } from './middleware/errorHandler';
import { createLogger } from '@poc/shared';

dotenv.config();

const logger = createLogger('bff:server');

const app = express();
const PORT = process.env.BFF_PORT || 3000;
const HOST = process.env.BFF_HOST || '0.0.0.0';

// Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  message: 'Too many requests, please try again later'
});
app.use('/api/', limiter);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'bff',
    timestamp: new Date().toISOString(),
    gemini: process.env.GOOGLE_API_KEY ? 'configured' : 'not-configured',
    langsmith: process.env.LANGCHAIN_TRACING_V2 === 'true' ? 'enabled' : 'disabled'
  });
});

// API routes
app.use('/api/agent', agentRouter);

// Error handling
app.use(errorHandler);

// Start server
const server = app.listen(Number(PORT), HOST, () => {
  logger.info(`BFF server started`, {
    url: `http://${HOST}:${PORT}`,
    env: process.env.NODE_ENV,
    gemini: process.env.GOOGLE_API_KEY ? 'configured' : 'not-configured',
    langsmith: process.env.LANGCHAIN_TRACING_V2
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});
