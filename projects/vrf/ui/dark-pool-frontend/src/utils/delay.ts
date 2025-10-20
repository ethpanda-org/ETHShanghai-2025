/**
 * Delay utilities for privacy protection against timing analysis
 */

export class DelayUtils {
  /**
   * Add random delay to prevent timing analysis
   */
  static async randomDelay(minMs: number = 1000, maxMs: number = 3000): Promise<void> {
    const delay = Math.random() * (maxMs - minMs) + minMs;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Create a delayed promise with random timing
   */
  static async delayedResult<T>(
    result: T,
    minMs: number = 500,
    maxMs: number = 2000
  ): Promise<T> {
    await this.randomDelay(minMs, maxMs);
    return result;
  }

  /**
   * Add jitter to API responses
   */
  static async addJitter<T>(
    promise: Promise<T>,
    jitterMs: number = 500
  ): Promise<T> {
    const [result] = await Promise.all([
      promise,
      this.randomDelay(0, jitterMs)
    ]);
    return result;
  }

  /**
   * Create a timed operation with privacy delay
   */
  static async withPrivacyDelay<T>(
    operation: () => Promise<T>,
    baseDelay: number = 1000
  ): Promise<T> {
    const startTime = Date.now();
    const result = await operation();
    const operationTime = Date.now() - startTime;

    // Ensure minimum timing to prevent inference
    const remainingDelay = Math.max(0, baseDelay - operationTime);
    if (remainingDelay > 0) {
      await this.randomDelay(remainingDelay, remainingDelay + 500);
    }

    return result;
  }

  /**
   * Batch operations with consistent timing
   */
  static async batchWithConsistentTiming<T>(
    operations: (() => Promise<T>)[],
    targetMs: number = 2000
  ): Promise<T[]> {
    const startTime = Date.now();
    const results = await Promise.all(operations.map(op => op()));
    const elapsedTime = Date.now() - startTime;

    // Add delay to reach target time if needed
    if (elapsedTime < targetMs) {
      await this.randomDelay(targetMs - elapsedTime, targetMs - elapsedTime + 500);
    }

    return results;
  }

  /**
   * Create timing-obfuscated status updates
   */
  static async obfuscatedStatusUpdate(
    statuses: string[],
    intervalMs: number = 2000,
    jitterMs: number = 1000
  ): Promise<string[]> {
    const updates: string[] = [];

    for (const status of statuses) {
      await this.randomDelay(intervalMs - jitterMs, intervalMs + jitterMs);
      updates.push(status);
    }

    return updates;
  }
}