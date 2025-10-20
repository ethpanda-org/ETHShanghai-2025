# Luminial Privacy AMM - Development Makefile
# One-click deployment and management for the entire stack

.PHONY: help install build-circuits build-contracts deploy-local start-client clean reset test

# Default target
.DEFAULT_GOAL := help

# Colors for output
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[0;33m
RED := \033[0;31m
NC := \033[0m # No Color

# Directories
ROOT_DIR := $(shell pwd)
CIRCUITS_DIR := $(ROOT_DIR)/circuits
CONTRACTS_DIR := $(ROOT_DIR)/contracts
CLIENT_DIR := $(ROOT_DIR)/client
SCRIPTS_DIR := $(ROOT_DIR)/scripts

##@ General

help: ## Display this help message
	@echo "$(BLUE)Luminial Privacy AMM - Development Commands$(NC)"
	@echo ""
	@awk 'BEGIN {FS = ":.*##"; printf "Usage:\n  make $(YELLOW)<target>$(NC)\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  $(BLUE)%-20s$(NC) %s\n", $$1, $$2 } /^##@/ { printf "\n$(GREEN)%s$(NC)\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

##@ Installation

install: install-circuits install-contracts install-client ## Install all dependencies
	@echo "$(GREEN)✅ All dependencies installed$(NC)"

install-circuits: ## Install circuit dependencies
	@echo "$(BLUE)📦 Installing circuit dependencies...$(NC)"
	@cd $(CIRCUITS_DIR) && npm install --no-audit --no-fund
	@echo "$(GREEN)✅ Circuit dependencies installed$(NC)"

install-contracts: ## Install contract dependencies (Foundry)
	@echo "$(BLUE)📦 Installing contract dependencies...$(NC)"
	@cd $(CONTRACTS_DIR) && forge install
	@echo "$(GREEN)✅ Contract dependencies installed$(NC)"

install-client: ## Install client dependencies
	@echo "$(BLUE)📦 Installing client dependencies...$(NC)"
	@cd $(CLIENT_DIR) && npm install --no-audit --no-fund
	@echo "$(GREEN)✅ Client dependencies installed$(NC)"

##@ Build

build: build-circuits build-contracts prepare-assets ## Build all components
	@echo "$(GREEN)✅ All components built successfully$(NC)"

build-circuits: ## Compile circuits and generate proving keys
	@echo "$(BLUE)🔧 Building circuits...$(NC)"
	@cd $(CIRCUITS_DIR) && npm run build
	@echo "$(GREEN)✅ Circuits built$(NC)"

build-contracts: ## Compile smart contracts
	@echo "$(BLUE)🔨 Building contracts...$(NC)"
	@cd $(CONTRACTS_DIR) && forge build
	@echo "$(GREEN)✅ Contracts built$(NC)"

prepare-assets: ## Copy circuit artifacts to client
	@echo "$(BLUE)📋 Preparing proof assets for client...$(NC)"
	@bash $(SCRIPTS_DIR)/prepare-proof-assets.sh
	@echo "$(GREEN)✅ Assets prepared$(NC)"

##@ Development

anvil: ## Start local Anvil node
	@echo "$(BLUE)🔗 Starting Anvil local node...$(NC)"
	@anvil --host 0.0.0.0 --chain-id 31337

deploy-local: ## Deploy contracts to local Anvil
	@echo "$(BLUE)🚀 Deploying to local network...$(NC)"
	@bash $(ROOT_DIR)/deploy-local.sh
	@echo "$(GREEN)✅ Deployment complete$(NC)"
	@echo "$(YELLOW)Contract addresses written to:$(NC)"
	@echo "  - $(ROOT_DIR)/deploy-artifacts/deployments.local.json"
	@echo "  - $(CLIENT_DIR)/.env.local"

start-client: ## Start the frontend development server
	@echo "$(BLUE)🌐 Starting client dev server...$(NC)"
	@cd $(CLIENT_DIR) && npm run dev

##@ Full Stack

dev: ## Run complete development environment (requires tmux or separate terminals)
	@echo "$(YELLOW)⚠️  This requires multiple terminal windows:$(NC)"
	@echo "  Terminal 1: make anvil"
	@echo "  Terminal 2: make deploy-local"
	@echo "  Terminal 3: make start-client"
	@echo ""
	@echo "Or use: make dev-tmux (requires tmux)"

dev-tmux: ## Run full stack in tmux session
	@command -v tmux >/dev/null 2>&1 || { echo "$(RED)❌ tmux is required but not installed$(NC)"; exit 1; }
	@echo "$(BLUE)�� Starting full stack in tmux...$(NC)"
	@tmux new-session -d -s luminal -n anvil 'cd $(ROOT_DIR) && make anvil'
	@sleep 3
	@tmux new-window -t luminal -n deploy 'cd $(ROOT_DIR) && make deploy-local && read -p "Press enter to close..."'
	@sleep 10
	@tmux new-window -t luminal -n client 'cd $(CLIENT_DIR) && npm run dev'
	@tmux attach-session -t luminal
	@echo "$(GREEN)✅ Full stack started in tmux session 'luminal'$(NC)"

##@ Testing

test-circuits: ## Test ZK circuits
	@echo "$(BLUE)🧪 Testing circuits...$(NC)"
	@cd $(CIRCUITS_DIR) && npm test

test-contracts: ## Test smart contracts
	@echo "$(BLUE)🧪 Testing contracts...$(NC)"
	@cd $(CONTRACTS_DIR) && forge test -vv

test: test-circuits test-contracts ## Run all tests
	@echo "$(GREEN)✅ All tests passed$(NC)"

##@ Cleanup

clean: ## Clean build artifacts
	@echo "$(BLUE)🧹 Cleaning build artifacts...$(NC)"
	@cd $(CIRCUITS_DIR) && rm -rf build output
	@cd $(CONTRACTS_DIR) && forge clean
	@cd $(CLIENT_DIR) && rm -rf dist
	@rm -rf $(ROOT_DIR)/deploy-artifacts
	@echo "$(GREEN)✅ Build artifacts cleaned$(NC)"

clean-deps: ## Remove all dependencies
	@echo "$(BLUE)🧹 Cleaning dependencies...$(NC)"
	@rm -rf $(CIRCUITS_DIR)/node_modules
	@rm -rf $(CLIENT_DIR)/node_modules
	@rm -rf $(CONTRACTS_DIR)/lib
	@echo "$(GREEN)✅ Dependencies cleaned$(NC)"

reset: clean clean-deps ## Full reset (clean + remove deps)
	@echo "$(GREEN)✅ Full reset complete$(NC)"

##@ One-Click Setup

quickstart: install build deploy-local ## Complete setup from scratch
	@echo "$(GREEN)🎉 Quickstart complete!$(NC)"
	@echo ""
	@echo "$(YELLOW)Next steps:$(NC)"
	@echo "  1. Start Anvil in a new terminal: $(BLUE)make anvil$(NC)"
	@echo "  2. Deploy contracts: $(BLUE)make deploy-local$(NC)"
	@echo "  3. Start the client: $(BLUE)make start-client$(NC)"
	@echo ""
	@echo "Or run everything in tmux: $(BLUE)make dev-tmux$(NC)"

##@ Utilities

check-deps: ## Check if required tools are installed
	@echo "$(BLUE)🔍 Checking dependencies...$(NC)"
	@command -v node >/dev/null 2>&1 || { echo "$(RED)❌ Node.js is not installed$(NC)"; exit 1; }
	@echo "$(GREEN)✅ Node.js: $$(node --version)$(NC)"
	@command -v npm >/dev/null 2>&1 || { echo "$(RED)❌ npm is not installed$(NC)"; exit 1; }
	@echo "$(GREEN)✅ npm: $$(npm --version)$(NC)"
	@command -v forge >/dev/null 2>&1 || { echo "$(RED)❌ Foundry (forge) is not installed$(NC)"; exit 1; }
	@echo "$(GREEN)✅ Foundry: $$(forge --version | head -n1)$(NC)"
	@command -v circom >/dev/null 2>&1 || { echo "$(RED)❌ Circom is not installed$(NC)"; exit 1; }
	@echo "$(GREEN)✅ Circom: $$(circom --version)$(NC)"
	@command -v anvil >/dev/null 2>&1 || { echo "$(RED)❌ Anvil is not installed$(NC)"; exit 1; }
	@echo "$(GREEN)✅ Anvil: $$(anvil --version)$(NC)"
	@echo "$(GREEN)✅ All required tools are installed$(NC)"

show-config: ## Show current configuration
	@echo "$(BLUE)📋 Current Configuration$(NC)"
	@echo "$(YELLOW)Directories:$(NC)"
	@echo "  Root:      $(ROOT_DIR)"
	@echo "  Circuits:  $(CIRCUITS_DIR)"
	@echo "  Contracts: $(CONTRACTS_DIR)"
	@echo "  Client:    $(CLIENT_DIR)"
	@echo ""
	@echo "$(YELLOW)Contract Addresses (if deployed):$(NC)"
	@if [ -f "$(ROOT_DIR)/deploy-artifacts/deployments.local.json" ]; then \
		cat $(ROOT_DIR)/deploy-artifacts/deployments.local.json | jq -r '.contracts | to_entries[] | "  \(.key): \(.value)"'; \
	else \
		echo "  $(RED)Not deployed yet$(NC)"; \
	fi

logs-client: ## Show client logs
	@echo "$(BLUE)📜 Client logs$(NC)"
	@cd $(CLIENT_DIR) && npm run dev 2>&1 | tail -f

version: ## Show project version
	@echo "$(BLUE)Luminial Privacy AMM$(NC)"
	@echo "Version: 1.0.0 (EthShanghai 2025 Hackathon)"

generate-viewing-key: ## Generate a new viewing key
	@./scripts/generate-viewing-key.sh

compute-commitment: ## Compute Poseidon commitment (use: make compute-commitment ARGS="--reserve0 10 --reserve1 20000")
	@cd $(CLIENT_DIR) && node ../scripts/compute-commitment.js $(ARGS)

check-pool: ## Check current pool state from blockchain
	@./scripts/check-pool-state.sh

##@ Docker (Optional)

docker-build: ## Build Docker image (if Dockerfile exists)
	@if [ -f "$(ROOT_DIR)/Dockerfile" ]; then \
		echo "$(BLUE)🐳 Building Docker image...$(NC)"; \
		docker build -t luminal:latest $(ROOT_DIR); \
		echo "$(GREEN)✅ Docker image built$(NC)"; \
	else \
		echo "$(YELLOW)⚠️  No Dockerfile found$(NC)"; \
	fi

docker-run: ## Run in Docker container
	@if docker images luminal:latest -q | grep -q .; then \
		echo "$(BLUE)🐳 Running Docker container...$(NC)"; \
		docker run -p 3000:3000 -p 8545:8545 luminal:latest; \
	else \
		echo "$(RED)❌ Docker image not found. Run 'make docker-build' first$(NC)"; \
	fi
