import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function exportABIs() {
  console.log('📝 导出合约ABIs...');
  
  try {
    // 确保artifacts目录存在
    const artifactsPath = path.join(__dirname, '../artifacts/contracts');
    if (!fs.existsSync(artifactsPath)) {
      console.log('❌ 请先运行 npm run compile-contracts 编译合约');
      return;
    }
    
    // 创建ABIs目录
    const abisDir = path.join(__dirname, '../lib/contracts/abis');
    if (!fs.existsSync(abisDir)) {
      fs.mkdirSync(abisDir, { recursive: true });
    }
    
    // 导出ZKRWAToken ABI
    const zkrwaTokenPath = path.join(artifactsPath, 'ZKRWAToken.sol/ZKRWAToken.json');
    if (fs.existsSync(zkrwaTokenPath)) {
      const zkrwaTokenArtifact = JSON.parse(fs.readFileSync(zkrwaTokenPath, 'utf8'));
      fs.writeFileSync(
        path.join(abisDir, 'ZKRWAToken.json'),
        JSON.stringify(zkrwaTokenArtifact.abi, null, 2)
      );
      console.log('✅ ZKRWAToken ABI 已导出');
    }
    
    // 导出ZKRWAAssetFactory ABI
    const factoryPath = path.join(artifactsPath, 'ZKRWAAssetFactory.sol/ZKRWAAssetFactory.json');
    if (fs.existsSync(factoryPath)) {
      const factoryArtifact = JSON.parse(fs.readFileSync(factoryPath, 'utf8'));
      fs.writeFileSync(
        path.join(abisDir, 'ZKRWAAssetFactory.json'),
        JSON.stringify(factoryArtifact.abi, null, 2)
      );
      console.log('✅ ZKRWAAssetFactory ABI 已导出');
    }
    
    // 更新TypeScript ABI文件
    const abiAutoPath = path.join(__dirname, '../lib/contracts/abis-auto.ts');
    let abiContent = `// 🤖 此文件由 scripts/export-abis.js 自动生成
// ⚠️  请勿手动编辑！每次编译后会自动更新
// 
// 最后更新: ${new Date().toISOString()}

`;
    
    // 添加现有的ZKRWA_REGISTRY_ABI
    if (fs.existsSync(path.join(abisDir, 'ZKRWARegistry.json'))) {
      const registryAbi = JSON.parse(fs.readFileSync(path.join(abisDir, 'ZKRWARegistry.json'), 'utf8'));
      abiContent += `export const ZKRWA_REGISTRY_ABI = ${JSON.stringify(registryAbi, null, 2)} as const;\n\n`;
    }
    
    // 添加ZKRWAToken ABI
    if (fs.existsSync(path.join(abisDir, 'ZKRWAToken.json'))) {
      const tokenAbi = JSON.parse(fs.readFileSync(path.join(abisDir, 'ZKRWAToken.json'), 'utf8'));
      abiContent += `export const ZKRWA_TOKEN_ABI = ${JSON.stringify(tokenAbi, null, 2)} as const;\n\n`;
    }
    
    // 添加ZKRWAAssetFactory ABI
    if (fs.existsSync(path.join(abisDir, 'ZKRWAAssetFactory.json'))) {
      const factoryAbi = JSON.parse(fs.readFileSync(path.join(abisDir, 'ZKRWAAssetFactory.json'), 'utf8'));
      abiContent += `export const ZKRWA_ASSET_FACTORY_ABI = ${JSON.stringify(factoryAbi, null, 2)} as const;\n\n`;
    }
    
    fs.writeFileSync(abiAutoPath, abiContent);
    console.log('✅ TypeScript ABI文件已更新');
    
    console.log('🎉 ABI导出完成！');
    
  } catch (error) {
    console.error('❌ ABI导出失败:', error);
  }
}

exportABIs();
