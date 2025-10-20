#!/bin/bash

# Correct reset script using FocusBond contract to redeem credits
USER_ADDRESS="0x891402c216Dbda3eD7BEB0f95Dd89b010523642A"
DEPLOYER_PRIVATE_KEY="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"

# Contract addresses
FOCUS_TOKEN="0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"
FOCUS_BOND="0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"
RPC_URL="http://127.0.0.1:8545"

echo "=== 使用FocusBond合约正确重置余额 ==="
echo "用户地址: $USER_ADDRESS"
echo ""

# Step 1: Check current balance
echo "步骤1: 检查当前余额"
FOCUS_BALANCE_HEX=$(cast call $FOCUS_TOKEN "balanceOf(address)" $USER_ADDRESS --rpc-url $RPC_URL)
FOCUS_BALANCE_DEC=$(python3 -c "print(int('$FOCUS_BALANCE_HEX', 16))")
FOCUS_BALANCE=$(python3 -c "print($FOCUS_BALANCE_DEC / 10**18)")
echo "当前FOCUS余额: $FOCUS_BALANCE FOCUS"

ETH_BALANCE=$(cast balance $USER_ADDRESS --rpc-url $RPC_URL)
ETH_BALANCE_ETH=$(cast --to-unit $ETH_BALANCE ether)
echo "当前ETH余额: $ETH_BALANCE_ETH ETH"
echo ""

# Step 2: Calculate the amount to redeem to get to 2000
echo "步骤2: 计算需要销毁的金额"
TARGET_FOCUS=2000
EXCESS_FOCUS=$(python3 -c "print($FOCUS_BALANCE - $TARGET_FOCUS)")

if [ "$(echo "$EXCESS_FOCUS > 0" | bc)" -eq 1 ]; then
    echo "需要销毁 $EXCESS_FOCUS FOCUS 才能达到目标2000"
    
    # Try to redeem through FocusBond contract
    REDEEM_AMOUNT_WEI=$(python3 -c "print(int($EXCESS_FOCUS * 10**18))")
    
    echo "尝试通过FocusBond合约销毁多余代币..."
    cast send $FOCUS_BOND \
        "redeemUserCredits(address,uint256,string)" \
        $USER_ADDRESS \
        $REDEEM_AMOUNT_WEI \
        "Reset balance to 2000" \
        --private-key $DEPLOYER_PRIVATE_KEY \
        --rpc-url $RPC_URL
    
    echo "✅ 已尝试销毁多余代币"
else
    echo "✅ 当前余额已经是2000或更少，无需销毁"
fi
echo ""

# Step 3: If we still need to adjust, use grantCredits
echo "步骤3: 检查是否需要补充余额"
FOCUS_BALANCE_HEX=$(cast call $FOCUS_TOKEN "balanceOf(address)" $USER_ADDRESS --rpc-url $RPC_URL)
FOCUS_BALANCE_DEC=$(python3 -c "print(int('$FOCUS_BALANCE_HEX', 16))")
FOCUS_BALANCE=$(python3 -c "print($FOCUS_BALANCE_DEC / 10**18)")

if [ "$(echo "$FOCUS_BALANCE < $TARGET_FOCUS" | bc)" -eq 1 ]; then
    GRANT_AMOUNT=$(python3 -c "print($TARGET_FOCUS - $FOCUS_BALANCE)")
    GRANT_AMOUNT_WEI=$(python3 -c "print(int($GRANT_AMOUNT * 10**18))")
    
    echo "需要补充 $GRANT_AMOUNT FOCUS 才能达到目标2000"
    
    cast send $FOCUS_TOKEN \
        "grantCredits(address,uint256,string)" \
        $USER_ADDRESS \
        $GRANT_AMOUNT_WEI \
        "Adjust balance to 2000" \
        --private-key $DEPLOYER_PRIVATE_KEY \
        --rpc-url $RPC_URL
    
    echo "✅ 已补充不足部分"
else
    echo "✅ 当前余额已达到目标"
fi
echo ""

# Step 4: Send 1 ETH if needed
echo "步骤4: 确保ETH余额为1 ETH"
TARGET_ETH="1.0"
CURRENT_ETH=$(echo "$ETH_BALANCE_ETH" | sed 's/ ETH//')

if [ "$(echo "$CURRENT_ETH < $TARGET_ETH" | bc)" -eq 1 ]; then
    ETH_TO_SEND=$(python3 -c "print($TARGET_ETH - $CURRENT_ETH)")
    echo "需要发送 $ETH_TO_SEND ETH"
    
    cast send $USER_ADDRESS \
        --value $(cast --to-wei $ETH_TO_SEND ether) \
        --private-key $DEPLOYER_PRIVATE_KEY \
        --rpc-url $RPC_URL
    
    echo "✅ 已补充ETH余额"
else
    echo "✅ 当前ETH余额足够，无需调整"
fi
echo ""

# Step 5: Verify final balances
echo "步骤5: 验证最终余额"
FOCUS_BALANCE_HEX=$(cast call $FOCUS_TOKEN "balanceOf(address)" $USER_ADDRESS --rpc-url $RPC_URL)
FOCUS_BALANCE_DEC=$(python3 -c "print(int('$FOCUS_BALANCE_HEX', 16))")
FOCUS_BALANCE=$(python3 -c "print($FOCUS_BALANCE_DEC / 10**18)")
echo "最终FOCUS余额: $FOCUS_BALANCE FOCUS"

ETH_BALANCE=$(cast balance $USER_ADDRESS --rpc-url $RPC_URL)
ETH_BALANCE_ETH=$(cast --to-unit $ETH_BALANCE ether)
echo "最终ETH余额: $ETH_BALANCE_ETH ETH"
echo ""

echo "=== 余额重置完成! ==="