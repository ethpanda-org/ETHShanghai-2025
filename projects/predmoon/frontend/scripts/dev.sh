#!/bin/bash

branch_mode=$(./scripts/readBranch.sh) || exit 1

tmp_env=$(./scripts/mergeEnv.sh "$branch_mode") || exit 1

echo "Using env: $tmp_env"
npx nuxi dev --dotenv "$tmp_env"