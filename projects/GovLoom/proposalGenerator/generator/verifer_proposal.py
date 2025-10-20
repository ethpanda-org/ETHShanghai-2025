from typing import TypedDict

from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from langgraph.graph import END, StateGraph

# --- State Definition ---
class RefinementState(TypedDict):
    ranked_proposals: str
    validation_report: str
    refined_proposals: str
    final_report: str


# --- Agent Node Definitions ---
def validator_node(state: RefinementState):
    print("\n--- MODULE 2: VALIDATOR AGENT ---")
    ranked_proposals = state["ranked_proposals"]
    prompt = ChatPromptTemplate.from_template(
        f"""
        # ROLE: You are a DAO Governance Auditor and a specialist in Crypto-Economic Security. Your mindset is adversarial. You are paid to find flaws, loopholes, and unintended consequences before they cause damage. You care deeply about fairness and protocol longevity.

# TASK: Your mission is to conduct a thorough audit of the following Top 3 proposals. For each one, you must identify potential failure modes, fairness issues, and hidden risks that the initial analysis might have missed.

# AUDIT CHECKLIST (Apply to each proposal):
1.  **Incentive Misalignment & Exploits:** How could this be gamed? Could whales or sophisticated actors exploit this system to the detriment of smaller users? Does it create perverse incentives?
2.  **Fairness & Distribution:** Who are the primary beneficiaries of this proposal? Does it unfairly concentrate power or wealth? Does it consider the impact on all stakeholders (new users, small token holders, long-term believers)?
3.  **Second-Order Effects:** If this is successful, what happens next? Could it introduce new centralizing forces? Could it bloat the protocol's complexity, making it harder to manage or upgrade in the future?

# REQUIRED OUTPUT STRUCTURE:
Produce a concise validation report. For each of the Top 3 proposals, you must provide the following checklist. Be direct and critical.

### Rank 1: 
**Proposal Title:** [A clear, concise, and compelling title]
**Proposal Description:** [Detailed Description of the Proposal Content]
**Background:** [Background of the Proposal and Some Supplementary Prior Knowledge]
**Motivation:** [The Motivation and Necessity for Initiating This Proposal]
**"Options":** [The consequences of casting a vote for or against]

### Rank 2: 
**Proposal Title:** [A clear, concise, and compelling title]
**Proposal Description:** [Detailed Description of the Proposal Content]
**Background:** [Background of the Proposal and Some Supplementary Prior Knowledge]
**Motivation:** [The Motivation and Necessity for Initiating This Proposal]
**"Options":** [The consequences of casting a vote for or against]

### Rank 3: 
**Proposal Title:** [A clear, concise, and compelling title]
**Proposal Description:** [Detailed Description of the Proposal Content]
**Background:** [Background of the Proposal and Some Supplementary Prior Knowledge]
**Motivation:** [The Motivation and Necessity for Initiating This Proposal]
**"Options":** [The consequences of casting a vote for or against]


# PROPOSALS TO VALIDATE:
{ranked_proposals}
        """
    )
    llm = ChatOpenAI(
        api_key=TEST_API_KEY,
        base_url="https://api2.aigcbest.top/v1",
        model="gpt-4-turbo-preview",
        temperature=0.2
    )
    chain = prompt | llm
    validation_report = chain.invoke({"ranked_proposals": ranked_proposals}).content
    print("Validation complete. Report generated.")
    return {"validation_report": validation_report}


def monitor_node(state: RefinementState):
    print("--- MODULE 2: MONITOR AGENT (Refiner) ---")
    ranked_proposals = state["ranked_proposals"]
    validation_report = state["validation_report"]
    prompt = ChatPromptTemplate.from_template(
        f"""
        # ROLE: You are an expert DeFi Strategist and a seasoned Proposal Drafter. You are a master of taking a promising idea, absorbing critical feedback, and forging it into a robust, detailed, and actionable plan.

# TASK: Your task is to upgrade the initial proposals by fully addressing every issue raised in the Validation Report. You must transform weaknesses into strengths through clever mechanism design and added detail.

# REFINEMENT PROTOCOL:
1.  **Address All Feedback:** For every "Warning" or "Failed" point in the validation report, you MUST propose a specific modification or addition to the proposal's mechanism to mitigate the concern.
2.  **Add Granularity:** Flesh out the proposal with concrete details. If it involves numbers, suggest a reasonable starting parameter range. If it's a new feature, describe the user experience.
3.  **Create Actionability:** For each refined proposal, add two new sections: "Implementation Roadmap" and "Success Metrics (KPIs)".

# REQUIRED OUTPUT STRUCTURE:
Produce a "Refined Proposals" document. For each of the Top 3 proposals, present the enhanced version.

### Rank 1: 
**Proposal Title:** [A clear, concise, and compelling title]
**Proposal Description:** [Detailed Description of the Proposal Content]
**Background:** [Background of the Proposal and Some Supplementary Prior Knowledge]
**Motivation:** [The Motivation and Necessity for Initiating This Proposal]
**"Options":** [The consequences of casting a vote for or against]

### Rank 2: 
**Proposal Title:** [A clear, concise, and compelling title]
**Proposal Description:** [Detailed Description of the Proposal Content]
**Background:** [Background of the Proposal and Some Supplementary Prior Knowledge]
**Motivation:** [The Motivation and Necessity for Initiating This Proposal]
**"Options":** [The consequences of casting a vote for or against]

### Rank 3: 
**Proposal Title:** [A clear, concise, and compelling title]
**Proposal Description:** [Detailed Description of the Proposal Content]
**Background:** [Background of the Proposal and Some Supplementary Prior Knowledge]
**Motivation:** [The Motivation and Necessity for Initiating This Proposal]
**"Options":** [The consequences of casting a vote for or against]

# ORIGINAL PROPOSALS:
{ranked_proposals}

# VALIDATION REPORT (FEEDBACK TO ADDRESS):
{validation_report}

        """
    )
    llm = ChatOpenAI(
        api_key=TEST_API_KEY,
        base_url="https://api2.aigcbest.top/v1",
        model="gpt-4-turbo-preview",
        temperature=0.5
    )
    chain = prompt | llm
    refined_proposals = chain.invoke({
        "ranked_proposals": ranked_proposals,
        "validation_report": validation_report
    }).content
    print("Proposals refined based on validation feedback.")
    return {"refined_proposals": refined_proposals}


def reporter_node(state: RefinementState):
    print("--- MODULE 2: REPORTER AGENT ---")
    refined_proposals = state["refined_proposals"]
    prompt = ChatPromptTemplate.from_template(
        f"""
        # ROLE: You are the Head of Communications for a leading DAO. You excel at distilling complex technical and economic concepts into clear, persuasive, and professionally formatted governance posts. Your writing inspires confidence and encourages constructive community engagement.

# TASK: Your final mission is to transform the detailed, refined proposals into a single, polished governance report. This document should be ready to be published on a forum like Discourse or Snapshot. It needs to be easily digestible for all community members, from DeFi experts to new token holders.

# COMMUNICATION GUIDELINES:
- **Clarity Above All:** Use simple language. Avoid jargon where possible, or explain it briefly.
- **Be Persuasive:** Frame the proposals in terms of benefits to the user and the protocol's long-term health.
- **Professional Formatting:** Use Markdown effectively (headings, bolding, lists) to create a clean, readable structure.

# REQUIRED OUTPUT STRUCTURE:
You must generate the final report following this exact template. Infer the project's name from the context if possible, otherwise use a placeholder.

# Title: A Strategic Direction for [Project Name]'s Next Chapter

## Executive Summary (TL;DR)
(Write a compelling 2-4 sentence summary of the entire strategic package. What is the overall goal, and what are the key initiatives proposed to achieve it?)

---

## Introduction: The Path Forward
(A brief paragraph setting the stage. Acknowledge the current challenges and opportunities based on the data, and introduce these proposals as a coordinated response.)

---

## Core Initiative 1: [Title of the first refined proposal]
**Proposal Description:** [Detailed Description of the Proposal Content]
**Background:** [Background of the Proposal and Some Supplementary Prior Knowledge]
**Motivation:** [The Motivation and Necessity for Initiating This Proposal]
**"Options":** [The consequences of casting a vote for or against]

## Core Initiative 2: [Title of the second refined proposal]
(Follow the exact same detailed structure as above.)

## Core Initiative 3: [Title of the third refined proposal]
(Follow the exact same detailed structure as above.)

## Next Steps & Call to Action
(Conclude with a final paragraph outlining the next steps, such as a community call, a formal Snapshot vote, and invite the community to ask questions and provide feedback in the forum.)

# DETAILED PROPOSALS TO FORMAT:
{refined_proposals}
        """
    )
    llm = ChatOpenAI(
        api_key=TEST_API_KEY,
        base_url="https://api2.aigcbest.top/v1",
        model="gpt-4-turbo-preview",
        temperature=0.1
    )
    chain = prompt | llm
    final_report = chain.invoke({"refined_proposals": refined_proposals}).content
    print("Final governance report compiled.")
    return {"final_report": final_report}


# --- Workflow Definition ---
def build_refinement_workflow():
    workflow = StateGraph(RefinementState)
    workflow.add_node("validator", validator_node)
    workflow.add_node("monitor", monitor_node)
    workflow.add_node("reporter", reporter_node)
    workflow.set_entry_point("validator")
    workflow.add_edge("validator", "monitor")
    workflow.add_edge("monitor", "reporter")
    workflow.add_edge("reporter", END)
    return workflow.compile()


# --- Main Execution Function for this Module ---
def run_refinement_workflow(ranked_proposals: str):

    app = build_refinement_workflow()
    final_state = app.invoke({"ranked_proposals": ranked_proposals})
    return final_state["final_report"]


if __name__ == '__main__':
    # This part allows running this file directly for testing
    print("Testing Module 2: Validation and Refinement...")

    # Example input from Module 1
    test_ranked_proposals = """
    ## Overall Analysis Summary
The evaluation of the proposals for LiquiFi focused on their potential impact on key performance indicators, feasibility of implementation, strategic fit with the core value proposition, and associated risks. The selected top three proposals directly address the most critical issues facing LiquiFi: stagnant TVL, declining token value, and low liquidity. These proposals not only promise to enhance the platform's attractiveness and operational efficiency but also aim to stabilize and potentially increase the value of the LQF token. They were chosen over others due to their higher potential impact and strategic alignment with LiquiFi's unique position in the market, despite varying degrees of implementation complexity and risk.

## Top 3 Ranked Proposals

### Rank 1: 
**Proposal Title:** Revenue Redistribution Revolution
**Proposal Description:** Implement a dynamic revenue redistribution model where 50% of the protocol's fees are redirected to LQF token holders, and the remaining 50% continue to support the treasury. This model adjusts based on quarterly performance metrics and community governance votes, thus aligning incentives between users, liquidity providers, and token holders.
**Background:** The current distribution allocates 80% of fees to lenders and only 20% to the treasury, with no direct benefit to LQF token holders. This has contributed to a perception of LQF as a farm-and-dump token.
**Motivation:** To combat the declining value of LQF and incentivize long-term holding rather than just farming and dumping, by providing a direct financial benefit to token holders.
**"Options":** Voting in favor will align interests among stakeholders and potentially stabilize and increase the LQF token value. Voting against will maintain the status quo, likely continuing the token’s depreciation and community dissatisfaction.

**Reasoning:** This proposal ranks first due to its high **Impact** on token value accrual, addressing the community's primary concern about the LQF token's lack of value. The **Feasibility** is moderate, as it requires adjustments to the fee distribution mechanism but does not involve complex new technologies. It is a strong **Strategic Fit**, directly enhancing the token's attractiveness and utility, which is crucial for LiquiFi's long-term success. The **Risk** is relatively low, primarily involving potential short-term treasury revenue reduction, which is offset by the expected increase in token holding and value.

### Rank 2: 
**Proposal Title:** Liquidity Enhancement Initiative
**Proposal Description:** Create a liquidity bootstrapping pool for the LQF/ETH pair on Uniswap which includes incentives like staking rewards from the treasury over a 12-month period. Additionally, introduce a lock-up period for rewards to decrease volatility.
**Background:** The LQF/ETH pool on Uniswap suffers from low liquidity, resulting in high price volatility that deters serious investment and stable growth.
**Motivation:** By enhancing liquidity and stabilizing the token price, this initiative aims to make the LQF more attractive to both existing and potential investors.
**"Options":** Voting in favor will likely increase market stability and investor confidence, potentially leading to an appreciation in LQF’s market value. Voting against will continue the current high volatility and possibly further depress the token’s price.

**Reasoning:** This proposal is ranked second because it addresses the critical issue of **Impact** by potentially reducing the volatility of the LQF token, thus making it more attractive for investment. The **Feasibility** is high, as liquidity pools and staking rewards are well-understood mechanisms within DeFi. It fits strategically (**Strategic Fit**) with the need to stabilize the token for broader adoption. The **Risk** is controlled, mainly related to the cost of incentives, which are an investment in the token's market stability.

### Rank 3: 
**Proposal Title:** Exotic Asset Booster Program
**Proposal Description:** Launch a targeted initiative to increase the variety and volume of exotic assets used as collateral. This program would offer reduced fees and higher LTV ratios for new exotic assets during their first six months on the platform.
**Background:** LiquiFi's unique selling proposition is its ability to accept exotic assets as collateral, a niche not covered by major competitors like Aave or Compound.
**Motivation:** To stimulate growth in TVL by attracting more users who hold exotic assets, thereby differentiating LiquiFi further from competitors and addressing the stagnant TVL growth.
**"Options":** Voting in favor would likely increase TVL and user adoption by making the platform more attractive to holders of exotic assets. Voting against would keep the current terms, potentially resulting in continued stagnant growth.

**Reasoning:** This proposal is ranked third as it leverages LiquiFi's unique market position to increase **Impact** on TVL, a key performance metric currently stagnant. The **Feasibility** is moderate, requiring adjustments to fee structures and promotional efforts. It is an excellent **Strategic Fit**, building on LiquiFi's core competency with exotic assets. The **Risk** involves potential lower initial revenue from fee reductions, balanced by the expected increase in user base and asset volume.


    """

    final_report_output = run_refinement_workflow(test_ranked_proposals)
    print("\n--- MODULE 2 TEST OUTPUT ---")
    print(final_report_output)
