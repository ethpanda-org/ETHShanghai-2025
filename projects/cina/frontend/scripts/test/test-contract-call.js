// 在浏览器控制台中运行此代码来测试合约调用
async function testContractCall() {
  // 这些值来自你的环境配置
  const userAddress = '0x5c0fB5a2d503E9EEAb8942A679fb148875e4698A';
  const poolManager = '0xbb644076500ea106d9029b382c4d49f56225cb82';
  const pool = '0xAb20B978021333091CA307BB09E022Cec26E8608';
  const wrmb = '0x795751385c9ab8f832fda7f69a83e3804ee1d7f3';
  
  console.log('=== 测试合约调用 ===');
  
  // 1. 检查WRMB余额
  try {
    const response = await fetch('https://sepolia.infura.io/v3/726930ebd0e248ff94a8da1ce85ee33a', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_call',
        params: [{
          to: wrmb,
          data: '0x70a08231000000000000000000000000' + userAddress.slice(2) // balanceOf(address)
        }, 'latest'],
        id: 1
      })
    });
    
    const result = await response.json();
    const balance = BigInt(result.result || '0x0');
    console.log('WRMB余额:', balance.toString());
    console.log('余额充足 (>= 1 ETH):', balance >= BigInt('1000000000000000000'));
    
    if (balance < BigInt('1000000000000000000')) {
      console.log('❌ WRMB余额不足！这可能是revert的原因。');
      console.log('解决方案: 获取更多WRMB测试代币');
      return;
    }
    
  } catch (error) {
    console.log('余额检查失败:', error);
  }
  
  // 2. 检查授权
  try {
    const response = await fetch('https://sepolia.infura.io/v3/726930ebd0e248ff94a8da1ce85ee33a', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_call',
        params: [{
          to: wrmb,
          data: '0xdd62ed3e000000000000000000000000' + userAddress.slice(2) + '000000000000000000000000' + poolManager.slice(2) // allowance(owner, spender)
        }, 'latest'],
        id: 2
      })
    });
    
    const result = await response.json();
    const allowance = BigInt(result.result || '0x0');
    console.log('WRMB授权:', allowance.toString());
    console.log('授权充足 (>= 1 ETH):', allowance >= BigInt('1000000000000000000'));
    
    if (allowance < BigInt('1000000000000000000')) {
      console.log('❌ WRMB授权不足！这可能是revert的原因。');
      console.log('解决方案: 先调用approve函数授权');
      return;
    }
    
  } catch (error) {
    console.log('授权检查失败:', error);
  }
  
  console.log('✅ 基本检查通过，revert可能由其他原因造成');
  console.log('可能的其他原因:');
  console.log('1. Pool不支持WRMB作为抵押代币');
  console.log('2. Pool已暂停或有其他限制');
  console.log('3. 参数超出允许范围');
  console.log('4. 合约逻辑错误');
}

// 运行测试
testContractCall();