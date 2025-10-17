# Makefile for ETFRouterV1 Test Suite

.PHONY: all test coverage clean help install test-rebalancer coverage-rebalancer coverage-summary-rebalancer coverage-html-rebalancer

# Colors for output
RED := \033[0;31m
GREEN := \033[0;32m
YELLOW := \033[1;33m
NC := \033[0m

# Default target
all: test

# Install dependencies
install:
	@echo "$(YELLOW)Installing dependencies...$(NC)"
	@forge install
	@npm install

# Run all tests
test:
	@echo "$(YELLOW)Running all ETFRouterV1 tests...$(NC)"
	@forge test --match-contract ETFRouterV1 -vv

# Run all ETFRebalancerV1 tests
test-rebalancer:
	@echo "$(YELLOW)Running all ETFRebalancerV1 tests...$(NC)"
	@forge test --match-contract ETFRebalancerV1 -vv

# Run specific test suite
test-constructor:
	@echo "$(YELLOW)Running Constructor tests (TC-001 to TC-015)...$(NC)"
	@forge test --match-contract ETFRouterV1ConstructorTest -vvv

test-mint-exact:
	@echo "$(YELLOW)Running MintExactShares tests (TC-016 to TC-075)...$(NC)"
	@forge test --match-contract ETFRouterV1MintExactSharesTest -vvv

test-mint-usdt:
	@echo "$(YELLOW)Running MintWithUSDT tests (TC-076 to TC-130)...$(NC)"
	@forge test --match-contract ETFRouterV1MintWithUSDTTest -vvv

test-burn:
	@echo "$(YELLOW)Running BurnToUSDT tests (TC-131 to TC-180)...$(NC)"
	@forge test --match-contract ETFRouterV1BurnToUSDTTest -vvv

test-estimation:
	@echo "$(YELLOW)Running Estimation tests (TC-181 to TC-225)...$(NC)"
	@forge test --match-contract ETFRouterV1EstimationTest -vvv

test-admin:
	@echo "$(YELLOW)Running Admin tests (TC-226 to TC-275)...$(NC)"
	@forge test --match-contract ETFRouterV1AdminTest -vvv

test-v2:
	@echo "$(YELLOW)Running V2 Swap tests (TC-276 to TC-310)...$(NC)"
	@forge test --match-contract ETFRouterV1V2SwapTest -vvv

test-v3:
	@echo "$(YELLOW)Running V3 Swap tests (TC-311 to TC-355)...$(NC)"
	@forge test --match-contract ETFRouterV1V3SwapTest -vvv

test-helpers:
	@echo "$(YELLOW)Running Helper function tests (TC-356 to TC-390)...$(NC)"
	@forge test --match-contract ETFRouterV1HelpersTest -vvv

test-modifiers:
	@echo "$(YELLOW)Running Modifier tests (TC-391 to TC-412)...$(NC)"
	@forge test --match-contract ETFRouterV1ModifiersTest -vvv

test-integration:
	@echo "$(YELLOW)Running Integration tests (TC-413 to TC-442)...$(NC)"
	@forge test --match-contract ETFRouterV1IntegrationTest -vvv

test-fuzz:
	@echo "$(YELLOW)Running Fuzzing tests (TC-443 to TC-457)...$(NC)"
	@forge test --match-contract ETFRouterV1FuzzTest -vvv --fuzz-runs 10000

# Run tests with gas reporting
gas:
	@echo "$(YELLOW)Running tests with gas reporting...$(NC)"
	@forge test --match-contract ETFRouterV1 --gas-report

# Generate coverage report
coverage:
	@echo "$(YELLOW)Generating coverage report...$(NC)"
	@forge coverage --match-contract ETFRouterV1 --report lcov --report-file lcov.info
	@echo "$(GREEN)Coverage report generated: lcov.info$(NC)"

coverage-html:
	@echo "$(YELLOW)Generating HTML coverage report...$(NC)"
	@forge coverage --match-contract ETFRouterV1 --report lcov --report-file lcov.info
	@genhtml lcov.info --output-directory coverage-html
	@echo "$(GREEN)HTML coverage report generated in coverage-html/$(NC)"

coverage-summary:
	@echo "$(YELLOW)Coverage Summary:$(NC)"
	@forge coverage --match-contract ETFRouterV1 --report summary

# Generate coverage report for ETFRebalancerV1
coverage-rebalancer:
	@echo "$(YELLOW)Generating coverage report for ETFRebalancerV1...$(NC)"
	@forge coverage --match-contract ETFRebalancerV1 --report lcov --report-file lcov.rebalancer.info
	@echo "$(GREEN)Coverage report generated: lcov.rebalancer.info$(NC)"

coverage-html-rebalancer:
	@echo "$(YELLOW)Generating HTML coverage report for ETFRebalancerV1...$(NC)"
	@forge coverage --match-contract ETFRebalancerV1 --report lcov --report-file lcov.rebalancer.info
	@genhtml lcov.rebalancer.info --output-directory coverage-rebalancer-html
	@echo "$(GREEN)HTML coverage report generated in coverage-rebalancer-html/$(NC)"

coverage-summary-rebalancer:
	@echo "$(YELLOW)ETFRebalancerV1 Coverage Summary:$(NC)"
	@forge coverage --match-contract ETFRebalancerV1 --report summary

# Run static analysis
slither:
	@echo "$(YELLOW)Running Slither static analysis...$(NC)"
	@slither src/ETFRouterV1.sol --config-file slither.config.json

# Run mythril security analysis
mythril:
	@echo "$(YELLOW)Running Mythril security analysis...$(NC)"
	@myth analyze src/ETFRouterV1.sol

# Run all security checks
security: slither mythril
	@echo "$(GREEN)Security checks complete$(NC)"

# Run complete test suite with all checks
complete: test coverage-summary gas security
	@echo "$(GREEN)Complete test suite finished$(NC)"

# Run tests in CI mode
ci:
	@forge test --match-contract ETFRouterV1 --no-match-test "testFork" -vv
	@forge coverage --match-contract ETFRouterV1 --report summary

# Clean build artifacts
clean:
	@echo "$(YELLOW)Cleaning build artifacts...$(NC)"
	@forge clean
	@rm -rf coverage-html/
	@rm -f lcov.info
	@rm -f test_results_*.txt
	@echo "$(GREEN)Clean complete$(NC)"

# Deploy to testnet (example)
deploy-testnet:
	@echo "$(YELLOW)Deploying to testnet...$(NC)"
	@forge script script/DeployETFRouterV1.s.sol:DeployETFRouterV1 \
		--rpc-url $${RPC_URL} \
		--private-key $${PRIVATE_KEY} \
		--broadcast \
		--verify \
		-vvvv

# Verify contract on etherscan
verify:
	@echo "$(YELLOW)Verifying contract...$(NC)"
	@forge verify-contract \
		--chain-id $${CHAIN_ID} \
		--num-of-optimizations 200 \
		--compiler-version v0.8.20 \
		$${CONTRACT_ADDRESS} \
		src/ETFRouterV1.sol:ETFRouterV1 \
		$${ETHERSCAN_API_KEY}

# Help command
help:
	@echo "$(GREEN)ETFRouterV1 Test Suite Commands:$(NC)"
	@echo ""
	@echo "  make test                - Run all tests"
	@echo "  make test-constructor    - Run constructor tests (TC-001 to TC-015)"
	@echo "  make test-mint-exact     - Run mintExactShares tests (TC-016 to TC-075)"
	@echo "  make test-mint-usdt      - Run mintWithUSDT tests (TC-076 to TC-130)"
	@echo "  make test-burn           - Run burnToUSDT tests (TC-131 to TC-180)"
	@echo "  make test-estimation     - Run estimation tests (TC-181 to TC-225)"
	@echo "  make test-admin          - Run admin tests (TC-226 to TC-275)"
	@echo "  make test-v2             - Run V2 swap tests (TC-276 to TC-310)"
	@echo "  make test-v3             - Run V3 swap tests (TC-311 to TC-355)"
	@echo "  make test-helpers        - Run helper tests (TC-356 to TC-390)"
	@echo "  make test-modifiers      - Run modifier tests (TC-391 to TC-412)"
	@echo "  make test-integration    - Run integration tests (TC-413 to TC-442)"
	@echo "  make test-fuzz           - Run fuzzing tests (TC-443 to TC-457)"
	@echo "  make gas                 - Run tests with gas reporting"
	@echo "  make coverage            - Generate coverage report"
	@echo "  make coverage-html       - Generate HTML coverage report"
	@echo "  make coverage-summary    - Show coverage summary"
	@echo "  make security            - Run security analysis (slither + mythril)"
	@echo "  make complete            - Run complete test suite with all checks"
	@echo "  make clean               - Clean build artifacts"
	@echo "  make help                - Show this help message"

# Test count verification
verify-count:
	@echo "$(YELLOW)Verifying test count...$(NC)"
	@echo "Expected total: 457 tests"
	@echo "Checking implementation..."
	@grep -r "function test_TC" test/ETFRouterV1/ | wc -l
