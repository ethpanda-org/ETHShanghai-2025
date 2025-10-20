import sys
import json
from typing import List, Dict, Any, Set

from slither import Slither
# 兼容 v0.11.3 的 imports
from slither.core.declarations import Function, Contract, Event, SolidityFunction
from slither.core.variables.state_variable import StateVariable
from slither.slithir.operations import HighLevelCall, Send, Transfer, EventCall


# -------------------------------------------------------------
# 1. 辅助函数，用于将 Slither 对象转换为可序列化的格式
# -------------------------------------------------------------
def serialize_variable(var):
    """序列化变量信息"""
    if not var: return "N/A"
    return {"name": var.name, "type": str(var.type)}


def serialize_function(func):
    """
    序列化函数信息 (v0.11.3 兼容版)
    区分处理用户定义的 Function 和 Solidity 内置的 SolidityFunction
    """
    if not func: return "N/A"

    # 用户定义的函数，有 signature_str
    if isinstance(func, Function):
        # 确保 signature_str 存在
        if hasattr(func, 'signature_str'):
            return func.signature_str
        else:  # 如果连 signature_str 都没有，使用 name 作为备用
            return func.name + "()"

    # Solidity 内置函数，只有 name
    elif isinstance(func, SolidityFunction):
        return f"Solidity.{func.name}()"

    # 其他未知情况
    else:
        return f"UnknownCallable({str(func)})"


def serialize_event(event):
    """序列化事件信息"""
    if not event: return "N/A"
    return event.name


# -------------------------------------------------------------
# 2. 核心事实提取器类
# -------------------------------------------------------------
class KnowledgeGraphExtractor:
    def __init__(self, slither: Slither):
        self.slither = slither
        self.knowledge_graph: List[Dict[str, Any]] = []

    def extract(self) -> List[Dict[str, Any]]:
        """主提取函数，遍历所有合约和函数"""
        for contract in self.slither.contracts:
            if contract.is_interface:
                continue

            for function in contract.functions:
                # 只处理已实现的函数
                if not function.is_implemented:
                    continue

                print(f"[Extractor] Processing: {function.signature_str}")
                fact_card = self._extract_facts_from_function(function)
                self.knowledge_graph.append(fact_card)

        return self.knowledge_graph

    def _extract_facts_from_function(self, function: Function) -> Dict[str, Any]:
        """为单个函数提取所有类别的事实"""

        # 使用集合来自动去重
        state_reads: Set[StateVariable] = set()
        state_writes: Set[StateVariable] = set()
        external_calls: List[Dict[str, Any]] = []
        internal_calls: Set[Function] = set(function.internal_calls)
        emitted_events: Set[Event] = set()

        # 遍历函数的所有节点来收集信息
        for node in function.nodes:
            # 状态变量读取
            for var in node.state_variables_read:
                state_reads.add(var)

            # 状态变量写入
            for var in node.state_variables_written:
                state_writes.add(var)

            # 遍历 IR 来获取更详细的信息
            # ULTIMATE FIX: 区分处理 ir.destination 的类型
            for ir in node.irs:

                if isinstance(ir, HighLevelCall):
                    target_contract_str = "Unknown"
                    destination = ir.destination
                    if hasattr(destination, 'type'):
                        target_contract_str = str(destination.type)
                    elif isinstance(destination, Contract):  # 直接就是 Contract 对象
                        target_contract_str = destination.name
                    else:  # 其他变量
                        target_contract_str = str(destination)

                    call_info = {
                        "target_contract": target_contract_str,
                        "function_name": str(ir.function_name),
                        "arguments": [str(arg) for arg in ir.arguments]
                    }
                    external_calls.append(call_info)
                elif isinstance(ir, (Send, Transfer)):
                    # Send/Transfer 的 destination 也有同样的问题
                    target_contract_str = "Unknown"
                    destination = ir.destination
                    if hasattr(destination, 'type'):
                        target_contract_str = str(destination.type)
                    elif isinstance(destination, Contract):
                        target_contract_str = destination.name
                    else:
                        target_contract_str = str(destination)

                    call_info = {
                        "target_contract": target_contract_str,
                        "function_name": "transfer" if isinstance(ir, Transfer) else "send",
                        "arguments": [str(ir.value)]
                    }
                    external_calls.append(call_info)
                elif isinstance(ir, EventCall):
                    event_obj = function.contract.get_enum_from_name(ir.name)
                    if event_obj:
                        emitted_events.add(event_obj)

                # # 事实3: 外部调用
                # if isinstance(ir, HighLevelCall):
                #     call_info = {
                #         "target_contract": str(ir.destination.type),
                #         "function_name": str(ir.function_name),
                #         "arguments": [str(arg) for arg in ir.arguments]
                #     }
                #     external_calls.append(call_info)
                # # 兼容旧版本的 ETH 转账指令
                # elif isinstance(ir, (Send, Transfer)):
                #     call_info = {
                #         "target_contract": str(ir.destination.type),
                #         "function_name": "transfer" if isinstance(ir, Transfer) else "send",
                #         "arguments": [str(ir.value)]
                #     }
                #     external_calls.append(call_info)

                # # ULTIMATE FIX: 不再使用 slither.events_signature
                # elif isinstance(ir, EventCall):
                #     # 从函数所在的合约中查找事件对象
                #     event_obj = function.contract.get_event_from_name(ir.name)
                #     if event_obj:
                #         emitted_events.add(event_obj)



                # # 事实4: 事件触发 (在旧版本中，事件触发是 EventCall)
                # elif isinstance(ir, EventCall):
                #     if ir.name in self.slither.events_signature:
                #         # key是 `deposit(address,uint256)`
                #         event_obj = self.slither.events_signature[ir.name][0]
                #         emitted_events.add(event_obj)




        # 格式化所有事实，准备输出


        fact_card = {
            "function_signature": function.signature_str,
            "visibility": function.visibility,
            "parameters": [serialize_variable(p) for p in function.parameters],
            "return_variables": [serialize_variable(r) for r in function.return_values],
            "state_reads": sorted([v.name for v in state_reads]),
            "state_writes": sorted([v.name for v in state_writes]),
            "external_calls": external_calls,
            "internal_calls": sorted([serialize_function(f) for f in internal_calls]),
            # "emitted_events": sorted([serialize_event(e) for e in emitted_events])
        }

        return fact_card


# -------------------------------------------------------------
# 3. 主执行逻辑
# -------------------------------------------------------------
def main():

    file_path = "D:\GoogleDownload\\frax-solidity-master\src\hardhat\contracts\Governance\\Governance.sol"
    output_file = "knowledge_graph.json"

    try:
        # 使用最兼容的方式初始化 Slither
        slither = Slither(file_path)
    except Exception as e:
        print(f"Error initializing Slither: {e}")
        # 在 Windows 上，Slither 可能因为编码问题报错，尝试用 utf-8
        try:
            print("Retrying with UTF-8 encoding...")
            slither = Slither(file_path, solc_ast_legacy_encoding=True)
        except Exception as e_utf8:
            print(f"Fatal error initializing Slither even with encoding fix: {e_utf8}")
            sys.exit(-1)

    # 创建并运行提取器
    extractor = KnowledgeGraphExtractor(slither)
    knowledge_graph = extractor.extract()

    # 将知识图谱写入 JSON 文件
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(knowledge_graph, f, indent=2, ensure_ascii=False)

    print(f"\n\n===================================")
    print(f"  KNOWLEDGE GRAPH EXTRACTION COMPLETE  ")
    print(f"===================================")
    print(f"Successfully extracted facts from {len(knowledge_graph)} functions.")
    print(f"Result saved to: {output_file}")


if __name__ == "__main__":

    main()