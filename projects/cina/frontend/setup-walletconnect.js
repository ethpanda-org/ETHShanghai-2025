#!/usr/bin/env node

/**
 * WalletConnect 快速配置脚本
 * 运行: node setup-walletconnect.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔗 WalletConnect 配置助手');
console.log('========================\n');

// 检查是否已存在 .env.local
const envPath = path.join(__dirname, '.env.local');
const envExists = fs.existsSync(envPath);

if (envExists) {
  console.log('✅ 发现现有的 .env.local 文件');
  
  // 读取现有配置
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  if (envContent.includes('NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID')) {
    console.log('✅ WalletConnect 项目ID已配置');
    
    // 检查是否还是默认值
    if (envContent.includes('your_walletconnect_project_id_here')) {
      console.log('⚠️  检测到默认值，需要更新为实际的ProjectId');
      console.log('请访问 https://cloud.walletconnect.com/ 获取项目ID');
    } else {
      console.log('✅ 配置看起来正确');
    }
  } else {
    console.log('❌ 未找到 WalletConnect 配置');
    console.log('正在添加配置...');
    
    // 添加WalletConnect配置
    const newConfig = envContent + '\n# WalletConnect配置\nNEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id_here\n';
    fs.writeFileSync(envPath, newConfig);
    console.log('✅ 已添加 WalletConnect 配置模板');
  }
} else {
  console.log('📝 创建新的 .env.local 文件');
  
  const envTemplate = `# 区块链网络配置
NEXT_PUBLIC_CHAIN_ID=11155111
NEXT_PUBLIC_RPC_URL=https://rpc.sepolia.org

# 钱包连接配置 - 需要从 https://cloud.walletconnect.com/ 获取
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id_here

# 合约地址配置
NEXT_PUBLIC_DIAMOND_ADDRESS=0x2F1Cdbad93806040c353Cc87a5a48142348B6AfD
NEXT_PUBLIC_STETH_ADDRESS=0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84
NEXT_PUBLIC_FXUSD_ADDRESS=0x085a1b6da46ae375b35dea9920a276ef571e209c
NEXT_PUBLIC_WBTC_ADDRESS=0x29f2D40B0605204364af54EC677bD022dA425d03
NEXT_PUBLIC_WRMB_ADDRESS=0x795751385c9ab8f832fda7f69a83e3804ee1d7f3
NEXT_PUBLIC_USDC_ADDRESS=0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238
NEXT_PUBLIC_USDT_ADDRESS=0x29f2D40B0605204364af54EC677bD022dA425d03
`;

  fs.writeFileSync(envPath, envTemplate);
  console.log('✅ 已创建 .env.local 文件');
}

console.log('\n📋 下一步操作：');
console.log('1. 访问 https://cloud.walletconnect.com/');
console.log('2. 注册/登录账户');
console.log('3. 创建新项目');
console.log('4. 复制项目ID');
console.log('5. 更新 .env.local 文件中的 NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID');
console.log('6. 重启开发服务器');

console.log('\n🔍 验证配置：');
console.log('- 打开浏览器控制台');
console.log('- 查看是否有 "WalletConnect连接器已启用" 消息');
console.log('- 如果没有，检查项目ID是否正确');

console.log('\n📚 详细文档：');
console.log('- 查看 WALLETCONNECT_COMPLETE_GUIDE.md 获取完整指南');
console.log('- 查看 WALLETCONNECT_SETUP.md 获取快速设置说明');

console.log('\n✨ 配置完成后，你的应用将支持移动钱包连接！');

