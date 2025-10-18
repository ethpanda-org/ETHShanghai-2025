#!/bin/bash
echo "Starting ContractGuard AI Frontend..."
cd frontend
echo "Installing dependencies..."
pnpm install
echo "Starting development server..."
pnpm run dev
