#!/bin/bash

echo "🎯 FocusBond合规系统测试"
echo "=========================="

# 测试用户地址 (使用默认的Anvil账户)
USER_ADDRESS="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
USER_PRIVATE_KEY="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"

# 合约地址
FOCUSBOND_ADDRESS="0x68B1D87F95878fE05B998F19b66F4baba5De1aed"
FOCUSCREDIT_ADDRESS="0x9A9f2CCfdE556A7E9Ff0848998Aa4a0CFD8863AE"

echo "📋 测试前状态检查:"
echo "用户ETH余额: $(cast balance $USER_ADDRESS --rpc-url http://127.0.0.1:8545 | cast from-wei) ETH"
echo "用户积分余额: $(cast call $FOCUSCREDIT_ADDRESS "balanceOf(address)" $USER_ADDRESS --rpc-url http://127.0.0.1:8545 | cast to-dec | awk '{print $1/1000000000000000000}') FCRED"

echo ""
echo "🧪 测试1: 创建2分钟专注会话"
cast send --private-key $USER_PRIVATE_KEY --rpc-url http://127.0.0.1:8545 \
  --value 0.1ether $FOCUSBOND_ADDRESS "startSession(uint16)" 2

if [ $? -eq 0 ]; then
  echo "✅ 会话创建成功"
  
  echo ""
  echo "📊 会话状态查询:"
  SESSION_DATA=$(cast call $FOCUSBOND_ADDRESS "sessions(address)" $USER_ADDRESS --rpc-url http://127.0.0.1:8545)
  echo "会话数据: $SESSION_DATA"
  
  echo ""
  echo "⏱️  等待3秒后测试中断会话..."
  sleep 3
  
  echo ""
  echo "🧪 测试2: 中断会话 (使用积分支付服务费)"
  # 计算当前费用 (基础费用100 FCRED + 20%递增)
  MAX_FEE="120000000000000000000" # 120 FCRED
  
  cast send --private-key $USER_PRIVATE_KEY --rpc-url http://127.0.0.1:8545 \
    $FOCUSBOND_ADDRESS "breakSession(uint256)" $MAX_FEE
    
  if [ $? -eq 0 ]; then
    echo "✅ 会话中断成功，积分已扣除"
  else
    echo "❌ 会话中断失败"
  fi
else
  echo "❌ 会话创建失败"
fi

echo ""
echo "📋 测试后状态检查:"
echo "用户ETH余额: $(cast balance $USER_ADDRESS --rpc-url http://127.0.0.1:8545 | cast from-wei) ETH"
echo "用户积分余额: $(cast call $FOCUSCREDIT_ADDRESS "balanceOf(address)" $USER_ADDRESS --rpc-url http://127.0.0.1:8545 | cast to-dec | awk '{print $1/1000000000000000000}') FCRED"

echo ""
echo "🔒 合规验证:"
echo "积分不可转让: $(cast call $FOCUSCREDIT_ADDRESS "isTransferable()" --rpc-url http://127.0.0.1:8545 | awk '{if($1=="0x0000000000000000000000000000000000000000000000000000000000000000") print "✅ 确认"; else print "❌ 失败"}')"

echo ""
echo "🎉 合规系统测试完成！"
echo "前端地址: http://localhost:3000"
echo "请在浏览器中连接MetaMask进行进一步测试"

echo "🎯 FocusBond合规系统测试"
echo "=========================="

# 测试用户地址 (使用默认的Anvil账户)
USER_ADDRESS="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
USER_PRIVATE_KEY="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"

# 合约地址
FOCUSBOND_ADDRESS="0x68B1D87F95878fE05B998F19b66F4baba5De1aed"
FOCUSCREDIT_ADDRESS="0x9A9f2CCfdE556A7E9Ff0848998Aa4a0CFD8863AE"

echo "📋 测试前状态检查:"
echo "用户ETH余额: $(cast balance $USER_ADDRESS --rpc-url http://127.0.0.1:8545 | cast from-wei) ETH"
echo "用户积分余额: $(cast call $FOCUSCREDIT_ADDRESS "balanceOf(address)" $USER_ADDRESS --rpc-url http://127.0.0.1:8545 | cast to-dec | awk '{print $1/1000000000000000000}') FCRED"

echo ""
echo "🧪 测试1: 创建2分钟专注会话"
cast send --private-key $USER_PRIVATE_KEY --rpc-url http://127.0.0.1:8545 \
  --value 0.1ether $FOCUSBOND_ADDRESS "startSession(uint16)" 2

if [ $? -eq 0 ]; then
  echo "✅ 会话创建成功"
  
  echo ""
  echo "📊 会话状态查询:"
  SESSION_DATA=$(cast call $FOCUSBOND_ADDRESS "sessions(address)" $USER_ADDRESS --rpc-url http://127.0.0.1:8545)
  echo "会话数据: $SESSION_DATA"
  
  echo ""
  echo "⏱️  等待3秒后测试中断会话..."
  sleep 3
  
  echo ""
  echo "🧪 测试2: 中断会话 (使用积分支付服务费)"
  # 计算当前费用 (基础费用100 FCRED + 20%递增)
  MAX_FEE="120000000000000000000" # 120 FCRED
  
  cast send --private-key $USER_PRIVATE_KEY --rpc-url http://127.0.0.1:8545 \
    $FOCUSBOND_ADDRESS "breakSession(uint256)" $MAX_FEE
    
  if [ $? -eq 0 ]; then
    echo "✅ 会话中断成功，积分已扣除"
  else
    echo "❌ 会话中断失败"
  fi
else
  echo "❌ 会话创建失败"
fi

echo ""
echo "📋 测试后状态检查:"
echo "用户ETH余额: $(cast balance $USER_ADDRESS --rpc-url http://127.0.0.1:8545 | cast from-wei) ETH"
echo "用户积分余额: $(cast call $FOCUSCREDIT_ADDRESS "balanceOf(address)" $USER_ADDRESS --rpc-url http://127.0.0.1:8545 | cast to-dec | awk '{print $1/1000000000000000000}') FCRED"

echo ""
echo "🔒 合规验证:"
echo "积分不可转让: $(cast call $FOCUSCREDIT_ADDRESS "isTransferable()" --rpc-url http://127.0.0.1:8545 | awk '{if($1=="0x0000000000000000000000000000000000000000000000000000000000000000") print "✅ 确认"; else print "❌ 失败"}')"

echo ""
echo "🎉 合规系统测试完成！"
echo "前端地址: http://localhost:3000"
echo "请在浏览器中连接MetaMask进行进一步测试"