#!/bin/bash

if [ -n "$VERCEL_GIT_COMMIT_REF" ]; then
  branch_name="${VERCEL_GIT_COMMIT_REF}"
else
  if git rev-parse --git-dir > /dev/null 2>&1; then
    branch_name=$(git rev-parse --abbrev-ref HEAD)
    if [ "$branch_name" = "HEAD" ]; then
      echo "当前处于分离头状态，无法获取分支名称"
      exit 1
    fi
  else
    echo "错误：当前目录不是 Git 仓库"
    exit 1
  fi
fi

safe_branch_name=$(echo "$branch_name" | sed -E 's/[^a-zA-Z0-9]+/-/g')

echo "$safe_branch_name"