import express, { Request, Response } from 'express';
import cors from 'cors';
import { OracleService } from '../services/OracleService';
import { logger } from '../utils/logger';

/**
 * API Server for Merit Oracle Service
 */
export class ApiServer {
  private app: express.Application;
  private oracleService: OracleService;
  private port: number;

  constructor(oracleService: OracleService, port: number = 3001) {
    this.app = express();
    this.oracleService = oracleService;
    this.port = port;

    this.setupMiddleware();
    this.setupRoutes();
  }

  /**
   * Setup Express middleware
   */
  private setupMiddleware(): void {
    this.app.use(cors());
    this.app.use(express.json());
    
    // Request logging
    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.path}`);
      next();
    });
  }

  /**
   * Setup API routes
   */
  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({ status: 'ok', timestamp: Date.now() });
    });

    // Get score (calculate without updating)
    this.app.get('/score/:address', async (req: Request, res: Response) => {
      try {
        const { address } = req.params;
        
        if (!this.isValidAddress(address)) {
          return res.status(400).json({ error: 'Invalid address' });
        }

        const score = await this.oracleService.calculateScore(address);
        const interpretation = this.oracleService.getScoreInterpretation(score.totalScore);

        res.json({
          ...score,
          interpretation,
        });
      } catch (error: any) {
        logger.error('Error calculating score:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Get current on-chain score
    this.app.get('/score/:address/current', async (req: Request, res: Response) => {
      try {
        const { address } = req.params;
        
        if (!this.isValidAddress(address)) {
          return res.status(400).json({ error: 'Invalid address' });
        }

        const score = await this.oracleService.getCurrentScore(address);
        const interpretation = this.oracleService.getScoreInterpretation(score);

        res.json({
          address,
          score,
          interpretation,
        });
      } catch (error: any) {
        logger.error('Error getting current score:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Update score (calculate and update on-chain)
    this.app.post('/update/:address', async (req: Request, res: Response) => {
      try {
        const { address } = req.params;
        const { forceUpdate } = req.body;
        
        if (!this.isValidAddress(address)) {
          return res.status(400).json({ error: 'Invalid address' });
        }

        const result = await this.oracleService.updateUserScore(address, forceUpdate);
        res.json(result);
      } catch (error: any) {
        logger.error('Error updating score:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Batch update scores
    this.app.post('/update/batch', async (req: Request, res: Response) => {
      try {
        const { addresses } = req.body;
        
        if (!Array.isArray(addresses) || addresses.length === 0) {
          return res.status(400).json({ error: 'Invalid addresses array' });
        }

        if (addresses.length > 100) {
          return res.status(400).json({ error: 'Maximum 100 addresses per batch' });
        }

        for (const address of addresses) {
          if (!this.isValidAddress(address)) {
            return res.status(400).json({ error: `Invalid address: ${address}` });
          }
        }

        const results = await this.oracleService.batchUpdateScores(addresses);
        res.json({ results });
      } catch (error: any) {
        logger.error('Error in batch update:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Check Web3 presence
    this.app.get('/presence/:address', async (req: Request, res: Response) => {
      try {
        const { address } = req.params;
        
        if (!this.isValidAddress(address)) {
          return res.status(400).json({ error: 'Invalid address' });
        }

        const hasPresence = await this.oracleService.hasWeb3Presence(address);
        res.json({ address, hasWeb3Presence: hasPresence });
      } catch (error: any) {
        logger.error('Error checking Web3 presence:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // 404 handler
    this.app.use((req: Request, res: Response) => {
      res.status(404).json({ error: 'Not found' });
    });

    // Error handler
    this.app.use((err: Error, req: Request, res: Response, next: any) => {
      logger.error('Unhandled error:', err);
      res.status(500).json({ error: 'Internal server error' });
    });
  }

  /**
   * Validate Ethereum address
   */
  private isValidAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.app.listen(this.port, () => {
        logger.info(`API server listening on port ${this.port}`);
        logger.info(`Health check: http://localhost:${this.port}/health`);
        resolve();
      });
    });
  }
}
