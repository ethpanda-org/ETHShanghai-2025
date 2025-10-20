// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./DeployHelpers.s.sol";
import "../contracts/TaskToken.sol";
import "../contracts/task/DisputeResolver.sol";
import "../contracts/task/FixedPaymentTask.sol";
import "../contracts/task/BiddingTask.sol";
import "../contracts/task/MilestonePaymentTask.sol";
import "../contracts/SoulboundUserNFT.sol";
import "../contracts/ContentShare.sol";
import "../contracts/CollectiveRental/CollectiveRental.sol";
import "../contracts/CollectiveRental/ProposalGovernance.sol";
import "../contracts/interfaces/ISoulboundUserNFT.sol";

/**
 * @notice Deploy script for YourContract contract
 * @dev Inherits ScaffoldETHDeploy which:
 *      - Includes forge-std/Script.sol for deployment
 *      - Includes ScaffoldEthDeployerRunner modifier
 *      - Provides `deployer` variable
 * Example:
 * yarn deploy --file DeployYourContract.s.sol  # local anvil chain
 * yarn deploy --file DeployYourContract.s.sol --network optimism # live network (requires keystore)
 */
contract DeployYourContract is ScaffoldETHDeploy {
    /**
     * @dev Deployer setup based on `ETH_KEYSTORE_ACCOUNT` in `.env`:
     *      - "scaffold-eth-default": Uses Anvil's account #9 (0xa0Ee7A142d267C1f36714E4a8F75612F20a79720), no password prompt
     *      - "scaffold-eth-custom": requires password used while creating keystore
     *
     * Note: Must use ScaffoldEthDeployerRunner modifier to:
     *      - Setup correct `deployer` account and fund it
     *      - Export contract addresses & ABIs to `nextjs` packages
     */
    function run() external ScaffoldEthDeployerRunner {
        // Deploy TaskToken contract
        TaskToken taskToken = new TaskToken("Task Token", "TASK", 18);
        console.log("TaskToken deployed to:", address(taskToken));

        // Deploy SoulboundUserNFT contract
        SoulboundUserNFT soulboundUserNFT = new SoulboundUserNFT("User Identity NFT", "UIN");
        console.log("SoulboundUserNFT deployed to:", address(soulboundUserNFT));

        // Deploy ContentShare contract
        ContentShare contentShare = new ContentShare(taskToken, ISoulboundUserNFT(address(soulboundUserNFT)));
        console.log("ContentShare deployed to:", address(contentShare));

        // Deploy CollectiveRental contract
        CollectiveRental collectiveRental =
            new CollectiveRental(taskToken, ISoulboundUserNFT(address(soulboundUserNFT)));
        console.log("CollectiveRental deployed to:", address(collectiveRental));

        // Deploy ProposalGovernance contract
        ProposalGovernance proposalGovernance = new ProposalGovernance(address(collectiveRental));
        console.log("ProposalGovernance deployed to:", address(proposalGovernance));

        // Set the proposal address in CollectiveRental
        collectiveRental.setProposalAddress(address(proposalGovernance));
        console.log("ProposalGovernance address set in CollectiveRental");

        // Deploy DisputeResolver contract
        DisputeResolver disputeResolver = new DisputeResolver(taskToken, ISoulboundUserNFT(address(soulboundUserNFT)));
        console.log("DisputeResolver deployed to:", address(disputeResolver));

        // Deploy FixedPaymentTask contract
        FixedPaymentTask fixedPaymentTask = new FixedPaymentTask(taskToken, IDisputeResolver(address(disputeResolver)));
        console.log("FixedPaymentTask deployed to:", address(fixedPaymentTask));

        // Deploy BiddingTask contract
        BiddingTask biddingTask = new BiddingTask(taskToken, IDisputeResolver(address(disputeResolver)));
        console.log("BiddingTask deployed to:", address(biddingTask));

        // Deploy MilestonePaymentTask contract
        MilestonePaymentTask milestonePaymentTask =
            new MilestonePaymentTask(taskToken, IDisputeResolver(address(disputeResolver)));
        console.log("MilestonePaymentTask deployed to:", address(milestonePaymentTask));

        // Output deployment information
        console.log("=====================================");
        console.log("All contracts deployed successfully:");
        console.log("- TaskToken: ", address(taskToken));
        console.log("- SoulboundUserNFT: ", address(soulboundUserNFT));
        console.log("- ContentShare: ", address(contentShare));
        console.log("- CollectiveRental: ", address(collectiveRental));
        console.log("- ProposalGovernance: ", address(proposalGovernance));
        console.log("- DisputeResolver: ", address(disputeResolver));
        console.log("- FixedPaymentTask: ", address(fixedPaymentTask));
        console.log("- BiddingTask: ", address(biddingTask));
        console.log("- MilestonePaymentTask: ", address(milestonePaymentTask));
        console.log("=====================================");
    }
}
