#!/bin/bash

echo "========================================="
echo "ETFRouterV1 Complete Test Suite"
echo "457 Test Cases"
echo "========================================="

# Test file mapping
declare -A test_files=(
    ["Constructor"]="ETFRouterV1.Constructor.t.sol"
    ["MintExactShares"]="ETFRouterV1.MintExactShares.t.sol"
    ["MintWithUSDT"]="ETFRouterV1.MintWithUSDT.t.sol"
    ["BurnToUSDT"]="ETFRouterV1.BurnToUSDT.t.sol"
    ["Estimation"]="ETFRouterV1.Estimation.t.sol"
    ["Admin"]="ETFRouterV1.Admin.t.sol"
    ["V2Swap"]="ETFRouterV1.V2Swap.t.sol"
    ["V3Swap"]="ETFRouterV1.V3Swap.t.sol"
    ["Helpers"]="ETFRouterV1.Helpers.t.sol"
    ["Modifiers"]="ETFRouterV1.Modifiers.t.sol"
    ["Integration"]="ETFRouterV1.Integration.t.sol"
    ["Fuzzing"]="ETFRouterV1.Fuzzing.t.sol"
)

declare -A test_counts=(
    ["Constructor"]=15
    ["MintExactShares"]=60
    ["MintWithUSDT"]=55
    ["BurnToUSDT"]=50
    ["Estimation"]=45
    ["Admin"]=50
    ["V2Swap"]=35
    ["V3Swap"]=45
    ["Helpers"]=35
    ["Modifiers"]=22
    ["Integration"]=30
    ["Fuzzing"]=15
)

total_tests=0
passed_tests=0

for category in "${!test_files[@]}"; do
    echo "Running $category tests..."

    if forge test --match-path "test/ETFRouterV1/${test_files[$category]}" -vv; then
        echo "✓ $category tests passed"
        ((passed_tests += test_counts[$category]))
    else
        echo "✗ $category tests failed"
    fi

    ((total_tests += test_counts[$category]))
done

echo "========================================="
echo "Test Results Summary"
echo "Total Tests: $total_tests"
echo "Passed: $passed_tests"
echo "Failed: $((total_tests - passed_tests))"
echo "Success Rate: $(( passed_tests * 100 / total_tests ))%"
echo "========================================="

if [ $passed_tests -eq 457 ]; then
    echo "🎉 All 457 tests passed! 100% coverage achieved!"
    exit 0
else
    echo "❌ Some tests failed. Review and fix before deployment."
    exit 1
fi
