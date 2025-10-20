/**
 * Range utilities for privacy-preserving data display
 */

export interface Range {
  min: number;
  max: number;
  unit?: string;
}

export interface RangeConfig {
  percentage: number; // Variance percentage
  minVariance?: number;
  maxVariance?: number;
  precision?: number;
}

export class RangeUtils {
  /**
   * Create a range around a value with given variance
   */
  static createRange(value: number, config: RangeConfig): Range {
    const { percentage, minVariance = 0.01, maxVariance = Infinity, precision = 2 } = config;

    const variance = Math.min(
      Math.max(value * (percentage / 100), minVariance),
      maxVariance
    );

    return {
      min: this.round(value - variance, precision),
      max: this.round(value + variance, precision),
    };
  }

  /**
   * Create tiered ranges based on value magnitude
   */
  static createTieredRange(value: number): Range {
    if (value < 1) {
      return { min: 0, max: 1 };
    } else if (value < 10) {
      return { min: Math.floor(value), max: Math.ceil(value) + 1 };
    } else if (value < 100) {
      const lower = Math.floor(value / 10) * 10;
      return { min: lower, max: lower + 10 };
    } else if (value < 1000) {
      const lower = Math.floor(value / 100) * 100;
      return { min: lower, max: lower + 100 };
    } else {
      const lower = Math.floor(value / 1000) * 1000;
      return { min: lower, max: lower + 1000 };
    }
  }

  /**
   * Create qualitative range descriptors
   */
  static createQualitativeRange(value: number, thresholds: { low: number; medium: number; high: number }): {
    label: string;
    description: string;
    range: Range;
  } {
    if (value < thresholds.low) {
      return {
        label: 'Low',
        description: 'Minimal exposure',
        range: { min: 0, max: thresholds.low }
      };
    } else if (value < thresholds.medium) {
      return {
        label: 'Medium',
        description: 'Moderate exposure',
        range: { min: thresholds.low, max: thresholds.medium }
      };
    } else {
      return {
        label: 'High',
        description: 'Significant exposure',
        range: { min: thresholds.medium, max: thresholds.high * 2 }
      };
    }
  }

  /**
   * Format range for display
   */
  static formatRange(range: Range, precision: number = 2): string {
    const { min, max, unit = '' } = range;

    if (Math.abs(min - max) < 0.01) {
      return `${this.round(min, precision)}${unit}`;
    }

    return `${this.round(min, precision)} - ${this.round(max, precision)}${unit}`;
  }

  /**
   * Check if value is within range
   */
  static isInRange(value: number, range: Range): boolean {
    return value >= range.min && value <= range.max;
  }

  /**
   * Merge overlapping ranges
   */
  static mergeRanges(ranges: Range[]): Range[] {
    if (ranges.length === 0) return [];
    if (ranges.length === 1) return ranges;

    const sorted = [...ranges].sort((a, b) => a.min - b.min);
    const merged: Range[] = [sorted[0]];

    for (let i = 1; i < sorted.length; i++) {
      const current = sorted[i];
      const last = merged[merged.length - 1];

      if (current.min <= last.max) {
        merged[merged.length - 1] = {
          min: last.min,
          max: Math.max(last.max, current.max)
        };
      } else {
        merged.push(current);
      }
    }

    return merged;
  }

  /**
   * Create price range for trading
   */
  static createPriceRange(
    basePrice: number,
    spreadPercentage: number = 0.5,
    precision: number = 2
  ): Range {
    const spread = basePrice * (spreadPercentage / 100);
    return {
      min: this.round(basePrice - spread, precision),
      max: this.round(basePrice + spread, precision),
      unit: 'USD'
    };
  }

  /**
   * Create size range for orders
   */
  static createSizeRange(
    baseSize: number,
    variancePercentage: number = 10,
    precision: number = 6
  ): Range {
    return this.createRange(baseSize, {
      percentage: variancePercentage,
      precision
    });
  }

  /**
   * Generate confidence interval
   */
  static createConfidenceInterval(
    value: number,
    confidence: number = 95,
    standardError?: number
  ): Range {
    // If standard error is not provided, estimate it as 10% of value
    const se = standardError || value * 0.1;

    // Z-scores for common confidence levels
    const zScores: { [key: number]: number } = {
      90: 1.645,
      95: 1.96,
      99: 2.576
    };

    const zScore = zScores[confidence] || zScores[95];
    const margin = zScore * se;

    return {
      min: this.round(value - margin, 2),
      max: this.round(value + margin, 2)
    };
  }

  /**
   * Round number to specified precision
   */
  private static round(value: number, precision: number): number {
    const factor = Math.pow(10, precision);
    return Math.round(value * factor) / factor;
  }

  /**
   * Create liquidity indicator range
   */
  static createLiquidityIndicator(volume: number): {
    level: 'very-low' | 'low' | 'medium' | 'high' | 'very-high';
    color: string;
    range: Range;
  } {
    if (volume < 1000) {
      return {
        level: 'very-low',
        color: 'text-red-500',
        range: { min: 0, max: 1000 }
      };
    } else if (volume < 10000) {
      return {
        level: 'low',
        color: 'text-orange-500',
        range: { min: 1000, max: 10000 }
      };
    } else if (volume < 100000) {
      return {
        level: 'medium',
        color: 'text-yellow-500',
        range: { min: 10000, max: 100000 }
      };
    } else if (volume < 1000000) {
      return {
        level: 'high',
        color: 'text-green-500',
        range: { min: 100000, max: 1000000 }
      };
    } else {
      return {
        level: 'very-high',
        color: 'text-emerald-500',
        range: { min: 1000000, max: Infinity }
      };
    }
  }
}