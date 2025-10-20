#!/bin/bash

# ZK Circuit Compilation Script
# This script compiles Circom circuits and generates verification keys

set -e

echo "Starting ZK circuit compilation..."

# Check if circom is installed
if ! command -v circom &> /dev/null; then
    echo "Error: circom is not installed"
    echo "Install it with: npm install -g circom"
    exit 1
fi

# Check if snarkjs is installed
if ! command -v snarkjs &> /dev/null; then
    echo "Error: snarkjs is not installed"
    echo "Install it with: npm install -g snarkjs"
    exit 1
fi

# Create output directories
mkdir -p build
mkdir -p keys

# Circuit to compile (default: compliance_verification)
CIRCUIT=${1:-compliance_verification}

echo "Compiling circuit: $CIRCUIT"

# 1. Compile circuit
echo "Step 1: Compiling circuit to R1CS, WASM, and symbols..."
circom ${CIRCUIT}.circom --r1cs --wasm --sym -o build/

# 2. Generate Powers of Tau (if not exists)
if [ ! -f keys/pot14_final.ptau ]; then
    echo "Step 2: Generating Powers of Tau (this may take a while)..."
    snarkjs powersoftau new bn128 14 keys/pot14_0000.ptau -v
    snarkjs powersoftau contribute keys/pot14_0000.ptau keys/pot14_0001.ptau \
        --name="First contribution" -v -e="random entropy"
    snarkjs powersoftau prepare phase2 keys/pot14_0001.ptau keys/pot14_final.ptau -v
else
    echo "Step 2: Using existing Powers of Tau file"
fi

# 3. Generate zkey
echo "Step 3: Generating zkey..."
snarkjs groth16 setup build/${CIRCUIT}.r1cs keys/pot14_final.ptau keys/${CIRCUIT}_0000.zkey

# 4. Contribute to zkey
echo "Step 4: Contributing to zkey..."
snarkjs zkey contribute keys/${CIRCUIT}_0000.zkey keys/${CIRCUIT}_final.zkey \
    --name="Contribution" -v -e="random entropy"

# 5. Export verification key
echo "Step 5: Exporting verification key..."
snarkjs zkey export verificationkey keys/${CIRCUIT}_final.zkey keys/${CIRCUIT}_verification_key.json

# 6. Generate Solidity verifier
echo "Step 6: Generating Solidity verifier contract..."
snarkjs zkey export solidityverifier keys/${CIRCUIT}_final.zkey ../contracts/${CIRCUIT}_verifier.sol

# 7. Export zkey for use in application
echo "Step 7: Copying files for application use..."
cp build/${CIRCUIT}_js/${CIRCUIT}.wasm ../public/circuits/
cp keys/${CIRCUIT}_final.zkey ../public/circuits/
cp keys/${CIRCUIT}_verification_key.json ../public/circuits/

echo "Compilation complete!"
echo "Files generated:"
echo "  - build/${CIRCUIT}.r1cs"
echo "  - build/${CIRCUIT}_js/${CIRCUIT}.wasm"
echo "  - keys/${CIRCUIT}_final.zkey"
echo "  - keys/${CIRCUIT}_verification_key.json"
echo "  - ../contracts/${CIRCUIT}_verifier.sol"
