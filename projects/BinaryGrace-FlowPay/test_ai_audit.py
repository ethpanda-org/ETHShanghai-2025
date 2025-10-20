#!/usr/bin/env python3
"""
AI公平性审核功能测试脚本
"""

import asyncio
import sys
import os
from pathlib import Path

# 添加项目根目录到Python路径
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from agents.fairness_auditor import FairnessAuditor

async def test_ai_audit():
    """测试AI审核功能"""
    print("🧪 开始测试AI公平性审核功能...")
    
    try:
        # 初始化审核器
        auditor = FairnessAuditor()
        print("✅ FairnessAuditor 初始化成功")
        
        # 测试用例1: 正常公平选择
        print("\n📋 测试用例1: 正常公平选择")
        audit_result = await auditor.audit_winner_selection(
            task_id=1,
            selected_execution_index=0,
            publisher_address="0x1234567890123456789012345678901234567890"
        )
        
        print(f"审核结果: {audit_result}")
        print(f"是否公平: {audit_result['is_fair']}")
        print(f"置信度: {audit_result['confidence']}")
        print(f"原因: {audit_result['reason']}")
        
        # 测试用例2: 获取审核摘要
        print("\n📋 测试用例2: 获取审核摘要")
        summary = await auditor.get_audit_summary(task_id=1)
        print(f"审核摘要: {summary}")
        
        print("\n✅ AI审核功能测试完成")
        
    except Exception as e:
        print(f"❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_ai_audit())
