// 测试gas安全限制
function testGasSafety() {
  // 模拟我们的安全gas限制逻辑
  function applySafeGasLimit(estimatedGas, isERC20 = false) {
    if (estimatedGas === undefined) {
      return isERC20 ? 100000n : 8000000n;
    }
    
    if (isERC20) {
      // ERC20 approve限制在200k
      return estimatedGas > 200000n ? 200000n : estimatedGas;
    } else {
      // 复杂合约调用限制在15M
      return estimatedGas > 15000000n ? 15000000n : estimatedGas;
    }
  }

  console.log('=== Gas安全限制测试 ===');
  
  // 测试各种情况
  const testCases = [
    { name: 'ERC20 正常估算', gas: 50000n, isERC20: true },
    { name: 'ERC20 过高估算', gas: 500000n, isERC20: true },
    { name: 'ERC20 估算失败', gas: undefined, isERC20: true },
    { name: '合约调用正常估算', gas: 5000000n, isERC20: false },
    { name: '合约调用过高估算', gas: 20000000n, isERC20: false },
    { name: '合约调用估算失败', gas: undefined, isERC20: false },
  ];

  testCases.forEach(testCase => {
    const result = applySafeGasLimit(testCase.gas, testCase.isERC20);
    const isUnderLimit = result <= 16777216n; // Sepolia限制
    
    console.log(`${testCase.name}:`);
    console.log(`  输入: ${testCase.gas?.toString() || 'undefined'}`);
    console.log(`  输出: ${result.toString()}`);
    console.log(`  安全: ${isUnderLimit ? '✓' : '✗'}`);
    console.log('');
  });

  console.log('所有测试用例都应该显示"安全: ✓"');
}

testGasSafety();