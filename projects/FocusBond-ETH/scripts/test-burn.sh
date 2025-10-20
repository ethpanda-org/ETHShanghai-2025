#!/bin/bash

USER_ADDRESS="0x891402c216Dbda3eD7BEB0f95Dd89b010523642A"
DEPLOYER_PRIVATE_KEY="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
FOCUS_TOKEN="0xe7f1725E7734CE288F8367e1Bb143E90bb3f0512"
RPC_URL="http://127.0.0.1:8545"

echo "尝试销毁1 FOCUS..."
BURN_AMOUNT_WEI=$(python3 -c "print(int(1 * 10**18))")

cast send $FOCUS_TOKEN \
    "revokeCredits(address,uint256,string)" \
    $USER_ADDRESS \
    $BURN_AMOUNT_WEI \
    "Test burn 1 FOCUS" \
    --private-key $DEPLOYER_PRIVATE_KEY \
    --rpc-url $RPC_URL

echo "检查余额..."
FOCUS_BALANCE_HEX=$(cast call $FOCUS_TOKEN "balanceOf(address)" $USER_ADDRESS --rpc-url $RPC_URL)
FOCUS_BALANCE_DEC=$(python3 -c "print(int('$FOCUS_BALANCE_HEX', 16))")
FOCUS_BALANCE=$(python3 -c "print($FOCUS_BALANCE_DEC / 10**18)")
echo "当前FOCUS余额: $FOCUS_BALANCE FOCUS"