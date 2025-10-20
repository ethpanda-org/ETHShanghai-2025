#!/bin/bash

# 添加 Git Submodules 到 Thyra 项目
# 脚本会自动添加三个主要的 Thyra 仓库作为 submodule

echo "开始添加 Git Submodules..."

# 添加 ThyraAccountV1
echo "正在添加 ThyraAccountV1..."
git submodule add https://github.com/Thyra-Protocol/ThyraAccountV1.git ThyraAccountV1
if [ $? -eq 0 ]; then
    echo "✓ ThyraAccountV1 添加成功"
else
    echo "✗ ThyraAccountV1 添加失败（可能已存在）"
fi

# 添加 Thyra-Demo
echo "正在添加 Thyra-Demo..."
git submodule add https://github.com/Thyra-Protocol/Thyra-Demo.git Thyra-Demo
if [ $? -eq 0 ]; then
    echo "✓ Thyra-Demo 添加成功"
else
    echo "✗ Thyra-Demo 添加失败（可能已存在）"
fi

# 添加 ThyraCore
echo "正在添加 ThyraCore..."
git submodule add https://github.com/Thyra-Protocol/ThyraCore.git ThyraCore
if [ $? -eq 0 ]; then
    echo "✓ ThyraCore 添加成功"
else
    echo "✗ ThyraCore 添加失败（可能已存在）"
fi

echo ""
echo "=============================="
echo "Submodule 添加完成！"
echo "=============================="
echo ""
echo "注意：第4个链接 'ThyraFrontend' 是 Thyra-Demo 仓库的子目录，"
echo "Git submodule 无法单独添加子目录。"
echo "ThyraFrontend 已包含在 Thyra-Demo submodule 中。"
echo ""
echo "要初始化并更新所有 submodule，请运行："
echo "  git submodule update --init --recursive"

