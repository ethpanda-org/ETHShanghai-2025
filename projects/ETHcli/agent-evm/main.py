# agent_with_mcp_evm.py
# EVM 版本的 AI 代理 - 独立项目

# 隐藏 gRPC 和 MCP 警告
import os
os.environ['GRPC_VERBOSITY'] = 'ERROR'
os.environ['GRPC_TRACE'] = ''
os.environ['PYTHONWARNINGS'] = 'ignore'

import grpc
import asyncio
import json
import traceback
import sys
from dotenv import load_dotenv

import agent_pb2
import agent_pb2_grpc

# LLM
from langchain_google_genai import ChatGoogleGenerativeAI

# LangChain agent (使用 create_react_agent)
from langgraph.prebuilt import create_react_agent

# LangChain core history (用于会话管理)
from langchain_core.chat_history import InMemoryChatMessageHistory
from langchain_core.messages import HumanMessage, AIMessage

# MCP adapters
from langchain_mcp_adapters.client import MultiServerMCPClient



# ========= 环境变量 =========
load_dotenv()
google_api_key = os.getenv("GOOGLE_API_KEY")
if not google_api_key:
    raise ValueError("请在 .env 文件中设置 GOOGLE_API_KEY")

# ========= LLM =========
# 配置系统提示词
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder

system_prompt = """你是一个专业的 EVM/以太坊区块链助手。

重要规则：
1. 始终以纯文本格式回答，不要使用任何JSON结构或复杂格式
2. 当你使用工具查询数据时，请理解并总结返回的结果，用清晰、友好的方式呈现给用户
3. 工具返回的数据已经是纯文本格式，请直接解析和总结，不要显示原始的JSON数据
4. 对于代币余额查询，提取关键信息：代币名称、数量、价值（如果有），用简洁的列表或表格呈现
5. 对于价格查询，用简洁的格式展示价格和时间
6. 对于 NFT 查询，总结 NFT 的数量和主要收藏
7. 对于交易历史，列出重要的交易信息，包括时间、金额、交易哈希等
8. 使用中文回答，保持专业和友好的语气
9. 始终以用户友好的方式呈现数据，避免显示技术细节
10. 回答要简洁明了，避免冗长的解释

示例：
✅ 很好：该地址共有 96 种不同的代币，主要包括：
  💰 ETH: 0.788 枚（价值 $3,954.63）
  💰 POL: 400,000,000 枚
  💰 ANON: 199,999 枚
  以及其他 93 种代币。

✅ 很好：最近的交易记录：
  📅 2024-01-15: 转入 0.5 ETH
  📅 2024-01-14: 转出 100 USDC
  📅 2024-01-13: 转入 1.2 ETH

❌ 避免：显示复杂的JSON结构或技术细节
"""

llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    google_api_key=google_api_key,
    temperature=0.2,
)




# ========= 会话历史 =========
store = {}


def get_session_history(session_id: str):
    if session_id not in store:
        store[session_id] = InMemoryChatMessageHistory()
    return store[session_id]


# ========= gRPC Servicer =========
class AgentService(agent_pb2_grpc.AgentServiceServicer):
    def __init__(self, agent, session_getter, mcp_client):
        self.agent = agent
        self.get_session_history = session_getter
        self.mcp_client = mcp_client

    async def Chat(self, request, context):
        user_input = request.message
        session_id = "test-session"
        print(f"[Agent] 收到 Chat (session={session_id}): {user_input}")

        session_history = self.get_session_history(session_id)

        try:
            # 将历史消息和当前用户输入构造成代理所需的格式
            messages = []
            
            # 添加系统消息（仅在首次对话时）
            if len(session_history.messages) == 0:
                from langchain_core.messages import SystemMessage
                messages.append(SystemMessage(content=system_prompt))
            
            # 添加历史消息
            for msg in session_history.messages:
                if msg.type == "human":
                    messages.append(HumanMessage(content=msg.content))
                elif msg.type == "ai":
                    messages.append(AIMessage(content=msg.content))
            # 添加当前用户消息
            messages.append(HumanMessage(content=user_input))

            # 调用代理
            agent_response = await self.agent.ainvoke({"messages": messages})

            # 代理的响应是一个字典，其中 "messages" 包含了新的消息列表
            new_messages = agent_response["messages"]

            # 将新的消息添加到历史记录中
            for msg in new_messages[len(messages):]:  # 只添加新生成的消息
                if isinstance(msg, HumanMessage):
                    session_history.add_user_message(msg.content)
                elif isinstance(msg, AIMessage):
                    session_history.add_ai_message(msg.content)

                    # 安全地将内容转换为字符串
                    content_str = ""
                    if isinstance(msg.content, str):
                        content_str = msg.content
                    elif isinstance(msg.content, (list, dict)):
                        # 检查是否是MCP工具响应格式
                        if isinstance(msg.content, dict) and "content" in msg.content:
                            # 提取MCP工具响应中的纯文本内容
                            content_list = msg.content.get("content", [])
                            if isinstance(content_list, list) and len(content_list) > 0:
                                first_content = content_list[0]
                                if isinstance(first_content, dict) and "text" in first_content:
                                    content_str = first_content["text"]
                                else:
                                    content_str = str(first_content)
                            else:
                                content_str = json.dumps(msg.content, ensure_ascii=False, indent=2)
                        # 检查是否是AI回答的复杂JSON格式
                        elif isinstance(msg.content, list) and len(msg.content) > 0:
                            first_item = msg.content[0]
                            if isinstance(first_item, dict) and "type" in first_item and "text" in first_item:
                                # 提取纯文本内容，忽略extras和signature
                                content_str = first_item.get("text", "")
                            else:
                                content_str = str(first_item)
                        else:
                            # 如果是其他结构化数据，转换为 JSON 字符串
                            content_str = json.dumps(msg.content, ensure_ascii=False, indent=2)
                    else:
                        # 其他类型，强制转为字符串
                        content_str = str(msg.content)

                    # 按字符流式输出，确保兼容性
                    for char in content_str:
                        yield agent_pb2.ChatResponse(content=char)

            yield agent_pb2.ChatResponse(content="[STREAM_END]")

        except Exception as e:
            error_msg = f"Chat 处理失败: {str(e)}"
            print(f"[ERROR] {error_msg}", file=sys.stderr)
            traceback.print_exc(file=sys.stderr)
            await context.abort(grpc.StatusCode.UNKNOWN, error_msg)

    async def ExecuteAction(self, request, context):
        print(f"[Agent] 收到 ExecuteAction: {request.action} {request.params}")
        action_result = {
            "executed_action": request.action,
            "params": json.loads(request.params) if request.params else {},
            "status": "ok"
        }
        return agent_pb2.ActionResponse(
            success=True,
            result=json.dumps(action_result)
        )


# ========= 主服务启动 =========
async def serve():
    # --- 从环境变量安全地读取私钥 ---
    private_key = os.getenv("EVM_PRIVATE_KEY")  # ✅ 改为 EVM_PRIVATE_KEY
    if not private_key:
        print("[ERROR] EVM_PRIVATE_KEY environment variable not set. This service should be launched by evm-cli.", file=sys.stderr)
        sys.exit(1)
    
    # --- 立即从当前环境移除，减少暴露 ---
    try:
        del os.environ["EVM_PRIVATE_KEY"]  # ✅ 改为 EVM_PRIVATE_KEY
    except KeyError:
        pass # 如果键不存在，也无妨

    # Get the absolute path to the project root directory relative to this script's location.
    SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
    PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, os.pardir))

    # ✅ EVM 专用配置 - 使用新的 Alchemy MCP Server (Node.js版本)
    # 查找 node 命令的完整路径
    import shutil
    node_path = shutil.which("node") or os.path.expanduser("~/.nvm/versions/node/v20.19.3/bin/node")
    if not os.path.exists(node_path if node_path else ""):
        node_path = "/usr/local/bin/node"  # 备用路径
    
    mcp_servers = {
        "alchemy": {  # Alchemy官方MCP服务器
            "command": node_path,
            "args": [os.path.join(PROJECT_ROOT, "evm-mcp", "dist", "index.js")],
            "transport": "stdio",
            # --- 传递 Alchemy API Key 给 MCP 子进程 ---
            "env": {
                "ALCHEMY_API_KEY": os.getenv("ALCHEMY_API_KEY", "9FIy7L0mx0c7ZhSAOmpWwrUKPAaKADjm"),
                "EVM_PRIVATE_KEY": private_key,
            }
        }
    }

    client = MultiServerMCPClient(mcp_servers)
    print("[MCP] MultiServerMCPClient 已初始化，开始加载 Alchemy 工具...")
    tools = await client.get_tools()
    print(f"[MCP] 已加载 {len(tools)} 个 Alchemy 工具: {[getattr(t, 'name', str(t)) for t in tools]}")

    # 创建代理
    # 注意：langgraph 的 create_react_agent 会自动使用 LLM 的系统提示
    # 我们需要在 LLM 初始化时设置系统消息
    agent = create_react_agent(llm, tools)

    server = grpc.aio.server()
    servicer = AgentService(agent, get_session_history, client)
    agent_pb2_grpc.add_AgentServiceServicer_to_server(servicer, server)
    server.add_insecure_port("[::]:50051")
    await server.start()
    print("[Agent] EVM Agent async gRPC 服务启动，监听端口 50051")
    await server.wait_for_termination()


if __name__ == "__main__":
    try:
        asyncio.run(serve())
    except KeyboardInterrupt:
        print("退出中...")

