/**
 * 更新前端 ABI 文件
 * 从编译后的合约 artifacts 复制最新的 ABI 到前端目录
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

const contracts = [
  {
    source: 'zk-contract/artifacts/contracts/ZKRWARegistry.sol/ZKRWARegistry.json',
    target: 'lib/contracts/abis/ZKRWARegistry.json',
    name: 'ZKRWARegistry'
  },
  {
    source: 'zk-contract/artifacts/contracts/CompositeProofVerifier.sol/CompositeProofVerifier.json',
    target: 'lib/contracts/abis/CompositeProofVerifier.json',
    name: 'CompositeProofVerifier'
  }
];

console.log('🔄 更新前端 ABI 文件...\n');

contracts.forEach(contract => {
  try {
    const sourcePath = path.join(projectRoot, contract.source);
    const targetPath = path.join(projectRoot, contract.target);
    
    // 读取源文件
    const artifact = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
    
    // 只保存 ABI 部分
    const abi = artifact.abi;
    
    // 确保目标目录存在
    const targetDir = path.dirname(targetPath);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    
    // 写入目标文件
    fs.writeFileSync(targetPath, JSON.stringify(abi, null, 2), 'utf8');
    
    console.log(`✅ ${contract.name} ABI 已更新`);
    console.log(`   源: ${contract.source}`);
    console.log(`   目标: ${contract.target}`);
    
    // 验证关键函数
    const registerIdentity = abi.find(item => item.name === 'registerIdentity');
    if (registerIdentity && contract.name === 'ZKRWARegistry') {
      const pubSignalsParam = registerIdentity.inputs.find(input => input.name === 'pubSignals');
      if (pubSignalsParam) {
        console.log(`   ✓ pubSignals 类型: ${pubSignalsParam.type}`);
        
        if (pubSignalsParam.type === 'uint256[12]') {
          console.log(`   🎉 已确认支持 12 个公共信号！`);
        } else {
          console.log(`   ⚠️ 警告: pubSignals 类型不是 uint256[12]`);
        }
      }
    }
    
    console.log('');
  } catch (error) {
    console.error(`❌ 更新 ${contract.name} ABI 失败:`);
    console.error(`   ${error.message}`);
    console.log('');
  }
});

console.log('✨ ABI 更新完成！');
