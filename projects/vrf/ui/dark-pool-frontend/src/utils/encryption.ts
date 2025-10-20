import CryptoJS from 'crypto-js';

/**
 * Client-side encryption utilities for privacy protection
 */

export class EncryptionUtils {
  private static readonly STORAGE_PREFIX = 'encrypted_';
  private static readonly DEFAULT_KEY = 'dark-pool-encryption-key';

  /**
   * Get encryption key from environment or use default
   */
  private static getKey(): string {
    return import.meta.env.VITE_ENCRYPTION_KEY || this.DEFAULT_KEY;
  }

  /**
   * Encrypt sensitive data
   */
  static encrypt(data: string, customKey?: string): string {
    const key = customKey || this.getKey();
    return CryptoJS.AES.encrypt(data, key).toString();
  }

  /**
   * Decrypt sensitive data
   */
  static decrypt(encryptedData: string, customKey?: string): string {
    try {
      const key = customKey || this.getKey();
      const bytes = CryptoJS.AES.decrypt(encryptedData, key);
      return bytes.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error('Decryption failed:', error);
      return '';
    }
  }

  /**
   * Encrypt and store in localStorage
   */
  static encryptAndStore(key: string, data: any, customKey?: string): void {
    const serialized = typeof data === 'string' ? data : JSON.stringify(data);
    const encrypted = this.encrypt(serialized, customKey);
    localStorage.setItem(`${this.STORAGE_PREFIX}${key}`, encrypted);
  }

  /**
   * Retrieve and decrypt from localStorage
   */
  static retrieveAndDecrypt(key: string, customKey?: string): any {
    const encrypted = localStorage.getItem(`${this.STORAGE_PREFIX}${key}`);
    if (!encrypted) return null;

    const decrypted = this.decrypt(encrypted, customKey);
    try {
      return JSON.parse(decrypted);
    } catch {
      return decrypted;
    }
  }

  /**
   * Generate hash for data integrity
   */
  static hash(data: string): string {
    return CryptoJS.SHA256(data).toString();
  }

  /**
   * Verify data integrity
   */
  static verifyIntegrity(data: string, expectedHash: string): boolean {
    const actualHash = this.hash(data);
    return actualHash === expectedHash;
  }

  /**
   * Create secure random string
   */
  static generateSecureRandom(length: number = 32): string {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Derive key from password
   */
  static deriveKey(password: string, salt: string): string {
    return CryptoJS.PBKDF2(password, salt, {
      keySize: 256/32,
      iterations: 10000
    }).toString();
  }

  /**
   * Encrypt object with nested structure
   */
  static encryptObject(obj: any, excludeKeys: string[] = []): any {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    const encrypted: any = Array.isArray(obj) ? [] : {};

    for (const [key, value] of Object.entries(obj)) {
      if (excludeKeys.includes(key)) {
        encrypted[key] = value;
      } else if (typeof value === 'string') {
        encrypted[key] = this.encrypt(value);
      } else if (typeof value === 'number') {
        encrypted[key] = this.encrypt(value.toString());
      } else if (typeof value === 'object') {
        encrypted[key] = this.encryptObject(value, excludeKeys);
      } else {
        encrypted[key] = value;
      }
    }

    return encrypted;
  }

  /**
   * Decrypt object with nested structure
   */
  static decryptObject(obj: any, excludeKeys: string[] = []): any {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    const decrypted: any = Array.isArray(obj) ? [] : {};

    for (const [key, value] of Object.entries(obj)) {
      if (excludeKeys.includes(key)) {
        decrypted[key] = value;
      } else if (typeof value === 'string') {
        try {
          const decryptedValue = this.decrypt(value);
          decrypted[key] = isNaN(parseFloat(decryptedValue)) ? decryptedValue : parseFloat(decryptedValue);
        } catch {
          decrypted[key] = value;
        }
      } else if (typeof value === 'object') {
        decrypted[key] = this.decryptObject(value, excludeKeys);
      } else {
        decrypted[key] = value;
      }
    }

    return decrypted;
  }

  /**
   * Create HMAC signature for message authentication
   */
  static createHMAC(message: string, key?: string): string {
    const hmacKey = key || this.getKey();
    return CryptoJS.HmacSHA256(message, hmacKey).toString();
  }

  /**
   * Verify HMAC signature
   */
  static verifyHMAC(message: string, signature: string, key?: string): boolean {
    const expectedSignature = this.createHMAC(message, key);
    return signature === expectedSignature;
  }

  /**
   * Clear all encrypted data from storage
   */
  static clearEncryptedStorage(): void {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(this.STORAGE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  }

  /**
   * Check if data is encrypted
   */
  static isEncrypted(data: string): boolean {
    try {
      const parts = data.split(':');
      return parts.length >= 3;
    } catch {
      return false;
    }
  }
}