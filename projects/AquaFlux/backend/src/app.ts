import 'reflect-metadata';
import express, { Express, Router } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { applyV1Routes } from '@/routes';
import logger from '@/lib/logger';
import { globalErrorHandler } from '@/middlewares/errorHandler';
import { bootstrapApp } from './bootstrap';
import pinoHttp from 'pino-http';

// Initialize Express app
const app: Express = express();

// Bootstrap application services and listeners
bootstrapApp();



// Middlewares
app.use(helmet()); // Secure HTTP headers
app.use(cors()); // Enable CORS
app.use(express.json()); // Parse JSON bodies
app.use(
  pinoHttp({
    logger,
    redact: {
      paths: [
        'req.body.password',
        'req.body.code',
        'req.body.oldPassword',
        'req.body.refreshToken',
        'res.headers.authorization',
      ],
      censor: '[REDACTED]',
    },
  })
); // Request logging

// API Routes - V1
const v1Router = Router();

applyV1Routes(v1Router);

app.use('/api/v1', v1Router);

// Health check endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Global error handler
app.use(globalErrorHandler);

export default app;
