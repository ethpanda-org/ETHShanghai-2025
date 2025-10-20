#!/bin/bash

if [ -z "$1" ]; then
  echo "error: missing branch mode" >&2
  exit 1
fi

branch_mode=$1
tmp_env="/tmp/env.combined"

if [ ! -f .env ]; then
  echo "error: can not find .env" >&2
  exit 1
fi

cat .env > "$tmp_env"

if [ -f ".env.$branch_mode" ]; then
  echo "" >> "$tmp_env"
  echo "#.env.$branch_mode " >> "$tmp_env"
  cat ".env.$branch_mode" >> "$tmp_env"
fi
if [ -f ".env.${branch_mode}.local" ]; then
  echo "" >> "$tmp_env"
  echo "#.env.${branch_mode}.local" >> "$tmp_env"
  cat ".env.${branch_mode}.local" >> "$tmp_env"
fi

if [ -f ".env.local" ]; then
  # echo "merge .env.local"
  echo "" >> "$tmp_env"
  echo "# .env.local" >> "$tmp_env"
  cat ".env.local" >> "$tmp_env"
fi

echo "$tmp_env"
