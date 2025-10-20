#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
CIRCUIT_DIR="$ROOT_DIR/circuits"
CLIENT_CIRCUITS="$ROOT_DIR/client/public/circuits"

if [ ! -d "$CLIENT_CIRCUITS" ]; then
  mkdir -p "$CLIENT_CIRCUITS"
fi

echo "🛠 Preparing circuit artifacts"
cd "$CIRCUIT_DIR"

npm install --no-audit --no-fund

if [ ! -f "build/swap_circuit_js/swap_circuit.wasm" ]; then
  npm run build:swap
fi

if [ ! -f "build/swap_circuit_final.zkey" ]; then
  npm run setup:swap
fi

cp build/swap_circuit_js/swap_circuit.wasm "$CLIENT_CIRCUITS/swap_circuit.wasm"
cp build/swap_circuit_final.zkey "$CLIENT_CIRCUITS/swap_circuit_final.zkey"

echo "✅ Copied wasm + zkey into client/public/circuits"
