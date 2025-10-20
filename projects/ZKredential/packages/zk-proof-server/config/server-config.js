// ZK Proof Server Configuration

export const SERVER_CONFIG = {
  // 服务器设置
  port: process.env.ZK_SERVER_PORT || 8080,
  host: process.env.ZK_SERVER_HOST || '127.0.0.1',  // 使用 IPv4 避免权限问题
  
  // 性能设置
  maxMemory: '8192', // MB
  workerThreads: 4,
  requestTimeout: 300000, // 5分钟
  
  // 多平台电路配置
  circuits: {
    propertyfy: {
      name: 'PropertyFy',
      description: 'KYC + 资产验证',
      wasmPath: './circuits/build/propertyfy/propertyfy_circuit_js/propertyfy_circuit.wasm',
      zkeyPath: './circuits/keys/propertyfy_final.zkey',
      vkeyPath: './circuits/keys/propertyfy_verification_key.json',
      publicSignalsCount: 12,
      modules: ['KYC', 'ASSET']
    },
    realt: {
      name: 'RealT',
      description: 'KYC + 反洗钱验证',
      wasmPath: './circuits/build/realt/realt_circuit_js/realt_circuit.wasm',
      zkeyPath: './circuits/keys/realt_final.zkey',
      vkeyPath: './circuits/keys/realt_verification_key.json',
      publicSignalsCount: 12,
      modules: ['KYC', 'AML']
    },
    realestate: {
      name: 'RealestateIO',
      description: 'KYC + 资产 + 反洗钱（完整合规）',
      wasmPath: './circuits/build/realestate/realestate_circuit_js/realestate_circuit.wasm',
      zkeyPath: './circuits/keys/realestate_final.zkey',
      vkeyPath: './circuits/keys/realestate_verification_key.json',
      publicSignalsCount: 16,
      modules: ['KYC', 'ASSET', 'AML']
    },
    // 默认平台
    default: 'propertyfy'
  },
  
  // 日志设置
  logging: {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    enableTimestamp: true,
    enableColors: true
  },
  
  // CORS设置
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true
  }
};

export default SERVER_CONFIG;

