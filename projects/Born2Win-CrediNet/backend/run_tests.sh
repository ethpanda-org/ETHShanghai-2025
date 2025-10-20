#!/bin/bash

# CrediNet 测试运行脚本
# 使用方法: ./run_tests.sh [auth|did|identity|authorization|credit|sbt|integration|all]

set -e

BASE_URL="http://127.0.0.1:8080"
TEST_TYPE=${1:-all}

echo "🚀 CrediNet 测试运行器"
echo "======================"

# 检查服务是否运行
check_service() {
    echo "📡 检查服务状态..."
    if ! curl -s "$BASE_URL/test/health" > /dev/null 2>&1; then
        echo "❌ 服务未运行，请先启动服务: cargo run"
        exit 1
    fi
    echo "✅ 服务运行正常"
}

# 运行身份认证测试
run_auth_tests() {
    echo ""
    echo "🔐 运行身份认证模块测试"
    echo "========================"
    python3 tests/auth/test_auth.py
}

# 运行DID管理测试
run_did_tests() {
    echo ""
    echo "🆔 运行DID管理模块测试"
    echo "======================"
    python3 tests/did/test_did.py
}

# 运行身份验证测试
run_identity_tests() {
    echo ""
    echo "🔐 运行身份验证与绑定模块测试"
    echo "=============================="
    python3 tests/identity/test_identity.py
}

# 运行授权系统测试
run_authorization_tests() {
    echo ""
    echo "🔒 运行用户授权系统测试"
    echo "======================"
    python3 tests/authorization/test_authorization.py
}

# 运行信用评分测试
run_credit_tests() {
    echo ""
    echo "📊 运行信用评分模块测试"
    echo "======================"
    python3 tests/credit/test_credit.py
}

# 运行SBT发放测试
run_sbt_tests() {
    echo ""
    echo "🎁 运行SBT发放模块测试"
    echo "===================="
    python3 tests/sbt/test_sbt.py
}

# 运行集成测试
run_integration_tests() {
    echo ""
    echo "🔗 运行完整系统集成测试"
    echo "========================"
    python3 tests/integration/test_complete.py
}

# 运行所有测试
run_all_tests() {
    run_auth_tests
    run_did_tests
    run_identity_tests
    run_authorization_tests
    run_credit_tests
    run_sbt_tests
    run_integration_tests
}

# 主逻辑
case $TEST_TYPE in
    "auth")
        check_service
        run_auth_tests
        ;;
    "did")
        check_service
        run_did_tests
        ;;
    "identity")
        check_service
        run_identity_tests
        ;;
    "authorization")
        check_service
        run_authorization_tests
        ;;
    "credit")
        check_service
        run_credit_tests
        ;;
    "sbt")
        check_service
        run_sbt_tests
        ;;
    "integration")
        check_service
        run_integration_tests
        ;;
    "all")
        check_service
        run_all_tests
        ;;
    *)
        echo "❌ 无效的测试类型: $TEST_TYPE"
        echo "使用方法: ./run_tests.sh [auth|did|identity|authorization|credit|sbt|integration|all]"
        exit 1
        ;;
esac

echo ""
echo "✅ 测试完成！"
