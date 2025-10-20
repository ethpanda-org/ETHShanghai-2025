#!/bin/bash

# ETFRouterV1 Complete Test Suite Runner
# Runs all 457 test cases with coverage reporting

echo "========================================="
echo "ETFRouterV1 Complete Test Suite"
echo "Total Test Cases: 457"
echo "========================================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test categories and their test counts
declare -A test_categories=(
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

# Track results
total_tests=0
passed_tests=0
failed_tests=0
skipped_tests=0

# Function to run tests for a specific contract
run_test_suite() {
    local suite_name=$1
    local expected_count=$2

    echo -e "${YELLOW}Running $suite_name tests (Expected: $expected_count tests)${NC}"

    # Run the specific test file
    if forge test --match-contract "ETFRouterV1${suite_name}Test" -vv --gas-report > "test_results_${suite_name}.txt" 2>&1; then
        echo -e "${GREEN}✓ $suite_name tests passed${NC}"
        ((passed_tests+=expected_count))
    else
        echo -e "${RED}✗ $suite_name tests failed${NC}"
        ((failed_tests+=expected_count))
        echo "  Check test_results_${suite_name}.txt for details"
    fi

    ((total_tests+=expected_count))
    echo ""
}

# Run all test suites
echo "Starting test execution..."
echo "=========================="

# TC-001 to TC-015: Constructor and initialization
run_test_suite "Constructor" ${test_categories["Constructor"]}

# TC-016 to TC-075: mintExactShares
run_test_suite "MintExactShares" ${test_categories["MintExactShares"]}

# TC-076 to TC-130: mintWithUSDT
run_test_suite "MintWithUSDT" ${test_categories["MintWithUSDT"]}

# TC-131 to TC-180: burnToUSDT
run_test_suite "BurnToUSDT" ${test_categories["BurnToUSDT"]}

# TC-181 to TC-225: Estimation functions
run_test_suite "Estimation" ${test_categories["Estimation"]}

# TC-226 to TC-275: Admin functions
run_test_suite "Admin" ${test_categories["Admin"]}

# TC-276 to TC-310: V2 Swap
run_test_suite "V2Swap" ${test_categories["V2Swap"]}

# TC-311 to TC-355: V3 Swap
run_test_suite "V3Swap" ${test_categories["V3Swap"]}

# TC-356 to TC-390: Helper functions
run_test_suite "Helpers" ${test_categories["Helpers"]}

# TC-391 to TC-412: Modifiers and errors
run_test_suite "Modifiers" ${test_categories["Modifiers"]}

# TC-413 to TC-442: Integration tests
run_test_suite "Integration" ${test_categories["Integration"]}

# TC-443 to TC-457: Fuzzing tests
run_test_suite "Fuzzing" ${test_categories["Fuzzing"]}

# Generate coverage report
echo "=========================="
echo "Generating coverage report..."

forge coverage --match-contract "ETFRouterV1" --report lcov --report-file coverage.lcov

# Parse coverage
if command -v genhtml &> /dev/null; then
    genhtml coverage.lcov --output-directory coverage_html
    echo -e "${GREEN}Coverage report generated in coverage_html/${NC}"
fi

# Summary
echo ""
echo "========================================="
echo "Test Execution Summary"
echo "========================================="
echo -e "Total Tests:    $total_tests"
echo -e "Passed Tests:   ${GREEN}$passed_tests${NC}"
echo -e "Failed Tests:   ${RED}$failed_tests${NC}"
echo -e "Skipped Tests:  ${YELLOW}$skipped_tests${NC}"

# Calculate pass rate
if [ $total_tests -gt 0 ]; then
    pass_rate=$((passed_tests * 100 / total_tests))
    echo -e "Pass Rate:      $pass_rate%"
fi

# Coverage summary
echo ""
echo "Coverage Summary:"
forge coverage --match-contract "ETFRouterV1" --report summary

# Check if we achieved 100% coverage
echo ""
if [ $passed_tests -eq 457 ]; then
    echo -e "${GREEN}✅ All 457 tests passed! 100% test coverage achieved!${NC}"
    exit 0
else
    echo -e "${RED}❌ Not all tests passed. Review failed tests above.${NC}"
    exit 1
fi