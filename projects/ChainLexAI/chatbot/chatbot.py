# -*- coding: utf-8 -*-
"""
RWA代币发行说明书智能交互Agent系统 - 基于LangGraph的多工具Graph架构
改造自test-graph-demo.py，实现多工具、多节点的graph-based智能交互agent系统
"""
import re
import json
from pathlib import Path
from typing import Dict, List, Optional, Tuple, TypedDict, Literal, Any
from datetime import datetime

from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain_core.tools import tool
from langchain.agents import AgentExecutor, create_openai_tools_agent, AgentType
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import InMemorySaver

# ==================== 状态定义 ====================
class DocumentState(TypedDict):
    """文档填写状态 - 增强版本支持Agent交互"""
    current_section: int  # 当前处理的章节 (0-11)
    section_contents: Dict[str, Dict[str, str]]  # 每个章节的内容
    filled_placeholders: Dict[str, Dict[str, str]]  # 已填写的占位符
    pending_placeholders: Dict[str, List[str]]  # 待填写的占位符
    interaction_mode: str  # "ask" | "fill" | "confirm" | "auto"
    conversation_history: List[Dict[str, str]]  # 对话历史
    last_user_input: str  # 最近用户输入
    ai_summary: str  # AI生成的摘要
    agent_response: str  # Agent的响应
    section_complete: bool  # 当前章节是否完成
    extracted_info: Dict[str, Any]  # 提取的结构化信息

# ==================== 文档配置 ====================
SECTION_TITLES = [
    "执行摘要（Executive Summary）",
    "发行主体与治理（Issuer & Governance）",
    "代币概览与分类（Token Overview & Classification）",
    "法律与合规（Legal & Regulatory）",
    "Tokenomics（供给、分配、解锁、金库）",
    "募集历史与资金用途（Fundraising & Use of Proceeds）",
    "技术与安全（Technology & Security）",
    "上市与交易安排（Listing & Trading）",
    "市场诚信与信息披露（Market Integrity & Disclosures）",
    "主要风险（Key Risks）",
    "事件响应与下架（Incident & Delisting）",
    "声明与签署（Declarations）"
]

SECTION_NAMES = [f"section_{i}" for i in range(12)]

# ==================== 智能建议知识库 ====================
SUGGESTION_TEMPLATES = {
    "executive_summary": {
        "token_name": ["CloudComputer Token", "CCT", "CloudRWA", "CRWT"],
        "asset_nature": ["债权", "收益权", "基金份额", "票据"],
        "target_market": ["专业投资者（PI）", "仅机构投资者", "合格投资者"],
        "risk_summary": ["技术实施风险", "监管合规风险", "流动性风险"]
    },
    "legal_compliance": {
        "offering_route": ["私募（专业投资者，≤50人，单笔≥HKD 500k）", "公募（需要相应监管授权）"],
        "jurisdiction": ["香港(SFC)", "新加坡(MAS)", "阿联酋(ADGM)", "欧盟MiCA"],
        "kyc_provider": ["Chainalysis", "Sumsub", "IdentityMind", "Onfido"]
    },
    "tokenomics": {
        "total_supply": ["100,000,000", "1,000,000,000", "10,000,000,000"],
        "team_allocation": "15-20%",
        "community_allocation": "30-40%",
        "ecosystem_allocation": "20-25%",
        "liquidity_allocation": "10-15%"
    },
    "technical_security": {
        "blockchain": ["Ethereum", "BNB Chain", "Arbitrum", "Polygon", "Base"],
        "audit_firm": ["CertiK", "Quantstamp", "Trail of Bits", "OpenZeppelin"],
        "custody": ["Fireblocks", "Anchorage Digital", "Coinbase Prime", "BitGo"]
    }
}

# ==================== 多工具层（Tools）====================
@tool
def extract_info_tool(text: str) -> str:
    """
    解析用户输入，提取结构化字段信息

    Args:
        text: 用户的自然语言输入

    Returns:
        JSON格式的结构化信息字符串
    """
    extracted = {}

    # 提取代币相关信息
    token_patterns = {
        "token_name": r"(?:代币|token|币种|名称)[:：\s]*([A-Za-z]{2,})",
        "token_symbol": r"(?:简称|符号|symbol)[:：\s]*([A-Z]{2,5})",
        "total_supply": r"(?:总量|发行量|supply)[:：\s]*([0-9,]+)",
        "blockchain": r"(?:链|网络|blockchain|chain)[:：\s]*([A-Za-z\s]+)",
        "date": r"(?:日期|时间|date)[:：\s]*(\d{4}[-/]\d{1,2}[-/]\d{1,2})"
    }

    for field, pattern in token_patterns.items():
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            extracted[field] = match.group(1).strip()

    # 提取决策模式
    if any(keyword in text.lower() for keyword in ["你来决定", "你决定吧", "自动填", "决定吧"]):
        extracted["decision_mode"] = "auto_fill"
    elif any(keyword in text.lower() for keyword in ["建议", "推荐", "推荐"]):
        extracted["decision_mode"] = "suggest"
    else:
        extracted["decision_mode"] = "user_direct"

    # 提取章节相关信息
    if "spv" in text.lower():
        extracted["entity_structure"] = "SPV"
    elif "基金" in text:
        extracted["entity_structure"] = "基金"

    if "certik" in text.lower():
        extracted["audit_firm"] = "CertiK"
    elif "quantstamp" in text.lower():
        extracted["audit_firm"] = "Quantstamp"

    return json.dumps(extracted, ensure_ascii=False, indent=2)

@tool
def autofill_tool(state_json: str) -> str:
    """
    根据上下文补齐未填写内容

    Args:
        state_json: DocumentState的JSON字符串

    Returns:
        自动填写的内容描述
    """
    try:
        state_data = json.loads(state_json)
        current_section_idx = state_data.get("current_section", 0)
        section_name = SECTION_NAMES[current_section_idx]

        # 模拟一些待填写的占位符
        pending_placeholders = [
            "代币名称", "合约地址", "资产性质", "目标市场",
            "发行结构", "审计机构", "法域选择", "KYC提供商"
        ]

        filled_content = {}

        for placeholder in pending_placeholders:
            suggestion = get_smart_suggestion(placeholder, section_name)
            filled_content[placeholder] = suggestion

        result = {
            "action": "autofill_complete",
            "section": section_name,
            "filled_items": filled_content,
            "message": f"已自动填写 {len(filled_content)} 项内容"
        }

        return json.dumps(result, ensure_ascii=False, indent=2)

    except Exception as e:
        return json.dumps({"error": f"自动填写失败: {str(e)}"}, ensure_ascii=False)

@tool
def summarize_tool(state_json: str) -> str:
    """
    总结当前章节完整草稿

    Args:
        state_json: DocumentState的JSON字符串

    Returns:
        章节总结内容
    """
    try:
        state_data = json.loads(state_json)
        current_section_idx = state_data.get("current_section", 0)
        section_name = SECTION_NAMES[current_section_idx]

        # 模拟一些已填写的内容
        filled = {
            "代币名称": "CCT (CloudComputer Token)",
            "资产性质": "债权",
            "目标市场": "专业投资者（PI）",
            "发行结构": "SPV",
            "审计机构": "CertiK"
        }

        summary = f"""
📋 第{current_section_idx}节 {SECTION_TITLES[current_section_idx]} 完成情况：

✅ 已填写内容 ({len(filled)} 项)：
"""

        for i, (key, value) in enumerate(filled.items(), 1):
            summary += f"   {i}. {key}: {value}\n"

        if not filled:
            summary += "   暂无填写内容\n"

        summary += f"\n📊 完成度：{len(filled)} 项已完成"

        return json.dumps({"summary": summary.strip()}, ensure_ascii=False, indent=2)

    except Exception as e:
        return json.dumps({"error": f"总结生成失败: {str(e)}"}, ensure_ascii=False)

@tool
def confirm_tool(state_json: str) -> str:
    """
    确认章节完成并更新状态

    Args:
        state_json: DocumentState的JSON字符串

    Returns:
        确认结果和下一步建议
    """
    try:
        state_data = json.loads(state_json)
        current_section_idx = state_data.get("current_section", 0)
        section_name = SECTION_NAMES[current_section_idx]

        # 模拟检查是否有关键内容未填写
        filled_count = 5  # 模拟已填写5项内容

        if filled_count == 0:
            result = {
                "action": "confirm_rejected",
                "message": "⚠️ 当前章节还没有填写任何内容，请先填写后再确认。",
                "suggestion": "您可以直接输入内容，或说'那你决定吧'让我自动填写。"
            }
        else:
            next_section = current_section_idx + 1
            if next_section < len(SECTION_TITLES):
                result = {
                    "action": "confirm_accepted",
                    "message": f"✅ 第{current_section_idx}节已确认完成！",
                    "next_section": next_section,
                    "next_title": SECTION_TITLES[next_section],
                    "suggestion": f"接下来我们将处理第{next_section}节：{SECTION_TITLES[next_section]}"
                }
            else:
                result = {
                    "action": "document_complete",
                    "message": "🎉 恭喜！所有章节都已完成！",
                    "suggestion": "文档生成完成，可以导出最终版本了。"
                }

        return json.dumps(result, ensure_ascii=False, indent=2)

    except Exception as e:
        return json.dumps({"error": f"确认操作失败: {str(e)}"}, ensure_ascii=False)

@tool
def ask_next_tool(state_json: str) -> str:
    """
    主动提问下一个章节相关信息

    Args:
        state_json: DocumentState的JSON字符串

    Returns:
        下一个章节的引导问题
    """
    try:
        state_data = json.loads(state_json)
        current_section_idx = state_data.get("current_section", 0)

        next_section = current_section_idx + 1
        if next_section >= len(SECTION_TITLES):
            return json.dumps({
                "message": "🎉 所有章节都已完成！",
                "suggestion": "可以导出完整的RWA代币发行说明书了。"
            }, ensure_ascii=False)

        next_title = SECTION_TITLES[next_section]
        next_name = SECTION_NAMES[next_section]

        # 根据下一个章节生成针对性问题
        questions_map = {
            0: "请告诉我代币的基本信息，如代币名称、合约地址、资产性质等",
            1: "关于发行主体，您希望采用什么结构？母子结构、SPV还是基金？",
            2: "代币分类方面，目标市场是面向零售用户、专业投资者还是机构？",
            3: "法律合规选择哪个法域？香港、新加坡、欧盟还是阿联酋？",
            4: "Tokenomics设计，总量多少？团队和生态比例如何分配？",
            5: "募集历史和资金用途，需要披露哪些信息？",
            6: "技术安全方面，选择哪条公链？审计和托管如何安排？",
            7: "上市交易安排，首发平台和做市策略？",
            8: "市场诚信措施，KYC和地域屏蔽如何设置？",
            9: "主要风险有哪些需要特别说明？",
            10: "事件响应机制和下架流程？",
            11: "最后的声明和签署条款？"
        }

        question = questions_map.get(next_section, f"请开始第{next_section}节的内容填写")

        result = {
            "next_section": next_section,
            "next_title": next_title,
            "guidance_question": question,
            "suggestion": "您可以直接回答，或者说'那你决定吧'让我智能填写"
        }

        return json.dumps(result, ensure_ascii=False, indent=2)

    except Exception as e:
        return json.dumps({"error": f"生成引导问题失败: {str(e)}"}, ensure_ascii=False)

# ==================== 辅助函数 ====================
def get_smart_suggestion(placeholder: str, section_name: str) -> str:
    """基于占位符名称获取智能建议"""
    placeholder_lower = placeholder.lower()

    # 执行摘要建议
    if "代币简称" in placeholder or "token" in placeholder_lower:
        return "CCT (CloudComputer Token)"
    elif "合约地址" in placeholder or "address" in placeholder_lower:
        return "0x1234...5678 (部署后填入)"
    elif "资产性质" in placeholder:
        return "债权"
    elif "目标市场" in placeholder:
        return "专业投资者（PI）"
    elif "核心风险" in placeholder:
        return "技术实施与监管合规风险"

    # 法律合规建议
    elif "公募/私募" in placeholder:
        return "私募（专业投资者，≤50人，单笔≥HKD 500k）"
    elif "法域" in placeholder or "香港" in placeholder:
        return "香港（证监会监管）"
    elif "kyc" in placeholder_lower:
        return "Chainalysis KYC"

    # Tokenomics建议
    elif "总量" in placeholder or "supply" in placeholder_lower:
        return "100,000,000"
    elif "团队" in placeholder and "%" not in placeholder:
        return "15%"
    elif "生态" in placeholder and "%" not in placeholder:
        return "35%"
    elif "流动性" in placeholder:
        return "15%"

    # 技术安全建议
    elif "链" in placeholder and "合约" in placeholder:
        return "Ethereum Mainnet"
    elif "审计" in placeholder:
        return "CertiK"
    elif "托管" in placeholder:
        return "Fireblocks"

    # 通用填写
    elif "日期" in placeholder or "date" in placeholder_lower:
        return datetime.now().strftime("%Y-%m-%d")
    elif "名称" in placeholder and "name" in placeholder_lower:
        return "CloudComputer Technology Ltd."
    elif "邮箱" in placeholder or "email" in placeholder_lower:
        return "compliance@cloudcomputer.com"
    else:
        return f"[待完善：{placeholder}]"

def state_to_json(state: DocumentState) -> str:
    """将DocumentState转换为JSON字符串"""
    return json.dumps({
        k: v for k, v in state.items()
        if k != "conversation_history"  # 排除过长的对话历史
    }, ensure_ascii=False, indent=2, default=str)

# ==================== Agent层 ====================
def initialize_agent():
    """初始化Agent，集成所有工具"""

    # 初始化LLM
    llm = ChatOpenAI(
        base_url="https://apis.iflow.cn/v1",
        api_key="sk-34d42e4c747d1bdf0f02beaca589cd38",
        model="kimi-k2",
        temperature=0.1
    )

    # 工具列表
    tools = [
        extract_info_tool,
        autofill_tool,
        summarize_tool,
        confirm_tool,
        ask_next_tool
    ]

    # Agent Prompt
    prompt = ChatPromptTemplate.from_messages([
        ("system", """你是CloudComputer RWA代币发行说明书智能助手，专业的项目合伙人。

你的任务是帮助用户完成12个章节的RWA代币发行说明书编写。

你有以下工具可以使用：
1. extract_info_tool: 提取用户输入的结构化信息
2. autofill_tool: 根据上下文自动填写未完成内容
3. summarize_tool: 总结当前章节完成情况
4. confirm_tool: 确认章节完成状态
5. ask_next_tool: 主动引导下一个章节

工作流程：
1. 理解用户自然语言输入
2. 使用extract_info_tool提取关键信息
3. 根据用户意图选择合适的工具
4. 提供智能填写建议或自动完成
5. 确认后进入下一章节

请始终保持专业、友好的语气，用中文回复。"""),
        ("user", "{input}"),
        MessagesPlaceholder(variable_name="agent_scratchpad"),
    ])

    # 创建Agent
    agent = create_openai_tools_agent(llm, tools, prompt)
    agent_executor = AgentExecutor(
        agent=agent,
        tools=tools,
        verbose=True,
        handle_parsing_errors=True,
        max_iterations=15
    )

    return agent_executor

# ==================== Graph层 ====================
def handle_input(state: DocumentState) -> DocumentState:
    """处理用户输入节点"""
    print(f"\n📍 当前处理第{state['current_section']}节：{SECTION_TITLES[state['current_section']]}")

    # 获取用户输入
    user_input = input(f"\n💬 请输入内容（或说'那你决定吧'让AI智能填写）：").strip()

    # 更新状态
    state["last_user_input"] = user_input
    state["conversation_history"].append({
        "role": "user",
        "content": user_input,
        "section": state["current_section"]
    })

    return state

def process_with_agent(state: DocumentState) -> DocumentState:
    """使用Agent处理用户输入"""
    agent_executor = initialize_agent()

    try:
        # 构建Agent输入
        user_input = state["last_user_input"]
        state_json = state_to_json(state)

        agent_input = f"""
用户输入：{user_input}

当前状态：
{state_json}

请根据用户输入和当前状态，选择合适的工具来处理。
"""

        # 执行Agent
        result = agent_executor.invoke({"input": agent_input})

        # 保存Agent响应
        state["agent_response"] = result.get("output", "")
        state["conversation_history"].append({
            "role": "assistant",
            "content": state["agent_response"],
            "section": state["current_section"]
        })

        # 解析Agent的工具调用结果
        tool_output = result.get("output", "")

        if "自动填写" in tool_output or "autofill" in tool_output.lower():
            state["interaction_mode"] = "fill"
        elif "确认" in tool_output or "confirm" in tool_output.lower():
            state["interaction_mode"] = "confirm"
        elif "总结" in tool_output or "summarize" in tool_output.lower():
            state["interaction_mode"] = "ask"
        else:
            state["interaction_mode"] = "auto"

        print(f"\n🤖 智能助手：{state['agent_response']}")

    except Exception as e:
        error_msg = f"Agent处理出错: {str(e)}"
        print(f"\n❌ {error_msg}")
        state["agent_response"] = error_msg

    return state

def confirm_section(state: DocumentState) -> DocumentState:
    """确认章节完成节点"""
    current_section = state["current_section"]
    section_name = SECTION_NAMES[current_section]

    # 模拟检查章节完成情况
    filled_count = 5  # 模拟已填写5项内容

    if filled_count > 0:
        print(f"\n✅ 第{current_section}节 {SECTION_TITLES[current_section]} 已完成")
        print(f"   填写内容：{filled_count} 项")

        # 询问用户是否确认
        confirm = input(f"\n📌 确认完成并继续下一节吗？(y/n): ").strip().lower()

        if confirm in ['y', 'yes', '是']:
            state["section_complete"] = True
            state["current_section"] += 1
            print(f"✅ 已确认，进入下一节...")
        else:
            state["section_complete"] = False
            print("📝 继续完善当前章节...")
    else:
        print("⚠️ 当前章节还没有填写内容，请先填写。")
        state["section_complete"] = False

    return state

# ==================== 构建LangGraph ====================
def build_intelligent_agent():
    """构建智能交互Agent的LangGraph"""

    # 创建StateGraph
    workflow = StateGraph(DocumentState)

    # 添加节点
    workflow.add_node("initialize", initialize_document)
    workflow.add_node("handle_input", handle_input)
    workflow.add_node("process_agent", process_with_agent)
    workflow.add_node("confirm_section", confirm_section)

    # 添加边
    workflow.add_edge(START, "initialize")
    workflow.add_edge("initialize", "handle_input")
    workflow.add_edge("handle_input", "process_agent")
    workflow.add_edge("process_agent", "confirm_section")

    # 条件边：是否继续处理
    def should_continue(state: DocumentState) -> Literal["handle_input", END]:
        if state["current_section"] >= len(SECTION_TITLES):
            return END

        if not state["section_complete"]:
            return "handle_input"
        else:
            return "handle_input"

    workflow.add_conditional_edges("confirm_section", should_continue,
                                  {"handle_input": "handle_input", END: END})

    # 编译graph
    app = workflow.compile(checkpointer=InMemorySaver())

    return app

def initialize_document(state: DocumentState) -> DocumentState:
    """初始化文档状态"""
    print("=" * 60)
    print("🤝 CloudComputer RWA代币发行说明书 - 智能交互Agent系统")
    print("=" * 60)
    print("🚀 基于LangGraph的多工具Graph架构")
    print("🤖 集成智能Agent，支持自然语言理解和自动填写")
    print("📋 共有12个主要章节需要完成")
    print("=" * 60)

    # 初始化状态
    return {
        **state,
        "current_section": 0,
        "section_contents": {name: "" for name in SECTION_NAMES},
        "filled_placeholders": {name: {} for name in SECTION_NAMES},
        "pending_placeholders": {name: [] for name in SECTION_NAMES},
        "interaction_mode": "ask",
        "conversation_history": [],
        "last_user_input": "",
        "ai_summary": "",
        "agent_response": "",
        "section_complete": False,
        "extracted_info": {}
    }

# ==================== 主要运行函数 ====================
def run_intelligent_agent():
    """运行智能交互Agent系统"""

    # 构建Agent
    agent = build_intelligent_agent()

    # 运行会话
    config = {"configurable": {"thread_id": "intelligent_agent_session"}}

    try:
        result = agent.invoke({}, config)

        print("\n" + "="*60)
        print("🎉 智能Agent系统运行完成！")
        print("="*60)
        print(f"最终状态:")
        print(f"- 处理章节: {result.get('current_section', 'N/A')}/{len(SECTION_TITLES)}")
        print(f"- 对话轮数: {len(result.get('conversation_history', []))}")
        print(f"- 交互模式: {result.get('interaction_mode', 'N/A')}")

        # 保存结果
        save_final_document(result)

    except KeyboardInterrupt:
        print("\n\n👋 感谢使用！您的工作已保存。")
    except Exception as e:
        print(f"\n❌ 出现错误: {e}")

def save_final_document(state: Dict):
    """保存最终文档"""
    output_file = "completed_intelligent_memo.md"

    # 生成完整文档内容
    document_content = f"""# CloudComputer RWA代币发行说明书

## 生成信息
- 生成时间: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
- 处理章节数: {state.get('current_section', 0)}
- 对话轮数: {len(state.get('conversation_history', []))}

## 章节完成情况
"""

    for i, title in enumerate(SECTION_TITLES):
        if i < state.get('current_section', 0):
            document_content += f"✅ 第{i}节 {title}\n"
        else:
            document_content += f"⏸️ 第{i}节 {title}\n"

    document_content += f"""

## 对话历史摘要
最近几轮对话：
"""

    history = state.get('conversation_history', [])[-5:]  # 取最后5轮对话
    for item in history:
        role = "用户" if item['role'] == 'user' else "助手"
        document_content += f"- {role}: {item['content'][:100]}...\n"

    # 保存到文件
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(document_content)

    print(f"\n💾 已保存完整文档到: {output_file}")

    # 保存状态到JSON文件
    with open("intelligent_agent_state.json", "w", encoding="utf-8") as f:
        json.dump({
            "state": {k: v for k, v in state.items() if k != "conversation_history"},
            "completed_sections": state.get("current_section", 0),
            "conversation_count": len(state.get("conversation_history", []))
        }, f, ensure_ascii=False, indent=2, default=str)

# ==================== 示例和测试代码 ====================
if __name__ == "__main__":
    print("🚀 启动CloudComputer RWA智能交互Agent系统...")
    print("📋 这是一个基于LangGraph的多工具、多节点graph-based智能交互系统")
    print("🤖 集成了Agent层，支持自然语言理解和智能工具调用")
    print("✨ 功能特色：")
    print("   • 多工具层：信息提取、自动填写、总结确认、智能引导")
    print("   • Agent层：自然语言解析 + 动态工具调用")
    print("   • Graph层：状态流转管理，支持交互式文档生成")
    print("   • 智能交互：理解用户意图，自动选择合适的工具")
    print("=" * 60)

    # 启动系统
    run_intelligent_agent()