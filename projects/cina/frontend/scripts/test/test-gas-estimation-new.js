// 测试新的gas估算逻辑
const { createPublicClient, http, parseEther } = require('viem');
const { sepolia } = require('viem/chains');

async function testNewGasEstimation() {
  const client = createPublicClient({
    chain: sepolia,
    transport: http('https://sepolia.infura.io/v3/726930ebd0e248ff94a8da1ce85ee33a')
  });

  // 模拟新的gas估算函数
  async function estimateGasWithBuffer(account, to, data, value = 0n) {
    try {
      const estimatedGas = await client.estimateGas({
        account,
        to,
        data,
        value,
      });

      // 添加20%缓冲
      const gasWithBuffer = (estimatedGas * 120n) / 100n;

      // 网络限制（Sepolia约16.7M）
      const networkGasLimit = 16777216n;
      
      if (gasWithBuffer > networkGasLimit) {
        console.warn(`估算gas ${gasWithBuffer.toString()} 超过网络限制，使用网络限制`);
        return networkGasLimit;
      }

      console.log(`Gas估算: ${estimatedGas.toString()} -> ${gasWithBuffer.toString()} (含20%缓冲)`);
      return gasWithBuffer;
    } catch (error) {
      console.warn('Gas估算失败，将让钱包自动估算:', error.message);
      return undefined; // 返回undefined让钱包自己估算
    }
  }

  try {
    console.log('测试连接到Sepolia...');
    const blockNumber = await client.getBlockNumber();
    console.log('最新区块:', blockNumber.toString());

    // 测试简单转账的gas估算
    console.log('\n测试简单转账gas估算:');
    const simpleGas = await estimateGasWithBuffer(
      '0x5c0fB5a2d503E9EEAb8942A679fb148875e4698A',
      '0x5c0fB5a2d503E9EEAb8942A679fb148875e4698A',
      '0x',
      0n
    );
    
    if (simpleGas !== undefined) {
      console.log('简单转账gas估算成功:', simpleGas.toString());
      console.log('是否在合理范围:', simpleGas < 100000n ? '是' : '否');
    }

    // 测试复杂合约调用的gas估算（模拟）
    console.log('\n测试复杂合约调用gas估算:');
    const complexGas = await estimateGasWithBuffer(
      '0x5c0fB5a2d503E9EEAb8942A679fb148875e4698A',
      '0xbb644076500ea106d9029b382c4d49f56225cb82', // PoolManager
      '0xc1c8f15b000000000000000000000000ab20b978021333091ca307bb09e022cec26e860800000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008ac7230489e800000000000000000000000000000000000000000000000000004563918244f40000',
      0n
    );
    
    if (complexGas !== undefined) {
      console.log('复杂调用gas估算成功:', complexGas.toString());
    } else {
      console.log('复杂调用gas估算失败，将使用钱包自动估算');
    }

  } catch (error) {
    console.error('测试失败:', error);
  }
}

testNewGasEstimation();