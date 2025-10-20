import CryptoJS from 'crypto-js';

export interface BlurLevel {
  none: 0;
  low: 1;
  medium: 2;
  high: 3;
  maximum: 4;
}

export interface RangeDisplay {
  min: string;
  max: string;
  unit?: string;
  precision?: number;
}

export class ObfuscationUtils {
  private static readonly ENCRYPTION_KEY = import.meta.env.VITE_ENCRYPTION_KEY || 'default-key-change-in-production';

  /**
   * Blur a numeric value based on privacy level
   */
  static blurValue(value: string | number, level: keyof BlurLevel): string {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;

    if (isNaN(numValue)) return '****';

    switch (level) {
      case 'none':
        return value.toString();
      case 'low':
        return this.blurLow(numValue);
      case 'medium':
        return this.blurMedium(numValue);
      case 'high':
        return this.blurHigh(numValue);
      case 'maximum':
        return '****';
      default:
        return '****';
    }
  }

  /**
   * Low blur - show first digit
   */
  private static blurLow(value: number): string {
    if (value === 0) return '0';
    if (value < 1) return '*';
    const log10 = Math.floor(Math.log10(value));
    const firstDigit = Math.floor(value / Math.pow(10, log10));
    const asterisks = '*'.repeat(Math.max(0, log10));
    return `${firstDigit}${asterisks}`;
  }

  /**
   * Medium blur - show first two digits
   */
  private static blurMedium(value: number): string {
    if (value === 0) return '0';
    if (value < 0.01) return '**';
    const strValue = value.toFixed(2);
    if (strValue.length <= 2) return '**';
    return `${strValue.substring(0, 2)}${'*'.repeat(Math.max(0, strValue.length - 2))}`;
  }

  /**
   * High blur - show range
   */
  private static blurHigh(value: number): string {
    if (value === 0) return '0';
    const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
    const lower = Math.floor(value / magnitude) * magnitude;
    const upper = lower + magnitude;
    return `${lower}-${upper}`;
  }

  /**
   * Convert value to range display
   */
  static toRange(value: string | number, precision: number = 2): RangeDisplay {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;

    if (isNaN(numValue)) {
      return { min: '***', max: '***' };
    }

    const variance = numValue * 0.1; // 10% variance
    const min = (numValue - variance).toFixed(precision);
    const max = (numValue + variance).toFixed(precision);

    return { min, max };
  }

  /**
   * Encrypt sensitive data
   */
  static encrypt(data: string): string {
    return CryptoJS.AES.encrypt(data, this.ENCRYPTION_KEY).toString();
  }

  /**
   * Decrypt sensitive data
   */
  static decrypt(encryptedData: string): string {
    const bytes = CryptoJS.AES.decrypt(encryptedData, this.ENCRYPTION_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  }

  /**
   * Generate qualitative indicator from quantitative value
   */
  static toQualitative(value: number, thresholds: { low: number; medium: number; high: number }): 'low' | 'medium' | 'high' {
    if (value < thresholds.low) return 'low';
    if (value < thresholds.medium) return 'medium';
    return 'high';
  }

  /**
   * Generate asterisk representation based on value magnitude
   */
  static asteriskRepresentation(value: number): string {
    if (value === 0) return '*';
    const magnitude = Math.floor(Math.log10(value)) + 1;
    return '*'.repeat(Math.min(magnitude, 6));
  }

  /**
   * Mask address for privacy
   */
  static maskAddress(address: string, showFirst: number = 6, showLast: number = 4): string {
    if (!address || address.length < showFirst + showLast) {
      return '****';
    }
    return `${address.substring(0, showFirst)}...${address.substring(address.length - showLast)}`;
  }

  /**
   * Generate random delay to prevent timing analysis
   */
  static randomDelay(minMs: number = 100, maxMs: number = 500): Promise<void> {
    const delay = Math.random() * (maxMs - minMs) + minMs;
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Format percentage with privacy
   */
  static formatPrivatePercentage(value: number, precision: number = 1): string {
    const sign = value >= 0 ? '+' : '-';
    const absValue = Math.abs(value);

    if (absValue < 0.1) {
      return `${sign}*.*%`;
    }

    const formatted = absValue.toFixed(precision);
    const blurred = formatted.replace(/\d/g, (match, offset) => {
      return offset === 0 ? match : '*';
    });

    return `${sign}${blurred}%`;
  }

  /**
   * Create privacy-preserving timestamp
   */
  static privateTimestamp(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (hours < 1) return 'Just now';
    if (hours < 24) return `~${hours} hours ago`;
    if (hours < 24 * 7) return `~${Math.floor(hours / 24)} days ago`;
    return 'More than a week ago';
  }

  /**
   * Generate unique ID with prefix
   */
  static generateId(prefix: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}_${timestamp}_${random}`;
  }

  /**
   * Shorten ID for display
   */
  static shortenId(id: string, length: number = 8): string {
    if (!id || id.length <= length) return id;
    return `${id.substring(0, length)}...`;
  }

  /**
   * Obfuscate ID for privacy
   */
  static obfuscateId(id: string): string {
    if (!id) return '****';
    const hash = this.encrypt(id).substring(0, 8);
    return `0x${hash}`;
  }

  /**
   * Generate random priority within range
   */
  static generateRandomPriority(min: number = 1, max: number = 1000): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Shuffle array with random seed for reproducibility
   */
  static shuffleArray<T>(array: T[], seed?: number): T[] {
    const shuffled = [...array];
    let currentIndex = shuffled.length;
    let randomIndex: number;

    // Use seed if provided for deterministic shuffling
    let random: () => number;
    if (seed !== undefined) {
      let seedValue = seed;
      random = () => {
        seedValue = (seedValue * 9301 + 49297) % 233280;
        return seedValue / 233280;
      };
    } else {
      random = Math.random;
    }

    while (currentIndex !== 0) {
      randomIndex = Math.floor(random() * currentIndex);
      currentIndex--;
      [shuffled[currentIndex], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[currentIndex]];
    }

    return shuffled;
  }
}