/**
 * 多平台证明生成器
 * 根据不同平台使用不同的电路
 */

import { ProofGenerator } from './proof-generator.js';
import SERVER_CONFIG from '../config/server-config.js';
import { validateAndCleanFields } from '../utils/field-validator.js';
import fs from 'fs';

export class MultiPlatformProofGenerator {
  constructor() {
    this.generators = {};
    this.initializeGenerators();
  }

  /**
   * 初始化所有平台的证明生成器
   */
  initializeGenerators() {
    const platforms = ['propertyfy', 'realt', 'realestate'];
    
    for (const platform of platforms) {
      const config = SERVER_CONFIG.circuits[platform];
      if (!config) {
        console.warn(`⚠️ 平台 ${platform} 配置不存在`);
        continue;
      }

      // 检查电路文件是否存在
      const wasmExists = fs.existsSync(config.wasmPath);
      
      if (wasmExists) {
        try {
          // ProofGenerator 需要完整的配置对象
          this.generators[platform] = new ProofGenerator({
            circuits: {
              basePath: './circuits',  // 添加 basePath
              wasmPath: config.wasmPath,
              zkeyPath: config.zkeyPath,
              vkeyPath: config.vkeyPath
            }
          });
          console.log(`✅ ${config.name} (${platform}) 证明生成器已初始化`);
        } catch (error) {
          console.error(`❌ ${platform} 证明生成器初始化失败:`, error.message);
        }
      } else {
        console.warn(`⚠️ ${platform} 电路文件不存在: ${config.wasmPath}，将使用模拟证明`);
      }
    }
  }

  /**
   * 获取平台信息
   */
  getPlatformInfo(platform) {
    const config = SERVER_CONFIG.circuits[platform];
    if (!config) {
      throw new Error(`不支持的平台: ${platform}`);
    }
    
    return {
      platform,
      name: config.name,
      description: config.description,
      modules: config.modules,
      publicSignalsCount: config.publicSignalsCount,
      available: !!this.generators[platform]
    };
  }

  /**
   * 获取所有平台信息
   */
  getAllPlatforms() {
    return ['propertyfy', 'realt', 'realestate'].map(platform => 
      this.getPlatformInfo(platform)
    );
  }

  /**
   * 根据平台生成证明
   */
  async generateProof(platform, zkInput) {
    // 获取平台配置
    const config = SERVER_CONFIG.circuits[platform];
    if (!config) {
      throw new Error(`不支持的平台: ${platform}`);
    }

    console.log(`🚀 为平台 ${config.name} (${platform}) 生成证明...`);
    console.log(`📋 模块: ${config.modules.join(' + ')}`);

    // ✅ 验证并清理字段（关键修复！）
    const validation = validateAndCleanFields(platform, zkInput);
    if (!validation.valid) {
      throw new Error(`${platform} 平台缺少必需字段: ${validation.missingFields.join(', ')}`);
    }
    
    const cleanedInput = validation.cleanedInput;
    console.log(`🧹 字段清理完成，输入字段数: ${Object.keys(cleanedInput).length}`);

    // 获取对应的证明生成器
    const generator = this.generators[platform];
    if (!generator) {
      console.warn(`⚠️ ${platform} 证明生成器不可用，使用模拟证明`);
      return this.generateMockProof(platform, cleanedInput);
    }

    try {
      // 生成真实证明
      const proof = await generator.generateProof(cleanedInput);
      
      // 添加平台信息
      proof.platform = platform;
      proof.platformName = config.name;
      proof.modules = config.modules;
      
      return proof;
    } catch (error) {
      console.error(`❌ ${platform} 真实证明生成失败:`, error.message);
      console.log(`🎭 降级到模拟证明...`);
      return this.generateMockProof(platform, cleanedInput);
    }
  }

  /**
   * 生成模拟证明
   */
  generateMockProof(platform, zkInput) {
    const config = SERVER_CONFIG.circuits[platform];
    const generator = this.generators[SERVER_CONFIG.circuits.default];
    
    if (generator && generator.generateMockProof) {
      const mockProof = generator.generateMockProof(zkInput);
      mockProof.platform = platform;
      mockProof.platformName = config.name;
      mockProof.modules = config.modules;
      mockProof.warning = `使用模拟证明 (${platform} 电路不可用)`;
      return mockProof;
    }

    throw new Error(`无法生成 ${platform} 的证明`);
  }

  /**
   * 验证证明
   */
  async verifyProof(platform, proofResult) {
    const generator = this.generators[platform];
    if (!generator) {
      throw new Error(`${platform} 证明生成器不可用`);
    }

    return await generator.verifyProof(proofResult);
  }

  /**
   * 健康检查
   */
  healthCheck() {
    const platforms = this.getAllPlatforms();
    const availableCount = platforms.filter(p => p.available).length;
    
    return {
      status: availableCount > 0 ? 'healthy' : 'degraded',
      platforms,
      availableCount,
      totalCount: platforms.length,
      memory: process.memoryUsage(),
      timestamp: Date.now()
    };
  }
}

// 导出单例
export const multiPlatformProofGenerator = new MultiPlatformProofGenerator();

