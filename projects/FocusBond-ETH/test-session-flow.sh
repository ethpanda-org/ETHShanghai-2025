#!/bin/bash

# 测试会话完整流程

USER_ADDR="0x891402c216Dbda3eD7BEB0f95Dd89b010523642A"
USER_KEY="你的私钥" # 需要替换
FOCUS_TOKEN="0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"
FOCUSBOND="0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"
RPC="http://127.0.0.1:8545"

echo "=== 测试会话流程 ==="
echo ""

# 1. 检查初始余额
echo "1. 检查初始余额"
BALANCE_HEX=$(cast call $FOCUS_TOKEN "balanceOf(address)" $USER_ADDR --rpc-url $RPC)
INITIAL_BALANCE=$(python3 -c "print(int('$BALANCE_HEX', 16) / 10**18)")
echo "   FOCUS余额: $INITIAL_BALANCE FOCUS"
echo ""

# 2. 开始会话（需要前端操作或使用私钥）
echo "2. 请在前端开始一个5分钟的专注会话"
echo "   - 访问 http://localhost:3000"
echo "   - 选择5分钟"
echo "   - 点击开始专注"
echo "   - 等待5分钟或立即中断"
echo ""

read -p "按回车键继续检查会话状态..."

# 3. 检查会话状态
echo "3. 检查会话状态"
SESSION=$(cast call $FOCUSBOND "sessions(address)" $USER_ADDR --rpc-url $RPC)
echo "   会话数据: $SESSION"
echo ""

# 4. 等待用户中断或完成
echo "4. 请选择操作:"
echo "   A) 中断会话（测试扣费）"
echo "   B) 完成会话（测试奖励）"
echo "   C) 跳过"
echo ""

read -p "选择 (A/B/C): " CHOICE

if [ "$CHOICE" == "A" ] || [ "$CHOICE" == "a" ]; then
    echo "   请在前端点击中断按钮"
elif [ "$CHOICE" == "B" ] || [ "$CHOICE" == "b" ]; then
    echo "   请等待倒计时结束或点击完成按钮"
fi

read -p "操作完成后按回车键..."

# 5. 检查最终余额
echo ""
echo "5. 检查最终余额"
BALANCE_HEX=$(cast call $FOCUS_TOKEN "balanceOf(address)" $USER_ADDR --rpc-url $RPC)
FINAL_BALANCE=$(python3 -c "print(int('$BALANCE_HEX', 16) / 10**18)")
echo "   FOCUS余额: $FINAL_BALANCE FOCUS"

# 6. 计算变化
CHANGE=$(python3 -c "print($FINAL_BALANCE - $INITIAL_BALANCE)")
echo "   变化: $CHANGE FOCUS"
echo ""

# 7. 验证结果
if [ "$CHOICE" == "A" ] || [ "$CHOICE" == "a" ]; then
    echo "预期: -10 FOCUS（5分钟内中断）"
    if [ "$(python3 -c "print($CHANGE == -10)")" == "True" ]; then
        echo "✅ 测试通过！中断扣费正确"
    else
        echo "❌ 测试失败！预期-10 FOCUS，实际$CHANGE FOCUS"
    fi
elif [ "$CHOICE" == "B" ] || [ "$CHOICE" == "b" ]; then
    echo "预期: +0.5 FOCUS（5分钟完成）"
    if [ "$(python3 -c "print($CHANGE == 0.5)")" == "True" ]; then
        echo "✅ 测试通过！完成奖励正确"
    else
        echo "❌ 测试失败！预期+0.5 FOCUS，实际$CHANGE FOCUS"
    fi
fi

echo ""
echo "=== 测试完成 ==="
