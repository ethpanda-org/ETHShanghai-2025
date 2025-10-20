import os
import json
import asyncio
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
from dotenv import load_dotenv

from blockchain.blockchain_client import BlockchainClient
from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate

# 确保加载 .env
load_dotenv()

class FairnessAuditor:
    """AI公平性审核器 - 审核任务执行结果的公平性"""
    
    def __init__(self):
        # 初始化区块链客户端
        self.blockchain_client = BlockchainClient()
        
        # 从环境变量读取 API Key
        api_key = os.getenv('OPENAI_API_KEY')
        print(f"🔍 FairnessAuditor配置: OPENAI_API_KEY={'已设置' if bool(api_key) else '未设置'}")
        
        # 初始化LLM
        try:
            if not api_key:
                raise RuntimeError('未找到 OPENAI_API_KEY')
            self.llm = ChatOpenAI(
                model="deepseek-v3-250324",
                temperature=0.3,  # 降低温度以获得更一致的结果
                max_tokens=2000,
                base_url="https://ark.cn-beijing.volces.com/api/v3",
                api_key=api_key,
            )
            self.output_parser = StrOutputParser()
            print("🤖 FairnessAuditor 初始化完成: model=deepseek-v3-250324")
        except Exception as e:
            self.llm = None
            self.output_parser = None
            print(f"⚠️ 初始化LLM失败，将使用回退: {e}")
    
    async def audit_winner_selection(self, task_id: int, selected_execution_index: int, publisher_address: str) -> Dict[str, Any]:
        """
        审核获胜者选择的公平性
        
        Args:
            task_id: 任务ID
            selected_execution_index: 被选中的执行记录索引
            publisher_address: 发布者地址
            
        Returns:
            {
                "is_fair": bool,
                "confidence": float,  # 0-1之间的置信度
                "reason": str,
                "risk_factors": List[str],
                "recommendations": List[str]
            }
        """
        try:
            print(f"🔍 开始审核任务 {task_id} 的获胜者选择...")
            
            # 获取任务信息
            task_data = self.blockchain_client.get_task(task_id)
            if not task_data:
                return {
                    "is_fair": False,
                    "confidence": 0.0,
                    "reason": "任务不存在",
                    "risk_factors": ["任务不存在"],
                    "recommendations": ["请检查任务ID"]
                }
            
            # 获取所有执行记录
            executions = self.blockchain_client.get_executions(task_id)
            if not executions or len(executions) == 0:
                return {
                    "is_fair": False,
                    "confidence": 0.0,
                    "reason": "没有执行记录",
                    "risk_factors": ["没有执行记录"],
                    "recommendations": ["等待更多执行记录"]
                }
            
            # 检查选中的执行记录是否存在
            if selected_execution_index >= len(executions):
                return {
                    "is_fair": False,
                    "confidence": 0.0,
                    "reason": "选中的执行记录不存在",
                    "risk_factors": ["无效的执行记录索引"],
                    "recommendations": ["请选择有效的执行记录"]
                }
            
            # 准备审核数据
            audit_data = {
                "task": task_data,
                "executions": executions,
                "selected_execution": executions[selected_execution_index],
                "selected_index": selected_execution_index,
                "publisher_address": publisher_address,
                "total_executions": len(executions)
            }
            
            # 执行AI审核
            audit_result = await self._perform_ai_audit(audit_data)
            
            print(f"✅ 审核完成: 公平性={audit_result['is_fair']}, 置信度={audit_result['confidence']}")
            return audit_result
            
        except Exception as e:
            print(f"❌ 审核过程中发生错误: {e}")
            return {
                "is_fair": False,
                "confidence": 0.0,
                "reason": f"审核失败: {str(e)}",
                "risk_factors": ["审核系统错误"],
                "recommendations": ["请联系技术支持"]
            }
    
    async def _perform_ai_audit(self, audit_data: Dict[str, Any]) -> Dict[str, Any]:
        """执行AI审核分析"""
        
        if not self.llm:
            # 回退到简单规则检查
            return self._fallback_audit(audit_data)
        
        try:
            # 构建审核提示
            prompt = self._build_audit_prompt(audit_data)
            
            # 创建提示模板
            prompt_template = ChatPromptTemplate.from_template(prompt)
            
            # 执行AI分析
            chain = prompt_template | self.llm | self.output_parser
            result = await chain.ainvoke({})
            
            # 解析AI结果
            return self._parse_ai_result(result)
            
        except Exception as e:
            print(f"❌ AI审核失败: {e}")
            return self._fallback_audit(audit_data)
    
    def _build_audit_prompt(self, audit_data: Dict[str, Any]) -> str:
        """构建审核提示"""
        
        task = audit_data["task"]
        executions = audit_data["executions"]
        selected_execution = audit_data["selected_execution"]
        publisher_address = audit_data["publisher_address"]
        
        # 构建执行记录摘要
        executions_summary = []
        for i, exec in enumerate(executions):
            executions_summary.append(f"""
执行记录 {i}:
- 执行者: {exec['executor']}
- 执行时间: {datetime.fromtimestamp(exec['executedAt']).strftime('%Y-%m-%d %H:%M:%S')}
- 结果长度: {len(exec['result'])} 字符
- 结果预览: {exec['result'][:200]}...
""")
        
        prompt = f"""
你是一个专业的任务执行结果公平性审核专家。请分析以下任务执行情况，判断发布者选择的获胜者是否公平合理。

任务信息:
- 任务ID: {task['id']}
- 任务标题: {task['title']}
- 任务描述: {task['description']}
- 任务类型: {task['taskType']}
- 奖励金额: {task['reward']} Wei
- 发布者: {task['publisher']}
- 当前选择者: {publisher_address}

所有执行记录:
{''.join(executions_summary)}

被选中的执行记录:
- 索引: {audit_data['selected_index']}
- 执行者: {selected_execution['executor']}
- 执行时间: {datetime.fromtimestamp(selected_execution['executedAt']).strftime('%Y-%m-%d %H:%M:%S')}
- 结果: {selected_execution['result']}

请从以下角度分析公平性:

1. **结果质量分析**: 被选中的执行结果是否明显优于其他结果？
2. **时间因素**: 是否存在时间上的不公平（如只选择最早提交的）？
3. **执行者关系**: 发布者和被选中执行者是否存在特殊关系？
4. **结果完整性**: 被选中的结果是否完整回答了任务要求？
5. **创新性**: 被选中的结果是否具有创新性或独特性？

请以JSON格式返回分析结果:
{{
    "is_fair": true/false,
    "confidence": 0.0-1.0,
    "reason": "详细的分析原因",
    "risk_factors": ["风险因素1", "风险因素2"],
    "recommendations": ["建议1", "建议2"]
}}

注意:
- is_fair: 是否认为选择公平
- confidence: 对判断的置信度 (0-1)
- reason: 详细的分析原因
- risk_factors: 识别的风险因素列表
- recommendations: 改进建议列表
"""
        
        return prompt
    
    def _parse_ai_result(self, ai_result: str) -> Dict[str, Any]:
        """解析AI返回的结果"""
        try:
            # 尝试解析JSON
            result = json.loads(ai_result)
            
            # 验证必要字段
            required_fields = ["is_fair", "confidence", "reason", "risk_factors", "recommendations"]
            for field in required_fields:
                if field not in result:
                    raise ValueError(f"缺少必要字段: {field}")
            
            # 验证数据类型
            if not isinstance(result["is_fair"], bool):
                result["is_fair"] = str(result["is_fair"]).lower() in ["true", "1", "yes"]
            
            if not isinstance(result["confidence"], (int, float)):
                result["confidence"] = 0.5
            
            # 确保置信度在0-1之间
            result["confidence"] = max(0.0, min(1.0, float(result["confidence"])))
            
            if not isinstance(result["risk_factors"], list):
                result["risk_factors"] = []
            
            if not isinstance(result["recommendations"], list):
                result["recommendations"] = []
            
            return result
            
        except Exception as e:
            print(f"❌ 解析AI结果失败: {e}")
            print(f"原始结果: {ai_result}")
            
            # 回退到简单分析
            return {
                "is_fair": "fair" in ai_result.lower() or "公平" in ai_result,
                "confidence": 0.5,
                "reason": f"AI分析结果解析失败，原始结果: {ai_result[:200]}...",
                "risk_factors": ["AI结果解析失败"],
                "recommendations": ["建议人工审核"]
            }
    
    def _fallback_audit(self, audit_data: Dict[str, Any]) -> Dict[str, Any]:
        """回退审核逻辑（当AI不可用时）"""
        
        task = audit_data["task"]
        executions = audit_data["executions"]
        selected_execution = audit_data["selected_execution"]
        publisher_address = audit_data["publisher_address"]
        
        risk_factors = []
        recommendations = []
        
        # 检查1: 发布者是否选择了自己
        if selected_execution["executor"].lower() == publisher_address.lower():
            risk_factors.append("发布者选择了自己的执行结果")
            recommendations.append("建议选择其他执行者的结果")
        
        # 检查2: 结果长度是否合理
        result_length = len(selected_execution["result"])
        if result_length < 50:
            risk_factors.append("选中的结果长度过短，可能质量不足")
            recommendations.append("建议选择内容更丰富的执行结果")
        
        # 检查3: 是否有其他更长的结果
        other_results = [exec for exec in executions if exec != selected_execution]
        if other_results:
            max_other_length = max(len(exec["result"]) for exec in other_results)
            if max_other_length > result_length * 1.5:
                risk_factors.append("存在明显更长的执行结果")
                recommendations.append("建议考虑选择内容更丰富的执行结果")
        
        # 检查4: 执行时间是否合理
        selected_time = selected_execution["executedAt"]
        other_times = [exec["executedAt"] for exec in other_results]
        if other_times:
            min_other_time = min(other_times)
            if selected_time > min_other_time + 3600:  # 超过1小时
                risk_factors.append("选中的结果提交时间较晚")
                recommendations.append("建议考虑更早提交的高质量结果")
        
        # 计算公平性
        is_fair = len(risk_factors) == 0
        confidence = 0.8 if is_fair else 0.6
        
        return {
            "is_fair": is_fair,
            "confidence": confidence,
            "reason": "基于简单规则的回退审核",
            "risk_factors": risk_factors,
            "recommendations": recommendations
        }
    
    async def get_audit_summary(self, task_id: int) -> Dict[str, Any]:
        """获取任务的审核摘要"""
        try:
            task_data = self.blockchain_client.get_task(task_id)
            executions = self.blockchain_client.get_executions(task_id)
            
            if not task_data or not executions:
                return {
                    "task_id": task_id,
                    "total_executions": 0,
                    "audit_status": "no_data",
                    "message": "任务或执行记录不存在"
                }
            
            return {
                "task_id": task_id,
                "total_executions": len(executions),
                "audit_status": "ready",
                "message": f"任务有 {len(executions)} 条执行记录，可以进行审核"
            }
            
        except Exception as e:
            return {
                "task_id": task_id,
                "total_executions": 0,
                "audit_status": "error",
                "message": f"获取审核摘要失败: {str(e)}"
            }
