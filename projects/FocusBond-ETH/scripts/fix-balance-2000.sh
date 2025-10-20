#!/bin/bash

# Fix user balance to exactly 2000 FOCUS and 1 ETH
# This script uses a different approach to set the balance correctly

USER_ADDRESS="0x891402c216Dbda3eD7BEB0f95Dd89b010523642A"
DEPLOYER_PRIVATE_KEY="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
DEPLOYER_ADDRESS="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"

# Contract addresses (from latest deployment)
FOCUS_TOKEN="0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"
RPC_URL="http://127.0.0.1:8545"

echo "=== 修复用户余额为2000 FOCUS ==="
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

# Step 2: Use a different approach - manually calculate the adjustment needed
echo "步骤2: 计算需要调整的金额"
TARGET_FOCUS=2000
DIFFERENCE=$(python3 -c "print($TARGET_FOCUS - $FOCUS_BALANCE)")
echo "需要调整: $DIFFERENCE FOCUS"

if [ "$(echo "$DIFFERENCE < 0" | bc)" -eq 1 ]; then
    echo "当前余额超过目标值，需要销毁 $(echo "-1 * $DIFFERENCE" | bc) FOCUS"
    # Try to revoke the excess amount
    REVOKE_AMOUNT_WEI=$(python3 -c "print(int(-1 * $DIFFERENCE * 10**18))")
    
    echo "尝试销毁多余代币..."
    cast send $FOCUS_TOKEN \
        "revokeCredits(address,uint256,string)" \
        $USER_ADDRESS \
        $REVOKE_AMOUNT_WEI \
        "Adjust balance to 2000" \
        --private-key $DEPLOYER_PRIVATE_KEY \
        --rpc-url $RPC_URL \
        --gas-limit 300000
    
    echo "✅ 已尝试销毁多余代币"
    
elif [ "$(echo "$DIFFERENCE > 0" | bc)" -eq 1 ]; then
    echo "当前余额不足，需要发放 $DIFFERENCE FOCUS"
    GRANT_AMOUNT_WEI=$(python3 -c "print(int($DIFFERENCE * 10**18))")
    
    cast send $FOCUS_TOKEN \
        "grantCredits(address,uint256,string)" \
        $USER_ADDRESS \
        $GRANT_AMOUNT_WEI \
        "Adjust balance to 2000" \
        --private-key $DEPLOYER_PRIVATE_KEY \
        --rpc-url $RPC_URL
    
    echo "✅ 已发放不足部分"
else
    echo "✅ 当前余额已经是2000 FOCUS，无需调整"
fi
echo ""

# Step 3: Send 1 ETH if needed
echo "步骤3: 确保ETH余额为1 ETH"
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

# Step 4: Verify final balances
echo "步骤4: 验证最终余额"
FOCUS_BALANCE_HEX=$(cast call $FOCUS_TOKEN "balanceOf(address)" $USER_ADDRESS --rpc-url $RPC_URL)
FOCUS_BALANCE_DEC=$(python3 -c "print(int('$FOCUS_BALANCE_HEX', 16))")
FOCUS_BALANCE=$(python3 -c "print($FOCUS_BALANCE_DEC / 10**18)")
echo "最终FOCUS余额: $FOCUS_BALANCE FOCUS"

ETH_BALANCE=$(cast balance $USER_ADDRESS --rpc-url $RPC_URL)
ETH_BALANCE_ETH=$(cast --to-unit $ETH_BALANCE ether)
echo "最终ETH余额: $ETH_BALANCE_ETH ETH"
echo ""

# Step 5: Summary
echo "=== 余额修复完成! ==="
if [ "$(echo "$FOCUS_BALANCE == 2000" | bc)" -eq 1 ]; then
    echo "✅ FOCUS余额已成功设置为2000"
else
    echo "⚠️  FOCUS余额设置不理想，当前为 $FOCUS_BALANCE"
    echo "可能需要手动处理销毁逻辑"
fi
echo "ETH余额: $ETH_BALANCE_ETH ETH"