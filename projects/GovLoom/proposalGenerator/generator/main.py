import json
import os
from dotenv import load_dotenv

from generate_proposal import build_generation_workflow
from verifer_proposal import build_refinement_workflow

def main():
    # --- Step 1: Define the Initial Project Context ---
    # This is the "Human-in-the-Loop" input from your analysis
    knowledge_graph = "D:\\code\\analysis_contract\\knowledge_graph.json"

    project_context_input = f"""
        # Project: Frax Finance

        ## 1. Overview
        Frax is a fractional stablecoin multichain protocol, introducing a cryptocurrency that is partially backed by collateral and partially stabilized algorithmically. Its goal is to create highly scalable, decentralized money in place of fixed-supply digital assets like BTC.
        The Frax ecosystem has 2 stablecoins: FRAX (pegged to the US dollar) & FPI (pegged to the US Consumer Price Index, hence not bound to crypto $value cycles). The Frax Finance economy is composed primarily of those two stablecoins, a native AMM (Fraxswap), and a lending facility (Fraxlend). 


        The entire Frax ecosystem of smart contracts is governed by the Frax Share token ($FXS) and accrues fees, seigniorage revenue, and excess collateral value.
        The FPI (index) is governed by FPIS token, that splits its value capture with FXS holders. Proposals and voting are treated via off-chain Snapshot spaces. 
        As of writing, the protocol has also deployed an on-chain Governor contract, that has not voted yet. (Nov. 2022).


        Frax Snapshots include its main voting space, a Frax Lobis space designated to the joint affairs of a past Frax-Lobis collaboration, and another to govern it Frax Price Index system and token.

        ## 2. Knowledge Graph (JSON)
        ```json
        {json.dumps(knowledge_graph, indent=2)}

        ## 3. Key Metrics & Trends
        TVL: The Total Value Locked (TVL) is not stagnant at $50M. Based on the data, it has been volatile in the hundreds of millions. In the last three reported months (May-July 2024), the TVL peaked at over $715 million in early June before declining to approximately $541 million by early July, indicating a significant downward trend in the most recent period.
        Revenue: According to the provided data, the protocol's retained revenue is zero, meaning 100% of generated fees are distributed and not kept by the treasury. Total fees are highly volatile, not declining by a steady 10% month-over-month. For example, total fees were approximately $2.9 million in April 2024, fell to $2.1 million in May 2024, and remained stable at $2.1 million in June 2024.
        DEX Liquidity: The primary liquidity for the native token (FXS) is concentrated in the FXS/FRAX pool on Fraxswap (Ethereum), with over $7.7 million in liquidity. In contrast, the main FXS/WETH pool on Uniswap has significantly lower liquidity at approximately $165,000, which could lead to higher price volatility for trades against ETH.
        Market Cap: The provided CSV files do not contain information on the market capitalization or fully diluted value of the Frax Share token (FXS).
        Price Change: The provided files do not include historical price data for the FXS token. Therefore, a price change analysis for the last 6 months cannot be performed based on this information.
        ## 4. Community & Governance Insights
        Pain Points: The provided CSV files contain quantitative on-chain data and do not include any qualitative information regarding community complaints, sentiment, or discussions about the token's value.
        Past Proposals: Information regarding governance proposals, such as adding new collateral types or introducing revenue sharing, is not available in the provided data sets.
    """

    # --- Step 2: Run Module 1 (Generate and Rank) using stream ---
    print("\n" + "=" * 50)
    print("STARTING MODULE 1: GENERATION AND RANKING (STREAMING)")
    print("=" * 50)

    # Build the workflow app
    generation_app = build_generation_workflow()

    # Define inputs for the workflow
    inputs_module1 = {"project_context": project_context_input}

    ranked_proposals = ""
    # Use a for loop to process the stream of events
    for event in generation_app.stream(inputs_module1):
        # event is a dictionary where the key is the node name and the value is the output
        for node_name, output in event.items():
            print(f"--- [Module 1] Output from node: '{node_name}' ---")
            # We are interested in the final output from the 'ranker' node
            if node_name == "ranker":
                ranked_proposals = output.get("ranked_proposals")
                print("Ranker finished. Captured the ranked proposals.")
            else:
                # For other nodes, you can just print a confirmation or parts of the output
                print(f"Node '{node_name}' completed its task.")
            print("-" * 20)

    if not ranked_proposals:
        print("ERROR: Module 1 did not produce ranked proposals.")
        return

    with open("ranked_proposals.md", "w", encoding="utf-8") as f:
        f.write(ranked_proposals)
    print("\nModule 1 finished. Ranked proposals saved to 'ranked_proposals.md'")

    # --- Step 3: Run Module 2 (Validate and Refine) using stream ---
    print("\n" + "=" * 50)
    print("STARTING MODULE 2: VALIDATION AND REFINEMENT (STREAMING)")
    print("=" * 50)

    # Build the second workflow app
    refinement_app = build_refinement_workflow()

    inputs_module2 = {"ranked_proposals": ranked_proposals}

    final_governance_report = ""
    for event in refinement_app.stream(inputs_module2):
        for node_name, output in event.items():
            print(f"--- [Module 2] Output from node: '{node_name}' ---")
            if node_name == "reporter":
                final_governance_report = output.get("final_report")
                print("Reporter finished. Captured the final governance report.")
            else:
                print(f"Node '{node_name}' completed its task.")
            print("-" * 20)

    if not final_governance_report:
        print("ERROR: Module 2 did not produce a final report.")
        return

    # --- Step 4: Display and Save Final Output ---
    print("\n\n" + "=" * 50)
    print("   FINAL GOVERNANCE-READY PROPOSAL REPORT   ")
    print("=" * 50 + "\n")
    print(final_governance_report)

    with open("final_governance_report.md", "w", encoding="utf-8") as f:
        f.write(final_governance_report)
    print("\nPipeline complete. Final report saved to 'final_governance_report.md'")


if __name__ == "__main__":
    main()