import os
import time
import asyncio
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, HTTPException, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field, AliasChoices
from dotenv import load_dotenv

from agents.task_agent import TaskAgent
from agents.fairness_auditor import FairnessAuditor
from blockchain.blockchain_client import BlockchainClient

load_dotenv()

app = FastAPI(
    title="FlowAI - 区块链AI Agent平台",
    description="去中心化的AI工作代理平台",
    version="1.0.0"
)

# 添加CORS中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 挂载静态文件
app.mount("/static", StaticFiles(directory="frontend/static"), name="static")

# 初始化组件
task_agent = TaskAgent()
fairness_auditor = FairnessAuditor()

def get_blockchain_client():
    """获取当前网络配置下的区块链客户端"""
    # 根据当前环境变量创建新的 BlockchainClient 实例
    return BlockchainClient()

# 内存中存储认领状态 - 允许多用户认领同一任务
claimed_tasks = {}  # {task_id: [user_addresses]}

# 内存中存储待批量提交的任务 - 避免重复执行
pending_submission_tasks = {}  # {task_id: [user_addresses]}

# Pydantic模型
class TaskInfo(BaseModel):
    id: int
    title: str
    description: str
    reward: int
    task_type: str
    requirements: str
    deadline: int
    publisher: str
    is_claimed: bool
    is_completed: bool
    executions: list = []  # 添加执行记录字段

class PublishTaskRequest(BaseModel):
    title: str
    description: str
    # 提交链接（可选）
    submission_link: str = Field(default='')
    # 接受 task_type 或 taskType
    task_type: str = Field(validation_alias=AliasChoices('task_type', 'taskType'))
    requirements: str = ""
    # deadline 可为时间戳或字符串
    deadline: str | int
    # reward 可为 ETH 小数、字符串或 Wei 整数
    reward: int | float | str
    # 接受 publisher_address 或 publisherAddress
    publisher_address: str = Field(validation_alias=AliasChoices('publisher_address', 'publisherAddress'))
    # Gas参数（可选）
    gas_limit: Optional[int] = None
    gas_price: Optional[int] = None  # Wei单位

    model_config = {
        'populate_by_name': True
    }

class WorkerStats(BaseModel):
    reputation: int
    completed_tasks: int
    total_earnings: float

class SelectWinnerRequest(BaseModel):
    execution_index: int
    publisher_address: str
    gas_limit: Optional[int] = None
    gas_price: Optional[int] = None  # Wei单位

class ClaimTaskRequest(BaseModel):
    user_address: str

class GetClaimedTasksRequest(BaseModel):
    user_address: str

# 根路径 - 返回前端页面
@app.get("/")
async def root():
    return FileResponse("frontend/index.html")

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "timestamp": time.time()}

# 获取所有任务
@app.get("/api/tasks")
async def get_tasks(lang: str = "zh"):
    """获取所有任务"""
    try:
        client = get_blockchain_client()
        available_task_ids = client.get_available_tasks()
        
        tasks = []
        for task_id in available_task_ids:
            task_data = client.get_task(task_id)
            if task_data:
                # 获取执行记录
                executions = client.get_executions(task_id)
                
                # 检查用户是否已认领此任务
                is_claimed = False
                if task_id in claimed_tasks:
                    # 这里需要从请求中获取用户地址，暂时设为False
                    is_claimed = False
                
                task_info = TaskInfo(
                    id=task_data['id'],
                    title=task_data['title'],
                    description=task_data['description'],
                    reward=task_data['reward'],
                    task_type=task_data['taskType'],
                    requirements=task_data['requirements'],
                    deadline=task_data['deadline'],
                    publisher=task_data['publisher'],
                    is_claimed=is_claimed,
                    is_completed=task_data['isCompleted'],
                    executions=executions
                )
                tasks.append(task_info)
        
        return {"tasks": tasks}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取任务失败: {str(e)}")

@app.post("/api/user/claimed-tasks")
async def get_user_claimed_tasks(request: GetClaimedTasksRequest, lang: str = "zh"):
    """获取用户认领的任务"""
    try:
        user_address = request.user_address
        if not user_address:
            return {"claimed_tasks": []}
        
        claimed_task_list = []
        for task_id, addresses in claimed_tasks.items():
            if user_address in addresses:
                # 获取任务详情
                client = get_blockchain_client()
                task_data = client.get_task(task_id)
                if task_data:
                    claimed_task_list.append({
                        "task_id": task_id,
                        "title": task_data['title'],
                        "description": task_data['description'],
                        "reward": task_data['reward'],
                        "deadline": task_data['deadline'],
                        "publisher": task_data['publisher']
                    })
        
        return {"claimed_tasks": claimed_task_list}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取认领任务失败: {str(e)}")

# 获取所有任务（包括已完成的）
@app.get("/api/tasks/available")
async def get_available_tasks(lang: str = "zh"):
    """获取所有任务（包括已完成的）"""
    try:
        client = get_blockchain_client()
        available_task_ids = client.get_available_tasks()
        
        tasks = []
        for task_id in available_task_ids:
            task_data = client.get_task(task_id)
            if task_data:
                # 获取执行记录
                executions = client.get_executions(task_id)
                
                task_info = TaskInfo(
                    id=task_data['id'],
                    title=task_data['title'],
                    description=task_data['description'],
                    reward=task_data['reward'],
                    task_type=task_data['taskType'],
                    requirements=task_data['requirements'],
                    deadline=task_data['deadline'],
                    publisher=task_data['publisher'],
                    is_claimed=False,  # 这里不检查认领状态
                    is_completed=task_data['isCompleted'],
                    executions=executions
                )
                tasks.append(task_info)
        
        return {"tasks": tasks}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取可用任务失败: {str(e)}")

# 获取特定任务详情
@app.get("/api/tasks/{task_id}")
async def get_task(task_id: int, lang: str = "zh"):
    """获取特定任务详情"""
    try:
        client = get_blockchain_client()
        task_data = client.get_task(task_id)
        
        if not task_data:
            raise HTTPException(status_code=404, detail="任务不存在")
        
        # 获取执行记录
        executions = client.get_executions(task_id)
        
        # 检查用户是否已认领此任务
        is_claimed = False
        if task_id in claimed_tasks:
            # 这里需要从请求中获取用户地址，暂时设为False
            is_claimed = False
        
        task_info = TaskInfo(
            id=task_data['id'],
            title=task_data['title'],
            description=task_data['description'],
            reward=task_data['reward'],
            task_type=task_data['taskType'],
            requirements=task_data['requirements'],
            deadline=task_data['deadline'],
            publisher=task_data['publisher'],
            is_claimed=is_claimed,
            is_completed=task_data['isCompleted'],
            executions=executions
        )
        
        return task_info
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取任务详情失败: {str(e)}")

# 发布任务
@app.post("/api/tasks/publish")
async def publish_task(request: PublishTaskRequest):
    """发布新任务（使用 PublishTaskRequest，兼容字段并转换单位）"""
    try:
        print(f"收到发布任务请求: {request.title}")
        
        # 处理截止时间
        if isinstance(request.deadline, str):
            # 如果是字符串，尝试解析
            try:
                deadline_timestamp = int(request.deadline)
            except ValueError:
                # 如果不是数字字符串，使用当前时间+7天作为默认值
                deadline_timestamp = int(time.time()) + 7 * 24 * 3600
        else:
            deadline_timestamp = int(request.deadline)
        
        # 处理奖励金额 - 转换为Wei
        if isinstance(request.reward, str):
            try:
                reward_eth = float(request.reward)
                reward_wei = int(reward_eth * 1e18)
            except ValueError:
                reward_wei = int(request.reward)
        elif isinstance(request.reward, float):
            reward_wei = int(request.reward * 1e18)
        else:
            reward_wei = int(request.reward)
        
        print(f"处理后的参数: deadline={deadline_timestamp}, reward={reward_wei} Wei")
        
        # 调用区块链客户端发布任务
        client = get_blockchain_client()
        result = client.publish_task(
            title=request.title,
            description=request.description,
            deadline=deadline_timestamp,
            task_type=request.task_type,
            requirements=request.requirements,
            reward=reward_wei,
            publisher_address=request.publisher_address,
            gas_limit=request.gas_limit,
            gas_price=request.gas_price
        )
        
        print(f"区块链发布结果: {result}")
        
        # 检查返回结果类型
        if isinstance(result, dict) and result.get('status') == 'pending_signature':
            print(f"🦊 发布任务需要 MetaMask 签名")
            return {
                "status": "pending_signature", 
                "message": "需要前端签名交易",
                "transaction": result['transaction'],
                "sender_address": result['sender_address']
            }
        elif result is True:
            return {"status": "success", "message": "任务发布成功"}
        else:
            raise HTTPException(status_code=500, detail="任务发布失败")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"发布任务失败: {str(e)}")

# 认领任务
@app.post("/api/tasks/{task_id}/claim")
async def claim_task(task_id: int, request: ClaimTaskRequest):
    """认领任务 - 仅更新内存状态，允许多用户认领同一任务"""
    try:
        print(f"收到认领请求 - 任务ID: {task_id}, 用户地址: {request.user_address}")
        
        # 验证用户地址
        if not request.user_address or request.user_address.strip() == "":
            print("错误: 用户地址为空")
            raise HTTPException(status_code=400, detail="用户地址不能为空")
        
        # 检查任务是否存在
        client = get_blockchain_client()
        task_data = client.get_task(task_id)
        if not task_data:
            print(f"错误: 任务 {task_id} 不存在")
            raise HTTPException(status_code=404, detail="任务不存在")
        
        # 检查任务是否已完成
        if task_data.get('isCompleted', False):
            print(f"错误: 任务 {task_id} 已完成")
            raise HTTPException(status_code=400, detail="任务已完成")
        
        # 使用前端传递的用户地址
        user_address = request.user_address.strip()
        
        # 将用户添加到认领列表（允许多用户认领）
        if task_id not in claimed_tasks:
            claimed_tasks[task_id] = []
        
        if user_address not in claimed_tasks[task_id]:
            claimed_tasks[task_id].append(user_address)
            print(f"用户 {user_address} 认领了任务 {task_id}")
            print(f"当前认领状态: {claimed_tasks}")
        else:
            print(f"用户 {user_address} 已经认领过任务 {task_id}")
        
        return {"status": "success", "message": "任务认领成功"}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"认领任务异常: {str(e)}")
        raise HTTPException(status_code=500, detail=f"认领任务失败: {str(e)}")

# 发布者选择获胜者并支付奖金
@app.post("/api/tasks/{task_id}/select-winner")
async def select_winner(task_id: int, request: SelectWinnerRequest):
    """发布者选择最佳提交并支付奖金（经过AI公平性审核）"""
    try:
        print(f"🔍 开始处理任务 {task_id} 的获胜者选择请求...")
        
        # 检查任务是否存在
        client = get_blockchain_client()
        task_data = client.get_task(task_id)
        if not task_data:
            raise HTTPException(status_code=404, detail="任务不存在")
        
        # 检查任务是否已完成
        if task_data.get('isCompleted', False):
            raise HTTPException(status_code=400, detail="任务已完成")
        
        # 检查是否有提交记录
        executions = client.get_executions(task_id)
        if request.execution_index >= len(executions):
            raise HTTPException(status_code=400, detail="无效的提交索引")
        
        print(f"🤖 开始AI公平性审核...")
        
        # AI公平性审核
        audit_result = await fairness_auditor.audit_winner_selection(
            task_id=task_id,
            selected_execution_index=request.execution_index,
            publisher_address=request.publisher_address
        )
        
        print(f"📊 审核结果: 公平性={audit_result['is_fair']}, 置信度={audit_result['confidence']}")
        
        # 如果审核不通过，返回审核结果
        if not audit_result['is_fair']:
            print(f"❌ AI审核不通过: {audit_result['reason']}")
            return {
                "status": "audit_failed",
                "message": "AI审核不通过，选择可能不公平",
                "audit_result": {
                    "is_fair": audit_result['is_fair'],
                    "confidence": audit_result['confidence'],
                    "reason": audit_result['reason'],
                    "risk_factors": audit_result['risk_factors'],
                    "recommendations": audit_result['recommendations']
                }
            }
        
        print(f"✅ AI审核通过，继续执行支付流程...")
        
        # 调用区块链方法选择获胜者并支付
        result = client.select_winner_and_pay(
            task_id,
            request.execution_index,
            request.publisher_address,
            task_data['reward'],  # 传递奖金金额
            gas_limit=request.gas_limit,
            gas_price=request.gas_price
        )
        
        # 检查返回结果类型
        if isinstance(result, dict) and result.get('status') == 'pending_signature':
            print(f"🦊 选择获胜者需要 MetaMask 签名")
            return {
                "status": "pending_signature",
                "pending_signature": result,
                "message": "需要 MetaMask 签名选择获胜者并支付奖金",
                "audit_result": {
                    "is_fair": audit_result['is_fair'],
                    "confidence": audit_result['confidence'],
                    "reason": audit_result['reason']
                }
            }
        elif result:
            # 直接成功的情况（devnet）
            # 从内存中移除认领状态
            if task_id in claimed_tasks:
                del claimed_tasks[task_id]
            
            winner = executions[request.execution_index]
            return {
                "status": "success",
                "message": "获胜者已选定，奖金已支付（AI审核通过）",
                "winner": winner['executor'],
                "reward": task_data['reward'],
                "audit_result": {
                    "is_fair": audit_result['is_fair'],
                    "confidence": audit_result['confidence'],
                    "reason": audit_result['reason']
                }
            }
        else:
            raise HTTPException(status_code=500, detail="选择获胜者失败")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"选择获胜者失败: {str(e)}")

# 获取任务审核摘要
@app.get("/api/tasks/{task_id}/audit-summary")
async def get_audit_summary(task_id: int):
    """获取任务的AI审核摘要"""
    try:
        audit_summary = await fairness_auditor.get_audit_summary(task_id)
        return audit_summary
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取审核摘要失败: {str(e)}")

# 获取工作统计
@app.get("/api/worker/stats")
async def get_worker_stats():
    """获取工作统计"""
    try:
        # 这里可以添加更多统计信息
        return {
            "total_tasks": len(claimed_tasks),
            "active_workers": len(set([addr for addresses in claimed_tasks.values() for addr in addresses]))
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取工作统计失败: {str(e)}")

# AI Agent 相关API
@app.post("/api/agent/work/start")
async def start_work():
    """启动AI Agent工作"""
    try:
        return {"status": "success", "message": "AI Agent工作已启动"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"启动AI Agent失败: {str(e)}")

@app.post("/api/agent/work/sync")
async def execute_work_cycle(request: Request):
    """执行工作周期 - 支持AI Agent地址和执行结果保存到合约"""
    try:
        # 解析请求体
        body = await request.json()
        claimed_task_ids = body.get('claimed_task_ids', [])
        execution_order = body.get('execution_order', 'ai')
        completed_task_ids = body.get('completed_task_ids', [])
        is_manual_execution = body.get('is_manual_execution', False)
        executor_address = body.get('executor_address')
        gas_limit = body.get('gas_limit')
        gas_price = body.get('gas_price')
        
        print(f"🔄 执行工作周期: 认领任务={claimed_task_ids}, 执行者={executor_address}")
        
        # 执行AI Agent工作周期
        result = await task_agent.work_cycle(
            claimed_task_ids=claimed_task_ids,
            execution_order=execution_order,
            completed_task_ids=completed_task_ids,
            is_manual_execution=is_manual_execution,
            executor_address=executor_address,
            gas_limit=gas_limit,
            gas_price=gas_price
        )
        
        return result
        
    except Exception as e:
        print(f"❌ 执行工作周期失败: {e}")
        raise HTTPException(status_code=500, detail=f"执行工作周期失败: {str(e)}")

@app.post("/api/agent/work/submit-execution")
async def submit_execution(request: Request):
    """提交单个执行记录到区块链"""
    try:
        # 解析请求体
        body = await request.json()
        task_id = body.get('task_id')
        executor_address = body.get('executor_address')
        result = body.get('result')
        gas_limit = body.get('gas_limit')
        gas_price = body.get('gas_price')
        
        print(f"📤 提交执行记录: 任务={task_id}, 执行者={executor_address}")
        
        # 调用区块链客户端提交执行记录
        client = get_blockchain_client()
        success = client.submit_execution(
            task_id=task_id,
            executor_address=executor_address,
            result=result,
            gas_limit=gas_limit,
            gas_price=gas_price
        )
        
        if success:
            return {"status": "success", "message": "执行记录提交成功"}
        else:
            raise HTTPException(status_code=500, detail="提交执行记录失败")
            
    except Exception as e:
        print(f"❌ 提交执行记录失败: {e}")
        raise HTTPException(status_code=500, detail=f"提交执行记录失败: {str(e)}")

# 区块链相关API
@app.get("/api/blockchain/balance/{address}")
async def get_balance(address: str):
    """获取指定地址的账户余额"""
    try:
        client = get_blockchain_client()
        balance = client.get_balance(address)
        return {"address": address, "balance": balance}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取余额失败: {str(e)}")

@app.post("/api/agent/work/clear-pending-submissions")
async def clear_pending_submissions(request: Request):
    """清理待批量提交的任务跟踪"""
    try:
        # 清理内存中的待提交任务
        global pending_submission_tasks
        pending_submission_tasks.clear()
        
        return {"status": "success", "message": "待提交任务已清理"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"清理待提交任务失败: {str(e)}")

# Gas估算API
@app.get("/api/blockchain/estimate-gas/publish")
async def estimate_gas_for_publish():
    """估算发布任务所需的gas"""
    try:
        client = get_blockchain_client()
        gas_estimate = client.estimate_gas_for_publish()
        return {"gas_estimate": gas_estimate}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"估算Gas失败: {str(e)}")

@app.get("/api/blockchain/estimate-gas/execution")
async def estimate_gas_for_execution():
    """估算执行任务所需的gas"""
    try:
        client = get_blockchain_client()
        gas_estimate = client.estimate_gas_for_execution()
        return {"gas_estimate": gas_estimate}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"估算Gas失败: {str(e)}")

@app.get("/api/blockchain/estimate-gas/payment")
async def estimate_gas_for_payment():
    """估算支付奖金所需的gas"""
    try:
        client = get_blockchain_client()
        gas_estimate = client.estimate_gas_for_payment()
        return {"gas_estimate": gas_estimate}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"估算Gas失败: {str(e)}")

@app.get("/api/network/info")
async def get_network_info():
    """获取当前网络信息"""
    try:
        client = get_blockchain_client()
        network_type = client.network_type
        supports_metamask = network_type in ['testnet', 'mainnet']
        
        return {
            "network_type": network_type,
            "supports_metamask": supports_metamask,
            "description": f"当前网络: {network_type}"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取网络信息失败: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
