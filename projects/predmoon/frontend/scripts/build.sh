#!/bin/bash

branch_mode=$(./scripts/readBranch.sh) || exit 1

# case $branch_mode in
#     'juchain-stg' | 'main')
#     ;;
#     *)
#         branch_mode="dev"
#     ;;
# esac

tmp_env=$(./scripts/mergeEnv.sh "$branch_mode") || exit 1

echo $branch_mode
echo ""
if nuxt build --dotenv "$tmp_env"; then
  node scripts/telegramNotify.js "✅ Vercel Build Successed"
else
  node scripts/telegramNotify.js "❌ Vercel Build Failed"
  exit 1
fi
