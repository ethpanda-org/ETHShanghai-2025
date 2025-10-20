import { publicClient, META, getOperateConfig } from '../../lib/position';
import { parseAbi, encodeFunctionData } from 'viem';

// 调试合约revert原因
export async function debugRevertReason(userAddress: `0x${string}`) {
  console.log('=== 调试合约Revert原因 ===');
  
  const { poolManager, pool } = getOperateConfig();
  
  console.log('配置信息:');
  console.log('- User:', userAddress);
  console.log('- PoolManager:', poolManager);
  console.log('- Pool:', pool);
  console.log('- WRMB Token:', META.tokens.WRMB);
  
  try {
    // 1. 检查用户WRMB余额
    console.log('\n1. 检查用户WRMB余额:');
    const balance = await publicClient.readContract({
      address: META.tokens.WRMB,
      abi: parseAbi(['function balanceOf(address) view returns (uint256)']),
      functionName: 'balanceOf',
      args: [userAddress]
    });
    console.log('- WRMB余额:', balance.toString());
    
    // 2. 检查授权
    console.log('\n2. 检查WRMB授权:');
    const allowance = await publicClient.readContract({
      address: META.tokens.WRMB,
      abi: parseAbi(['function allowance(address,address) view returns (uint256)']),
      functionName: 'allowance',
      args: [userAddress, poolManager]
    });
    console.log('- 授权给PoolManager:', allowance.toString());
    
    // 3. 检查Pool基本信息
    console.log('\n3. 检查Pool信息:');
    try {
      const collateralToken = await publicClient.readContract({
        address: pool,
        abi: parseAbi(['function collateralToken() view returns (address)']),
        functionName: 'collateralToken'
      });
      console.log('- Pool抵押代币:', collateralToken);
      console.log('- 是否匹配WRMB:', collateralToken.toLowerCase() === META.tokens.WRMB.toLowerCase());
    } catch (error) {
      console.log('- Pool信息读取失败:', error);
    }
    
    // 4. 尝试不同的参数组合
    console.log('\n4. 测试不同参数:');
    
    const testCases = [
      { name: '原始参数', collateral: 1000000000000000000n, debt: 500000000000000000n },
      { name: '更小金额', collateral: 100000000000000000n, debt: 50000000000000000n },
      { name: '只存抵押', collateral: 1000000000000000000n, debt: 0n },
      { name: '最小金额', collateral: 1000000000000000n, debt: 0n },
    ];
    
    for (const testCase of testCases) {
      try {
        console.log(`\n测试 ${testCase.name}:`);
        console.log(`- 抵押: ${testCase.collateral.toString()}`);
        console.log(`- 债务: ${testCase.debt.toString()}`);
        
        const result = await publicClient.simulateContract({
          address: poolManager,
          abi: parseAbi(['function operate(address,uint256,int256,int256)']),
          functionName: 'operate',
          args: [
            pool,
            0n, // positionId
            testCase.collateral as unknown as bigint, // int256
            testCase.debt as unknown as bigint       // int256
          ],
          account: userAddress
        });
        
        console.log(`- ✅ ${testCase.name} 模拟成功`);
      } catch (error) {
        console.log(`- ❌ ${testCase.name} 模拟失败:`, error instanceof Error ? error.message : error);
        
        // 尝试解析具体错误
        if (error instanceof Error) {
          const message = error.message.toLowerCase();
          if (message.includes('insufficient')) {
            console.log('  -> 可能原因: 余额不足');
          } else if (message.includes('allowance')) {
            console.log('  -> 可能原因: 授权不足');
          } else if (message.includes('paused')) {
            console.log('  -> 可能原因: 合约暂停');
          } else if (message.includes('invalid')) {
            console.log('  -> 可能原因: 参数无效');
          } else if (message.includes('zero')) {
            console.log('  -> 可能原因: 零地址或零金额');
          }
        }
      }
    }
    
    // 5. 检查合约是否暂停
    console.log('\n5. 检查合约状态:');
    try {
      // 尝试读取常见的暂停状态
      const isPaused = await publicClient.readContract({
        address: poolManager,
        abi: parseAbi(['function paused() view returns (bool)']),
        functionName: 'paused'
      });
      console.log('- 合约是否暂停:', isPaused);
    } catch (error) {
      console.log('- 无法读取暂停状态（可能没有此函数）');
    }
    
  } catch (error) {
    console.error('调试过程中发生错误:', error);
  }
  
  console.log('\n=== 调试完成 ===');
}

// 简化版本 - 只检查关键信息
export async function quickDebug(userAddress: `0x${string}`) {
  const { poolManager, pool } = getOperateConfig();
  
  console.log('=== 快速调试 ===');
  
  try {
    // 检查余额
    const balance = await publicClient.readContract({
      address: META.tokens.WRMB,
      abi: parseAbi(['function balanceOf(address) view returns (uint256)']),
      functionName: 'balanceOf',
      args: [userAddress]
    });
    
    // 检查授权
    const allowance = await publicClient.readContract({
      address: META.tokens.WRMB,
      abi: parseAbi(['function allowance(address,address) view returns (uint256)']),
      functionName: 'allowance',
      args: [userAddress, poolManager]
    });
    
    console.log('余额:', balance.toString());
    console.log('授权:', allowance.toString());
    console.log('余额充足:', balance >= 1000000000000000000n);
    console.log('授权充足:', allowance >= 1000000000000000000n);
    
    return {
      balance,
      allowance,
      hasBalance: balance >= 1000000000000000000n,
      hasAllowance: allowance >= 1000000000000000000n
    };
  } catch (error) {
    console.error('快速调试失败:', error);
    return null;
  }
}