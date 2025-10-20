import json
from typing import List, TypedDict

from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from langgraph.graph import END, StateGraph

# --- State Definition ---
class GenerationState(TypedDict):
    project_context: str
    proposals: List[str]
    ranked_proposals: str


# --- Agent Node Definitions ---
def generator_node(state: GenerationState):
    print("--- MODULE 1: GENERATOR AGENT ---")
    project_context = state["project_context"]
    prompt = ChatPromptTemplate.from_template(
        f"""
        # ROLE: You are a highly creative and experienced DeFi Protocol Strategist. Your expertise lies in tokenomics, protocol growth, and identifying unconventional opportunities. You think from first principles.
    
        # TASK: Based on the provided project context, your mission is to generate FIVE distinct, innovative, and actionable proposals. These should not be generic ideas; they must be tailored specifically to the project's data and challenges.
    
        # FRAMEWORK for each proposal:
        1.  **Be Bold:** Propose significant changes that can create a step-change in the protocol's trajectory.
        2.  **Be Data-Driven:** Each idea must clearly link back to a specific metric or community pain point mentioned in the context (e.g., "To address the stagnant TVL...", "To solve the farm-and-dump problem of the token...").
        3.  **Be Structured:** For each proposal, you must provide the following four elements.
    
        # REQUIRED OUTPUT STRUCTURE:
        For each of the 5 proposals, provide the following, then use "---" as a separator. Do not add any text before the first proposal or after the last one.
    
        **Proposal Title:** [A clear, concise, and compelling title]
        **Proposal Description:** [Detailed Description of the Proposal Content]
        **Background:** [Background of the Proposal and Some Supplementary Prior Knowledge]
        **Motivation:** [The Motivation and Necessity for Initiating This Proposal]
        **"Options":** [The consequences of casting a vote for or against]
        ---
        [Next Proposal]
        ...
    
        # PROJECT CONTEXT TO ANALYZE:
        
        {project_context}
        """
    )
    llm = ChatOpenAI(
        api_key=TEST_API_KEY,
        base_url="https://api2.aigcbest.top/v1",
        model="gpt-4-turbo-preview",
        temperature=0.7
    )
    chain = prompt | llm
    response = chain.invoke({"context": project_context})
    proposals_list = [p.strip() for p in response.content.strip().split("---") if p.strip()]
    print(f"Generated {len(proposals_list)} initial proposals.")
    return {"proposals": proposals_list}

def ranker_node(state: GenerationState):
    print("--- MODULE 1: RANKER AGENT ---")
    project_context = state["project_context"]
    proposals = state["proposals"]
    formatted_proposals = "\n\n".join([f"### Proposal {i+1}\n{p}" for i, p in enumerate(proposals)])
    prompt = ChatPromptTemplate.from_template(
        f"""
        # ROLE: You are a deeply analytical and skeptical DeFi Analyst and a lead member of a DAO's Governance Committee. Your job is not to generate ideas, but to ruthlessly evaluate them based on data and strategic fit. You are pragmatic and risk-averse.

# TASK: You have been given a list of raw proposals. Your mission is to evaluate them against the original project context and produce a ranked report of the Top 3 proposals that should be seriously considered.

# EVALUATION CRITERIA (Your Mental Checklist):
1.  **Impact (40% Weight):** How significantly could this proposal move the needle on the project's primary Key Performance Indicators (KPIs) like TVL, Revenue, User Growth, and Token Value Accrual? Is it a minor tweak or a major catalyst?
2.  **Feasibility (30% Weight):** How difficult is this to implement? Consider technical complexity (smart contract risk), required development resources, and the likelihood of achieving community consensus.
3.  **Strategic Fit (20% Weight):** Does this proposal enhance the project's core value proposition, or does it distract from it? Does it build on existing strengths?
4.  **Risk (10% Weight):** What are the potential economic exploits, security vulnerabilities, or negative second-order effects?

# REQUIRED OUTPUT STRUCTURE:
You must produce a formal analysis report in the following Markdown format.

## Overall Analysis Summary
(A brief, insightful paragraph summarizing your evaluation process. Explain why the chosen proposals are superior to the rejected ones, referencing the evaluation criteria.)

## Top 3 Ranked Proposals

### Rank 1: 
**Proposal Title:** [A clear, concise, and compelling title]
**Proposal Description:** [Detailed Description of the Proposal Content]
**Background:** [Background of the Proposal and Some Supplementary Prior Knowledge]
**Motivation:** [The Motivation and Necessity for Initiating This Proposal]
**"Options":** [The consequences of casting a vote for or against]

**Reasoning:** (Provide a detailed, evidence-based justification for this ranking. You MUST explicitly reference the evaluation criteria above and connect your reasoning to specific data points from the original project context. For example: "This proposal ranks first due to its high **Impact** on token value accrual, directly addressing the community's primary pain point. While its technical **Feasibility** is moderate, the potential payoff is immense...")

### Rank 2: 
**Proposal Title:** [A clear, concise, and compelling title]
**Proposal Description:** [Detailed Description of the Proposal Content]
**Background:** [Background of the Proposal and Some Supplementary Prior Knowledge]
**Motivation:** [The Motivation and Necessity for Initiating This Proposal]
**"Options":** [The consequences of casting a vote for or against]

**Reasoning:** (Provide the same level of detailed justification as for Rank 1.)

### Rank 3: 
**Proposal Title:** [A clear, concise, and compelling title]
**Proposal Description:** [Detailed Description of the Proposal Content]
**Background:** [Background of the Proposal and Some Supplementary Prior Knowledge]
**Motivation:** [The Motivation and Necessity for Initiating This Proposal]
**"Options":** [The consequences of casting a vote for or against]

**Reasoning:** (Provide the same level of detailed justification as for Rank 1.)

# ORIGINAL PROJECT CONTEXT:
{project_context}

# PROPOSALS TO RANK:
{proposals}

        """
    )
    llm = ChatOpenAI(
        api_key=TEST_API_KEY,
        base_url="https://api2.aigcbest.top/v1",
        model="gpt-4-turbo-preview",
        temperature=0.3
    )
    chain = prompt | llm
    response = chain.invoke({"context": project_context, "proposals": formatted_proposals})
    print("Ranking complete. Final report generated.")
    return {"ranked_proposals": response.content}


# --- Workflow Definition ---
def build_generation_workflow():
    workflow = StateGraph(GenerationState)
    workflow.add_node("generator", generator_node)
    workflow.add_node("ranker", ranker_node)
    workflow.set_entry_point("generator")
    workflow.add_edge("generator", "ranker")
    workflow.add_edge("ranker", END)
    return workflow.compile()

# --- Main Execution Function for this Module ---
def run_generation_workflow(project_context: str):

    app = build_generation_workflow()
    final_state = app.invoke({"project_context": project_context})
    return final_state["ranked_proposals"]


if __name__ == '__main__':
    # This part allows running this file directly for testing
    print("Testing Module 1: Generation and Ranking...")

    knowledge_graph = "D:\\code\\analysis_contract\\knowledge_graph.json"

    project_context_input = f"""
    # Project: LiquiFi

    ## 1. Overview
    - **Core Function:** A decentralized lending protocol on Ethereum.
    - **Value Proposition:** Specializes in exotic assets as collateral, which other platforms like Aave/Compound do not accept.

    ## 2. Knowledge Graph (JSON)
    ```json
    {json.dumps(knowledge_graph, indent=2)}

    ## 3. Key Metrics & Trends
    TVL: Stagnant at $50M for the last 3 months after a period of rapid growth. Competitors are growing.
    Revenue: Protocol revenue is declining by 10% month-over-month. 80% of fees go to lenders, 20% to treasury. LQF token holders get no direct revenue share.
    DEX Liquidity: The LQF/ETH pool on Uniswap has low liquidity, causing high price volatility.
    Market Cap: $10M (Fully Diluted Value: $40M). MC/TVL ratio is low compared to peers.
    Price Change: LQF token is down 70% in the last 6 months, primarily due to constant emission rewards being sold by farmers.
    ## 4. Community & Governance Insights
    Pain Points: Community members frequently complain that the LQF token has "no value" beyond farm-and-dump.
    Past Proposals: Proposals to add new collateral types are always approved. A proposal to introduce revenue sharing for token holders was narrowly defeated 3 months ago due to concerns about treasury funding.

    """

    ranked_proposals_output = run_generation_workflow(project_context_input)
    print("\n--- MODULE 1 TEST OUTPUT ---")
    print(ranked_proposals_output)
