SHELL := /bin/bash
.DEFAULT_GOAL := help

FORGE ?= forge

.PHONY: help test fmt clean build deps deploy-sepolia

help:
	@echo "Common tasks:"
	@echo "  make deps          # fetch git submodule dependencies"
	@echo "  make test          # run the complete test suite"
	@echo "  make fmt           # format Solidity sources"
	@echo "  make build         # compile contracts"
	@echo "  make clean         # clean build artifacts"
	@echo "  make deploy-sepolia # deploy contracts to Sepolia using env credentials"

test:
	@$(FORGE) test

fmt:
	@$(FORGE) fmt

build:
	@$(FORGE) build
	@$(FORGE) inspect packages/contracts/src/IdentityToken.sol:IdentityToken abi --json > docs/reputation-interface-pack/IdentityToken.abi.json
	@$(FORGE) inspect packages/contracts/src/ReputationBadge.sol:ReputationBadge abi --json > docs/reputation-interface-pack/ReputationBadge.abi.json
	@$(FORGE) inspect packages/contracts/src/BadgeRuleRegistry.sol:BadgeRuleRegistry abi --json > docs/reputation-interface-pack/BadgeRuleRegistry.abi.json
	@$(FORGE) inspect packages/contracts/src/Marketplace.sol:Marketplace abi --json > docs/reputation-interface-pack/Marketplace.abi.json
	@$(FORGE) inspect packages/contracts/src/ReputationDataFeed.sol:ReputationDataFeed abi --json > docs/reputation-interface-pack/ReputationDataFeed.abi.json

clean:
	@$(FORGE) clean

deps:
	@git submodule update --init --recursive

deploy-sepolia: test build
	@if [ -f .env ]; then set -a && . .env && set +a; fi; \
	if [ -z "$$SEPOLIA_RPC_URL" ]; then echo "SEPOLIA_RPC_URL is not set"; exit 1; fi; \
	if [ -z "$$PRIVATE_KEY" ]; then echo "PRIVATE_KEY is not set"; exit 1; fi; \
	$(FORGE) script packages/contracts/script/DeployReputation.s.sol \
		--rpc-url "$$SEPOLIA_RPC_URL" \
		--broadcast \
		--slow \
		--private-key "$$PRIVATE_KEY"

