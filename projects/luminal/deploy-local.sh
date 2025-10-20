#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
CONTRACTS_DIR="$ROOT_DIR/contracts"
CLIENT_DIR="$ROOT_DIR/client"
ARTIFACT_DIR="$ROOT_DIR/deploy-artifacts"
DEPLOYMENTS_FILE="$ARTIFACT_DIR/deployments.local.json"
OUTPUT_LOG="$ARTIFACT_DIR/forge-deploy-output.log"

mkdir -p "$ARTIFACT_DIR"

# shellcheck source=/dev/null
if [ -f "$CONTRACTS_DIR/.env" ]; then
  source "$CONTRACTS_DIR/.env"
fi

PRIVATE_KEY=${PRIVATE_KEY:-0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80}
RPC_URL=${RPC_URL:-http://127.0.0.1:8545}
export FOUNDRY_DISABLE_RPC_PROXY=1
unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY ALL_PROXY
export NO_PROXY=localhost,127.0.0.1

INITIAL_WETH_WEI=10000000000000000000
INITIAL_USDC_WEI=20000000000

if [ -z "${INITIAL_COMMITMENT:-}" ]; then
  INITIAL_COMMITMENT=$(
    cd "$CLIENT_DIR" && node --input-type=module <<'NODE'
import { poseidon } from "@iden3/js-crypto";

const toHex = (value) => {
  const hex = value.toString(16).padStart(64, "0");
  return `0x${hex}`;
};

const reserve0 = 10n * (10n ** 18n); // 10 ETH
const reserve1 = 20_000n * (10n ** 6n); // 20,000 USDC
const nonce = 0n;
const fee = 0n;

const hash = poseidon.hash([reserve0, reserve1, nonce, fee]);
console.log(toHex(hash));
NODE
  )
fi

export INITIAL_COMMITMENT

echo "🚀 Deploying Privacy AMM stack"
echo "RPC       : $RPC_URL"
echo "Contracts : $CONTRACTS_DIR"

cd "$CONTRACTS_DIR"

forge script script/Deploy.s.sol:DeployScript \
  --rpc-url "$RPC_URL" \
  --private-key "$PRIVATE_KEY" \
  --broadcast \
  -vv > "$OUTPUT_LOG"

if [ ! -s "$OUTPUT_LOG" ]; then
  echo "forge script failed; see console output" >&2
  exit 1
fi

parsed_addresses=$(python - "$OUTPUT_LOG" <<'PY'
import re, sys
from pathlib import Path

text = Path(sys.argv[1]).read_text()
text = re.sub(r'\x1b\[[0-9;]*m', '', text)

addresses = {
    'PrivacyAMM': None,
    'GlobalVault': None,
    'Groth16Verifier': None,
    'MockWETH': None,
    'MockUSDC': None,
}

pattern = re.compile(r'^\s*(MockWETH|MockUSDC|Groth16Verifier|GlobalVault|PrivacyAMM) deployed at:\s*(0x[0-9a-fA-F]{40})', re.MULTILINE)

for label, addr in pattern.findall(text):
    addresses[label] = addr

if not all(addresses.values()):
    missing = [k for k, v in addresses.items() if not v]
    print('ERROR ' + ','.join(missing))
    sys.exit(1)

print(addresses['PrivacyAMM'], addresses['GlobalVault'], addresses['Groth16Verifier'], addresses['MockWETH'], addresses['MockUSDC'])
PY
)

if [[ $parsed_addresses == ERROR* ]]; then
  echo "Failed to parse deployment addresses" >&2
  exit 1
fi

read -r AMM_ADDRESS VAULT_ADDRESS VERIFIER_ADDRESS WETH_ADDRESS USDC_ADDRESS <<< "$parsed_addresses"

cat <<JSON > "$DEPLOYMENTS_FILE"
{
  "network": "local",
  "rpcUrl": "$RPC_URL",
  "contracts": {
    "PrivacyAMM": "$AMM_ADDRESS",
    "GlobalVault": "$VAULT_ADDRESS",
    "Groth16Verifier": "$VERIFIER_ADDRESS",
    "MockWETH": "$WETH_ADDRESS",
    "MockUSDC": "$USDC_ADDRESS"
  }
}
JSON

cat <<ENV > "$CLIENT_DIR/.env.local"
VITE_CHAIN=anvil
VITE_PUBLIC_RPC_URL=$RPC_URL
VITE_DISABLE_WALLETCONNECT=true
VITE_AMM_CONTRACT_ADDRESS=$AMM_ADDRESS
VITE_VAULT_CONTRACT_ADDRESS=$VAULT_ADDRESS
VITE_WETH_ADDRESS=$WETH_ADDRESS
VITE_USDC_ADDRESS=$USDC_ADDRESS
VITE_VIEWING_KEY=public-development-viewing-key-not-for-production
VITE_INITIAL_COMMITMENT=$INITIAL_COMMITMENT
ENV

echo ""
echo "=============================================="
echo "✅ Deployment Complete!"
echo "=============================================="
echo ""
echo "📋 Contract Addresses:"
echo "  MockWETH:        $WETH_ADDRESS"
echo "  MockUSDC:        $USDC_ADDRESS"
echo "  Groth16Verifier: $VERIFIER_ADDRESS"
echo "  GlobalVault:     $VAULT_ADDRESS"
echo "  PrivacyAMM:      $AMM_ADDRESS"
echo ""
echo "📁 Configuration Files:"
echo "  Summary:    $DEPLOYMENTS_FILE"
echo "  Client env: $CLIENT_DIR/.env.local"
echo ""
echo "🔗 RPC URL: $RPC_URL"
echo ""
echo "✨ Next Steps:"
echo "  1. Start the client: make start-client"
echo "  2. Connect wallet to Anvil (Chain ID: 31337)"
echo "  3. Import test account:"
echo "     Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
echo "     Address:     0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
echo "  4. Start swapping! 🎉"
echo ""
echo "=============================================="
echo ""
