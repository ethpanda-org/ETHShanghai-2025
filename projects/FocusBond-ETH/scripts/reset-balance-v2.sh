#!/bin/bash

# Reset user balance and redistribute tokens
# This script clears the user's FOCUS balance and redistributes 2000 FOCUS and 1 ETH

USER_ADDRESS="0x891402c216Dbda3eD7BEB0f95Dd89b010523642A"
DEPLOYER_PRIVATE_KEY="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
DEPLOYER_ADDRESS="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"

# Contract addresses (from latest deployment)
FOCUS_TOKEN="0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"
USDC_TOKEN="0x5FbDB2315678afecb367f032d93F642f64180aa3"
FOCUS_BOND="0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"
RPC_URL="http://127.0.0.1:8545"

echo "=== 重置用户余额 (版本2) ==="
echo "用户地址: $USER_ADDRESS"
echo ""

# Step 1: Check current balance
echo "步骤1: 检查当前余额"
FOCUS_BALANCE_HEX=$(cast call $FOCUS_TOKEN "balanceOf(address)" $USER_ADDRESS --rpc-url $RPC_URL)
FOCUS_BALANCE_DEC=$(python3 -c "print(int('$FOCUS_BALANCE_HEX', 16))")
FOCUS_BALANCE=$(python3 -c "print($FOCUS_BALANCE_DEC / 10**18)")
echo "当前FOCUS余额: $FOCUS_BALANCE FOCUS"

ETH_BALANCE=$(cast balance $USER_ADDRESS --rpc-url $RPC_URL)
echo "当前ETH余额: $ETH_BALANCE"
echo ""

# Step 2: Grant MINTER_ROLE to deployer first
echo "步骤2: 授予部署者MINTER_ROLE权限"
MINTER_ROLE="0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6"

cast send $FOCUS_TOKEN \
    "grantRole(bytes32,address)" \
    $MINTER_ROLE \
    $DEPLOYER_ADDRESS \
    --private-key $DEPLOYER_PRIVATE_KEY \
    --rpc-url $RPC_URL

echo "✅ 已授予部署者MINTER_ROLE权限"
echo ""

# Step 3: Burn all FOCUS tokens
if [ "$(echo "$FOCUS_BALANCE > 0" | bc)" -eq 1 ]; then
    echo "步骤3: 销毁现有FOCUS代币"
    BURN_AMOUNT_WEI=$(python3 -c "print(int($FOCUS_BALANCE_DEC))")
    
    cast send $FOCUS_TOKEN \
        "revokeCredits(address,uint256,string)" \
        $USER_ADDRESS \
        $BURN_AMOUNT_WEI \
        "Reset balance to 2000" \
        --private-key $DEPLOYER_PRIVATE_KEY \
        --rpc-url $RPC_URL
    
    echo "✅ 已销毁 $FOCUS_BALANCE FOCUS"
else
    echo "步骤3: 无需销毁（余额为0）"
fi
echo ""

# Step 4: Grant 2000 FOCUS
echo "步骤4: 发放2000 FOCUS"
FOCUS_AMOUNT_WEI=$(python3 -c "print(int(2000 * 10**18))")

cast send $FOCUS_TOKEN \
    "grantCredits(address,uint256,string)" \
    $USER_ADDRESS \
    $FOCUS_AMOUNT_WEI \
    "Reset balance to 2000" \
    --private-key $DEPLOYER_PRIVATE_KEY \
    --rpc-url $RPC_URL

echo "✅ 已发放 2000 FOCUS"
echo ""

# Step 5: Send 1 ETH
echo "步骤5: 发送1 ETH"
cast send $USER_ADDRESS \
    --value 1ether \
    --private-key $DEPLOYER_PRIVATE_KEY \
    --rpc-url $RPC_URL

echo "✅ 已发送 1 ETH"
echo ""

# Step 6: Verify new balances
echo "步骤6: 验证新余额"
FOCUS_BALANCE_HEX=$(cast call $FOCUS_TOKEN "balanceOf(address)" $USER_ADDRESS --rpc-url $RPC_URL)
FOCUS_BALANCE_DEC=$(python3 -c "print(int('$FOCUS_BALANCE_HEX', 16))")
FOCUS_BALANCE=$(python3 -c "print($FOCUS_BALANCE_DEC / 10**18)")
echo "新FOCUS余额: $FOCUS_BALANCE FOCUS"

ETH_BALANCE=$(cast balance $USER_ADDRESS --rpc-url $RPC_URL)
ETH_BALANCE_ETH=$(cast --to-unit $ETH_BALANCE ether)
echo "新ETH余额: $ETH_BALANCE_ETH ETH"
echo ""

echo "=== 余额重置完成! ==="