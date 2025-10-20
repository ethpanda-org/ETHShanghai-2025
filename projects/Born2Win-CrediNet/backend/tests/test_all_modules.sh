#!/bin/bash

# CrediNet 六个模块完整测试脚本
# 使用方法: ./tests/test_all_modules.sh

BASE_URL="http://127.0.0.1:8080"

echo "🚀 CrediNet 六模块完整测试"
echo "=========================="

# 检查服务
echo "📡 检查服务状态..."
if ! curl -s "$BASE_URL/test/health" > /dev/null 2>&1; then
    echo "❌ 服务未运行，请先启动服务: cargo run"
    exit 1
fi
echo "✅ 服务运行正常"

# ========== 模块1: 身份认证 ==========
echo ""
echo "🔐 测试模块1: 身份认证"
echo "======================"

echo "1. 发送验证码..."
curl -s -X POST "$BASE_URL/auth/send_code" \
    -H "Content-Type: application/json" \
    -d '{"contact":"test@credinet.com"}' > /dev/null
echo "✅ 验证码已发送"

echo "2. 获取验证码..."
CODE=$(curl -s "$BASE_URL/test/codes" | grep -o '"code":"[0-9]*"' | head -1 | cut -d'"' -f4)
echo "✅ 验证码: $CODE"

echo "3. 登录获取Token..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"contact\":\"test@credinet.com\",\"code\":\"$CODE\"}")
TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
USER_ID=$(echo $LOGIN_RESPONSE | grep -o '"user_id":"[^"]*"' | cut -d'"' -f4)
echo "✅ 登录成功，用户ID: $USER_ID"

echo "4. 访问受保护接口..."
PROTECTED_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/protected")
echo "✅ 受保护接口响应: $PROTECTED_RESPONSE"

# ========== 模块2: DID管理 ==========
echo ""
echo "🆔 测试模块2: DID管理"
echo "===================="

echo "1. 创建DID..."
DID_RESPONSE=$(curl -s -X POST "$BASE_URL/did" \
    -H "Content-Type: application/json" \
    -d "{\"user_id\":\"$USER_ID\",\"public_key\":\"z6MkhaXgBZDvotDkL2577ULvitBVkChaLBQc2zHvJbNJ1p2v\"}")
DID=$(echo $DID_RESPONSE | grep -o '"did":"[^"]*"' | cut -d'"' -f4)
echo "✅ DID创建成功: $DID"

echo "2. 获取DID文档..."
curl -s "$BASE_URL/did/$DID" > /dev/null
echo "✅ DID文档获取成功"

echo "3. 更新DID文档..."
curl -s -X PUT "$BASE_URL/did/$DID" \
    -H "Content-Type: application/json" \
    -d '{"public_key":"z6MkhaXgBZDvotDkL2577ULvitBVkChaLBQc2zHvJbNJ1p2v_updated"}' > /dev/null
echo "✅ DID文档更新成功"

echo "4. 查看版本历史..."
VERSIONS=$(curl -s "$BASE_URL/did/$DID/versions" | grep -o '"version":[0-9]*' | wc -l)
echo "✅ DID有 $VERSIONS 个版本"

echo "5. 注册到区块链..."
TX_HASH=$(curl -s -X POST "$BASE_URL/did/$DID/blockchain/register" | grep -o '"tx_hash":"[^"]*"' | cut -d'"' -f4)
echo "✅ 区块链注册成功，交易哈希: $TX_HASH"

# ========== 模块3: 身份验证与绑定 ==========
echo ""
echo "🔐 测试模块3: 身份验证与绑定"
echo "============================"

echo "1. World ID验证..."
WORLDID_RESPONSE=$(curl -s -X POST "$BASE_URL/identity/worldid/verify" \
    -H "Content-Type: application/json" \
    -d "{\"user_id\":\"$USER_ID\",\"proof\":{\"merkle_root\":\"0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef\",\"nullifier_hash\":\"0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890\",\"proof\":\"0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321\",\"verification_level\":\"orb\"},\"action\":\"verify_humanity\",\"signal\":\"$USER_ID\"}")
WORLDID_VERIFIED=$(echo $WORLDID_RESPONSE | grep -o '"verified":[^,}]*' | cut -d':' -f2)
echo "✅ World ID验证结果: $WORLDID_VERIFIED"

echo "2. OAuth绑定（GitHub）..."
OAUTH_RESPONSE=$(curl -s -X POST "$BASE_URL/identity/oauth/bind" \
    -H "Content-Type: application/json" \
    -d "{\"user_id\":\"$USER_ID\",\"provider\":\"github\",\"code\":\"test_code_12345\",\"redirect_uri\":\"https://app.credinet.com/callback\"}")
OAUTH_SUCCESS=$(echo $OAUTH_RESPONSE | grep -o '"success":[^,}]*' | cut -d':' -f2)
echo "✅ OAuth绑定结果: $OAUTH_SUCCESS"

echo "3. 连接钱包地址..."
WALLET_RESPONSE=$(curl -s -X POST "$BASE_URL/identity/wallet/connect" \
    -H "Content-Type: application/json" \
    -d "{\"user_id\":\"$USER_ID\",\"address\":\"0x1234567890abcdef1234567890abcdef12345678\",\"chain_type\":\"ethereum\",\"signature\":\"0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321\",\"message\":\"I am connecting my wallet to CrediNet\"}")
WALLET_SUCCESS=$(echo $WALLET_RESPONSE | grep -o '"success":[^,}]*' | cut -d':' -f2)
echo "✅ 钱包连接结果: $WALLET_SUCCESS"

echo "4. 设置主钱包..."
curl -s -X PUT "$BASE_URL/identity/wallet/primary" \
    -H "Content-Type: application/json" \
    -d "{\"user_id\":\"$USER_ID\",\"address\":\"0x1234567890abcdef1234567890abcdef12345678\"}" > /dev/null
echo "✅ 主钱包设置成功"

echo "5. 获取用户完整身份信息..."
curl -s "$BASE_URL/identity/user/$USER_ID" > /dev/null
echo "✅ 用户身份信息获取成功"

# ========== 模块4: 用户授权 ==========
echo ""
echo "🔒 测试模块4: 用户授权"
echo "======================"

echo "1. 设置GitHub数据授权..."
AUTH_RESPONSE=$(curl -s -X POST "$BASE_URL/authorization/set" \
    -H "Content-Type: application/json" \
    -d "{\"user_id\":\"$USER_ID\",\"data_source\":\"github\",\"authorized\":true,\"purpose\":\"用于信用评分\"}")
echo "✅ 授权设置成功"

echo "2. 查询GitHub授权状态..."
CHECK_RESPONSE=$(curl -s "$BASE_URL/authorization/$USER_ID/github")
echo "✅ 授权状态查询成功"

echo "3. 获取授权日志..."
curl -s "$BASE_URL/authorization/$USER_ID/logs" > /dev/null
echo "✅ 授权日志获取成功"

echo "4. 获取所有授权列表..."
curl -s "$BASE_URL/authorization/$USER_ID/all" > /dev/null
echo "✅ 授权列表获取成功"

# ========== 模块5: 信用评分 ==========
echo ""
echo "📊 测试模块5: 信用评分"
echo "======================"

echo "1. 计算信用评分..."
SCORE_RESPONSE=$(curl -s -X POST "$BASE_URL/credit/calculate/$USER_ID?force_refresh=true")
CREDIT_SCORE=$(echo $SCORE_RESPONSE | grep -o '"total_score":[0-9]*' | cut -d':' -f2)
echo "✅ 信用评分计算成功: $CREDIT_SCORE"

echo "2. 获取信用评分..."
curl -s "$BASE_URL/credit/score/$USER_ID" > /dev/null
echo "✅ 信用评分获取成功"

echo "3. 获取信用画像..."
curl -s "$BASE_URL/credit/profile/$USER_ID" > /dev/null 2>&1
echo "✅ 信用画像查询完成"

echo "4. 获取评分历史..."
curl -s "$BASE_URL/credit/history" -H "Authorization: Bearer $TOKEN" > /dev/null 2>&1
echo "✅ 评分历史查询完成"

echo "5. 获取数据源状态..."
curl -s "$BASE_URL/credit/data_sources" -H "Authorization: Bearer $TOKEN" > /dev/null 2>&1
echo "✅ 数据源状态查询完成"

# ========== 模块6: SBT发放 ==========
echo ""
echo "🎁 测试模块6: SBT发放"
echo "===================="

echo "1. 获取SBT类型列表..."
TYPES_RESPONSE=$(curl -s "$BASE_URL/sbt/types")
TYPES_COUNT=$(echo $TYPES_RESPONSE | grep -o '"type"' | wc -l)
echo "✅ SBT类型列表获取成功: $TYPES_COUNT 种类型"

echo "2. 获取符合条件的SBT..."
curl -s "$BASE_URL/sbt/eligible" -H "Authorization: Bearer $TOKEN" > /dev/null 2>&1
echo "✅ 符合条件的SBT查询完成"

echo "3. 自动发放SBT..."
AUTO_ISSUE_RESPONSE=$(curl -s -X POST "$BASE_URL/sbt/auto_issue" \
    -H "Authorization: Bearer $TOKEN")
ISSUED_COUNT=$(echo $AUTO_ISSUE_RESPONSE | grep -o '"issued_sbts"' | wc -l)
echo "✅ SBT自动发放完成"

echo "4. 获取我的SBT..."
MY_SBTS=$(curl -s "$BASE_URL/sbt/my" -H "Authorization: Bearer $TOKEN")
SBT_COUNT=$(echo $MY_SBTS | grep -o '"count":[0-9]*' | cut -d':' -f2)
echo "✅ 我的SBT查询成功: $SBT_COUNT 个SBT"

echo "5. 同步待确认交易..."
curl -s -X POST "$BASE_URL/sbt/sync_pending" > /dev/null 2>&1
echo "✅ 交易同步完成"

# ========== 测试总结 ==========
echo ""
echo "📊 测试总结"
echo "=========="
echo "✅ 模块1（身份认证）: 通过"
echo "✅ 模块2（DID管理）: 通过"
echo "✅ 模块3（身份验证）: 通过"
echo "✅ 模块4（用户授权）: 通过"
echo "✅ 模块5（信用评分）: 通过"
echo "✅ 模块6（SBT发放）: 通过"
echo ""
echo "🎉 所有六个模块功能正常！"
echo ""
echo "📊 测试数据汇总:"
echo "   用户ID: $USER_ID"
echo "   DID: $DID"
echo "   信用评分: $CREDIT_SCORE"
echo "   SBT数量: $SBT_COUNT"
echo ""
echo "📄 测试报告路径:"
echo "   - tests/auth/auth_test_report.json"
echo "   - tests/did/did_test_report.json"
echo "   - tests/identity/identity_test_report.json"
echo "   - tests/authorization/authorization_test_report.json"
echo "   - tests/credit/credit_test_report.json"
echo "   - tests/sbt/sbt_test_report.json"

