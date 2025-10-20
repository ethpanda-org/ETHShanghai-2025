// 检查合约状态的简单工具
import { publicClient } from '../../lib/position';
import { parseAbi } from 'viem';

export async function checkContractState() {
  const poolManager = '0xbb644076500ea106d9029b382c4d49f56225cb82';
  const pool = '0xAb20B978021333091CA307BB09E022Cec26E8608';
  const wrmb = '0x795751385c9ab8f832fda7f69a83e3804ee1d7f3';
  
  console.log('=== 合约状态检查 ===');
  
  try {
    // 1. 检查合约是否存在
    const poolManagerCode = await publicClient.getBytecode({ address: poolManager });
    const poolCode = await publicClient.getBytecode({ address: pool });
    const wrmbCode = await publicClient.getBytecode({ address: wrmb });
    
    console.log('PoolManager合约存在:', !!poolManagerCode && poolManagerCode !== '0x');
    console.log('Pool合约存在:', !!poolCode && poolCode !== '0x');
    console.log('WRMB合约存在:', !!wrmbCode && wrmbCode !== '0x');
    
    // 2. 检查WRMB代币基本信息
    try {
      const name = await publicClient.readContract({
        address: wrmb,
        abi: parseAbi(['function name() view returns (string)']),
        functionName: 'name'
      });
      
      const symbol = await publicClient.readContract({
        address: wrmb,
        abi: parseAbi(['function symbol() view returns (string)']),
        functionName: 'symbol'
      });
      
      const decimals = await publicClient.readContract({
        address: wrmb,
        abi: parseAbi(['function decimals() view returns (uint8)']),
        functionName: 'decimals'
      });
      
      console.log('WRMB代币信息:');
      console.log('- 名称:', name);
      console.log('- 符号:', symbol);
      console.log('- 小数位:', decimals);
    } catch (error) {
      console.log('WRMB代币信息读取失败:', error);
    }
    
    // 3. 检查Pool的抵押代币
    try {
      const collateralToken = await publicClient.readContract({
        address: pool,
        abi: parseAbi(['function collateralToken() view returns (address)']),
        functionName: 'collateralToken'
      });
      
      console.log('Pool抵押代币:', collateralToken);
      console.log('是否为WRMB:', collateralToken.toLowerCase() === wrmb.toLowerCase());
    } catch (error) {
      console.log('Pool抵押代币读取失败:', error);
    }
    
    // 4. 检查网络状态
    const chainId = await publicClient.getChainId();
    const blockNumber = await publicClient.getBlockNumber();
    
    console.log('网络信息:');
    console.log('- 链ID:', chainId);
    console.log('- 最新区块:', blockNumber.toString());
    
  } catch (error) {
    console.error('合约状态检查失败:', error);
  }
}

// 在浏览器控制台中运行
if (typeof window !== 'undefined') {
  (window as any).checkContractState = checkContractState;
}