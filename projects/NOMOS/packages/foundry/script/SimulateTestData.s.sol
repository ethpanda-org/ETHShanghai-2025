// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "forge-std/StdUtils.sol";
import "../contracts/TaskToken.sol";
import "../contracts/task/DisputeResolver.sol";
import "../contracts/task/FixedPaymentTask.sol";
import "../contracts/task/BiddingTask.sol";
import "../contracts/task/MilestonePaymentTask.sol";
import "../contracts/SoulboundUserNFT.sol";
import "../contracts/ContentShare.sol";
import "../contracts/CollectiveRental/CollectiveRental.sol";
import "../contracts/CollectiveRental/ProposalGovernance.sol";
// forge script script/SimulateTestData.s.sol --rpc-url http://localhost:8545 --broadcast --skip-simulation

/**
 * @notice Script to create test data and simulate transactions after contracts are deployed
 * @dev This script should be run after DeployYourContract.s.sol to create test data
 */
contract SimulateTestData is Script {
    TaskToken public taskToken;
    DisputeResolver public disputeResolver;
    SoulboundUserNFT public soulboundUserNFT;
    ContentShare public contentShare;
    CollectiveRental public collectiveRental;
    ProposalGovernance public proposalGovernance;
    FixedPaymentTask public fixedPaymentTask;
    BiddingTask public biddingTask;
    MilestonePaymentTask public milestonePaymentTask;

    // Test accounts - using actual addresses from local testnet
    uint256 public constant worker1PrivateKey = 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d;
    address public constant worker1 = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8;

    uint256 public constant worker2PrivateKey = 0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a;
    address public constant worker2 = 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC;

    uint256 public constant worker3PrivateKey = 0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6;
    address public constant worker3 = 0x90F79bf6EB2c4f870365E785982E1f101E93b906;

    uint256 public constant admin1PrivateKey = 0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a;
    address public constant admin1 = 0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65;

    uint256 public constant admin2PrivateKey = 0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba;
    address public constant admin2 = 0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc;

    uint256 public constant admin3PrivateKey = 0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e;
    address public constant admin3 = 0x976EA74026E726554dB657fA54763abd0C3a0aa9;

    uint256 public constant client1PrivateKey = 0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356;
    address public constant client1 = 0x14dC79964da2C08b23698B3D3cc7Ca32193d9955;

    uint256 public constant client2PrivateKey = 0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97;
    address public constant client2 = 0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f;

    uint256 public constant freelancer1PrivateKey = 0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6;
    address public constant freelancer1 = 0xa0Ee7A142d267C1f36714E4a8F75612F20a79720;

    uint256 public constant freelancer2PrivateKey = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
    address public constant freelancer2 = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266;

    // Contract addresses - updated with latest deployed addresses
    address public constant TASK_TOKEN_ADDRESS = 0x700b6A60ce7EaaEA56F065753d8dcB9653dbAD35;
    address public constant DISPUTE_RESOLVER_ADDRESS = 0x0C8E79F3534B00D9a3D4a856B665Bf4eBC22f2ba;
    address public constant USER_INFO_ADDRESS = 0xA15BB66138824a1c7167f5E85b957d04Dd34E468;
    address public constant CONTENT_SHARE_ADDRESS = 0xb19b36b1456E65E3A6D514D3F715f204BD59f431;
    address public constant COLLECTIVE_RENTAL_ADDRESS = 0x8ce361602B935680E8DeC218b820ff5056BeB7af;
    address public constant PROPOSAL_GOVERNANCE_ADDRESS = 0xe1Aa25618fA0c7A1CFDab5d6B456af611873b629;
    address public constant FIXED_PAYMENT_TASK_ADDRESS = 0xeD1DB453C3156Ff3155a97AD217b3087D5Dc5f6E;
    address public constant BIDDING_TASK_ADDRESS = 0xf7Cd8fa9b94DB2Aa972023b379c7f72c65E4De9D;
    address public constant MILESTONE_PAYMENT_TASK_ADDRESS = 0x12975173B87F7595EE45dFFb2Ab812ECE596Bf84;

    /**
     * @dev Create test data after contracts are deployed
     */
    function run() external {
        // Load deployed contracts
        _loadContracts();

        // Create test data
        _createTestData();

        console.log("Test data creation completed!");
    }

    function _loadContracts() internal {
        taskToken = TaskToken(TASK_TOKEN_ADDRESS);
        disputeResolver = DisputeResolver(DISPUTE_RESOLVER_ADDRESS);
        soulboundUserNFT = SoulboundUserNFT(USER_INFO_ADDRESS);
        contentShare = ContentShare(CONTENT_SHARE_ADDRESS);
        collectiveRental = CollectiveRental(COLLECTIVE_RENTAL_ADDRESS);
        proposalGovernance = ProposalGovernance(PROPOSAL_GOVERNANCE_ADDRESS);
        fixedPaymentTask = FixedPaymentTask(FIXED_PAYMENT_TASK_ADDRESS);
        biddingTask = BiddingTask(BIDDING_TASK_ADDRESS);
        milestonePaymentTask = MilestonePaymentTask(MILESTONE_PAYMENT_TASK_ADDRESS);
    }

    function _createTestData() internal {
        console.log("Creating enhanced test data for Guild Score calculation...");

        // Mint tokens to all test accounts multiple times for more balance
        address[] memory accounts = new address[](9);
        uint256[] memory privateKeys = new uint256[](9);

        accounts[0] = freelancer2;
        accounts[1] = worker1;
        accounts[2] = worker2;
        accounts[3] = worker3;
        accounts[4] = admin1;
        accounts[5] = admin2;
        accounts[6] = admin3;
        accounts[7] = client1;
        accounts[8] = client2;

        privateKeys[0] = freelancer2PrivateKey;
        privateKeys[1] = worker1PrivateKey;
        privateKeys[2] = worker2PrivateKey;
        privateKeys[3] = worker3PrivateKey;
        privateKeys[4] = admin1PrivateKey;
        privateKeys[5] = admin2PrivateKey;
        privateKeys[6] = admin3PrivateKey;
        privateKeys[7] = client1PrivateKey;
        privateKeys[8] = client2PrivateKey;

        // Mint tokens multiple times for each account
        for (uint256 i = 0; i < accounts.length; i++) {
            vm.startBroadcast(privateKeys[i]);
            // Mint 5 times for more tokens
            for (uint256 j = 0; j < 5; j++) {
                taskToken.faucetMint();
            }
            vm.stopBroadcast();
        }

        // Ensure user NFTs exist for all participants
        _ensureAllUserNFTs();

        // Create multiple rounds of activities for richer data
        console.log("Creating multiple rounds of activities...");

        // Round 1: Basic tasks
        _createFixedPaymentTasks();
        _createBiddingTasks();
        _createMilestonePaymentTasks();

        // Round 2: Additional tasks for more data
        _createAdditionalTasks();

        // Round 3: Disputes and edge cases
        _createDisputes();

        // Round 4: Community features
        _createCollectiveRentalTests();
        _createContentShareTests();
        _createProposalGovernanceTests();
    }

    /**
     * @dev Approve all contracts for a given user
     */
    function _approveContracts(uint256 privateKey) internal {
        vm.startBroadcast(privateKey);
        taskToken.approve(address(fixedPaymentTask), type(uint256).max);
        taskToken.approve(address(biddingTask), type(uint256).max);
        taskToken.approve(address(milestonePaymentTask), type(uint256).max);
        taskToken.approve(address(disputeResolver), type(uint256).max);
        vm.stopBroadcast();
    }

    /**
     * @dev Approve dispute resolver for admins
     */
    function _approveDisputeResolver(uint256 privateKey) internal {
        vm.startBroadcast(privateKey);
        taskToken.approve(address(disputeResolver), type(uint256).max);
        vm.stopBroadcast();
    }

    /**
     * @dev Ensure all known participants have a SoulboundUserNFT. Mints if missing.
     */
    function _ensureAllUserNFTs() internal {
        // Accounts to ensure NFTs for
        address[] memory accounts = new address[](10);
        uint256[] memory privateKeys = new uint256[](10);

        accounts[0] = freelancer1;
        accounts[1] = freelancer2;
        accounts[2] = worker1;
        accounts[3] = worker2;
        accounts[4] = worker3;
        accounts[5] = admin1;
        accounts[6] = admin2;
        accounts[7] = admin3;
        accounts[8] = client1;
        accounts[9] = client2;

        privateKeys[0] = freelancer1PrivateKey;
        privateKeys[1] = freelancer2PrivateKey;
        privateKeys[2] = worker1PrivateKey;
        privateKeys[3] = worker2PrivateKey;
        privateKeys[4] = worker3PrivateKey;
        privateKeys[5] = admin1PrivateKey;
        privateKeys[6] = admin2PrivateKey;
        privateKeys[7] = admin3PrivateKey;
        privateKeys[8] = client1PrivateKey;
        privateKeys[9] = client2PrivateKey;

        for (uint256 i = 0; i < accounts.length; i++) {
            _ensureUserNFT(privateKeys[i], accounts[i]);
        }
    }

    /**
     * @dev Mint SoulboundUserNFT for a specific user if not already minted.
     */
    function _ensureUserNFT(uint256 privateKey, address user) internal {
        bool minted = soulboundUserNFT.hasUserMintedNFT(user);
        if (!minted) {
            vm.startBroadcast(privateKey);
            // Prepare a simple skills array
            string[] memory skills = new string[](2);
            skills[0] = "Solidity";
            skills[1] = "Frontend";
            soulboundUserNFT.mintUserNFT(
                string.concat("User-", vm.toString(user)),
                string(abi.encodePacked(vm.toString(user), "@example.com")),
                "Auto-minted test profile",
                "https://example.com/avatar.png",
                skills
            );
            vm.stopBroadcast();
        }
    }

    function _createFixedPaymentTasks() internal {
        console.log("Creating fixed payment tasks...");

        // Task 1: Simple completed task
        vm.startBroadcast(freelancer2PrivateKey);
        taskToken.approve(address(fixedPaymentTask), type(uint256).max);
        fixedPaymentTask.createTask("Simple Task", "This is a simple fixed payment task", block.timestamp + 30 days);
        uint256 taskId1 = fixedPaymentTask.taskCounter();
        fixedPaymentTask.addWorker(taskId1, worker1, 100 * 10 ** 18);
        vm.stopBroadcast();

        vm.startBroadcast(worker1PrivateKey);
        fixedPaymentTask.submitProofOfWork(taskId1, "Completed the simple task");
        vm.stopBroadcast();

        vm.startBroadcast(freelancer2PrivateKey);
        fixedPaymentTask.approveProofOfWork(taskId1);
        vm.stopBroadcast();

        vm.startBroadcast(worker1PrivateKey);
        fixedPaymentTask.payTask(taskId1);
        vm.stopBroadcast();
        console.log("Task 1 completed and paid");

        // Task 2: Another completed task
        vm.startBroadcast(client1PrivateKey);
        taskToken.approve(address(fixedPaymentTask), type(uint256).max);
        fixedPaymentTask.createTask("Web Development", "Build a responsive website", block.timestamp + 20 days);
        uint256 taskId2 = fixedPaymentTask.taskCounter();
        fixedPaymentTask.addWorker(taskId2, worker2, 150 * 10 ** 18);
        vm.stopBroadcast();

        vm.startBroadcast(worker2PrivateKey);
        fixedPaymentTask.submitProofOfWork(taskId2, "Completed responsive website with modern design");
        vm.stopBroadcast();

        vm.startBroadcast(client1PrivateKey);
        fixedPaymentTask.approveProofOfWork(taskId2);
        vm.stopBroadcast();

        vm.startBroadcast(worker2PrivateKey);
        fixedPaymentTask.payTask(taskId2);
        vm.stopBroadcast();
        console.log("Task 2 completed and paid");

        // Task 3: High-value completed task
        vm.startBroadcast(admin1PrivateKey);
        taskToken.approve(address(fixedPaymentTask), type(uint256).max);
        fixedPaymentTask.createTask("Smart Contract Audit", "Audit a DeFi protocol", block.timestamp + 25 days);
        uint256 taskId3 = fixedPaymentTask.taskCounter();
        fixedPaymentTask.addWorker(taskId3, worker3, 300 * 10 ** 18);
        vm.stopBroadcast();

        vm.startBroadcast(worker3PrivateKey);
        fixedPaymentTask.submitProofOfWork(taskId3, "Completed comprehensive security audit with detailed report");
        vm.stopBroadcast();

        vm.startBroadcast(admin1PrivateKey);
        fixedPaymentTask.approveProofOfWork(taskId3);
        vm.stopBroadcast();

        vm.startBroadcast(worker3PrivateKey);
        fixedPaymentTask.payTask(taskId3);
        vm.stopBroadcast();
        console.log("Task 3 completed and paid");
    }

    function _createBiddingTasks() internal {
        console.log("Creating bidding tasks...");

        // Bidding Task 1: Multiple bidders, completed
        vm.startBroadcast(freelancer2PrivateKey);
        taskToken.approve(address(biddingTask), type(uint256).max);
        biddingTask.createTask("Bidding Task", "This is a task with bidding", block.timestamp + 30 days);
        uint256 taskId1 = biddingTask.taskCounter();
        vm.stopBroadcast();

        // Multiple bidders
        vm.startBroadcast(worker1PrivateKey);
        biddingTask.submitBid(taskId1, 80 * 10 ** 18, "I can do this for 80 tokens", 5 days);
        vm.stopBroadcast();

        vm.startBroadcast(worker2PrivateKey);
        biddingTask.submitBid(taskId1, 90 * 10 ** 18, "I can do this for 90 tokens", 7 days);
        vm.stopBroadcast();

        vm.startBroadcast(worker3PrivateKey);
        biddingTask.submitBid(taskId1, 75 * 10 ** 18, "Best price, 6 days delivery", 6 days);
        vm.stopBroadcast();

        // Accept the best bid (worker3)
        vm.startBroadcast(freelancer2PrivateKey);
        biddingTask.acceptBid(taskId1, 2); // Accept worker3's bid
        vm.stopBroadcast();

        vm.startBroadcast(worker3PrivateKey);
        biddingTask.submitProofOfWork(taskId1, "Completed the bidding task with high quality");
        vm.stopBroadcast();

        vm.startBroadcast(freelancer2PrivateKey);
        biddingTask.approveProofOfWork(taskId1);
        vm.stopBroadcast();

        vm.startBroadcast(worker3PrivateKey);
        biddingTask.payTask(taskId1);
        vm.stopBroadcast();
        console.log("Bidding Task 1 completed and paid");

        // Bidding Task 2: Another completed bidding task
        vm.startBroadcast(client2PrivateKey);
        taskToken.approve(address(biddingTask), type(uint256).max);
        biddingTask.createTask("Mobile App Development", "Build a cross-platform mobile app", block.timestamp + 25 days);
        uint256 taskId2 = biddingTask.taskCounter();
        vm.stopBroadcast();

        // Multiple bidders for task 2
        vm.startBroadcast(worker1PrivateKey);
        biddingTask.submitBid(taskId2, 200 * 10 ** 18, "I can deliver in 2 weeks", 14 days);
        vm.stopBroadcast();

        vm.startBroadcast(worker2PrivateKey);
        biddingTask.submitBid(taskId2, 180 * 10 ** 18, "Best price, 3 weeks delivery", 21 days);
        vm.stopBroadcast();

        // Accept worker2's bid
        vm.startBroadcast(client2PrivateKey);
        biddingTask.acceptBid(taskId2, 1);
        vm.stopBroadcast();

        vm.startBroadcast(worker2PrivateKey);
        biddingTask.submitProofOfWork(taskId2, "Delivered high-quality mobile app with all features");
        vm.stopBroadcast();

        vm.startBroadcast(client2PrivateKey);
        biddingTask.approveProofOfWork(taskId2);
        vm.stopBroadcast();

        vm.startBroadcast(worker2PrivateKey);
        biddingTask.payTask(taskId2);
        vm.stopBroadcast();
        console.log("Bidding Task 2 completed and paid");
    }

    function _createMilestonePaymentTasks() internal {
        console.log("Creating milestone payment tasks...");

        // Milestone Task 1: Complete milestone task
        vm.startBroadcast(freelancer2PrivateKey);
        taskToken.approve(address(milestonePaymentTask), type(uint256).max);
        milestonePaymentTask.createTask("Milestone Task", "This is a task with milestones", block.timestamp + 60 days);
        uint256 taskId1 = milestonePaymentTask.taskCounter();

        // Add milestones
        milestonePaymentTask.addMilestone(taskId1, "First milestone", 50 * 10 ** 18);
        milestonePaymentTask.addMilestone(taskId1, "Second milestone", 70 * 10 ** 18);
        milestonePaymentTask.addMilestone(taskId1, "Final milestone", 80 * 10 ** 18);
        milestonePaymentTask.addWorker(taskId1, worker2);
        vm.stopBroadcast();

        // Complete all milestones
        for (uint256 i = 0; i < 3; i++) {
            vm.startBroadcast(worker2PrivateKey);
            milestonePaymentTask.submitMilestoneProofOfWork(
                taskId1, i, string.concat("Completed milestone ", vm.toString(i + 1))
            );
            vm.stopBroadcast();

            vm.startBroadcast(freelancer2PrivateKey);
            milestonePaymentTask.approveMilestone(taskId1, i);
            vm.stopBroadcast();

            vm.startBroadcast(worker2PrivateKey);
            milestonePaymentTask.payMilestone(taskId1, i);
            vm.stopBroadcast();
        }
        console.log("Milestone Task 1 completed with all milestones paid");

        // Milestone Task 2: Complex project with more milestones
        vm.startBroadcast(admin2PrivateKey);
        taskToken.approve(address(milestonePaymentTask), type(uint256).max);
        milestonePaymentTask.createTask(
            "Full Stack DApp", "Complete decentralized application", block.timestamp + 45 days
        );
        uint256 taskId2 = milestonePaymentTask.taskCounter();

        // Add multiple milestones
        milestonePaymentTask.addMilestone(taskId2, "Frontend Development", 100 * 10 ** 18);
        milestonePaymentTask.addMilestone(taskId2, "Smart Contract Development", 150 * 10 ** 18);
        milestonePaymentTask.addMilestone(taskId2, "Integration & Testing", 100 * 10 ** 18);
        milestonePaymentTask.addMilestone(taskId2, "Deployment & Documentation", 50 * 10 ** 18);
        milestonePaymentTask.addWorker(taskId2, worker1);
        vm.stopBroadcast();

        // Complete all milestones for task 2
        for (uint256 i = 0; i < 4; i++) {
            vm.startBroadcast(worker1PrivateKey);
            milestonePaymentTask.submitMilestoneProofOfWork(
                taskId2, i, string.concat("Completed milestone ", vm.toString(i + 1), " of DApp project")
            );
            vm.stopBroadcast();

            vm.startBroadcast(admin2PrivateKey);
            milestonePaymentTask.approveMilestone(taskId2, i);
            vm.stopBroadcast();

            vm.startBroadcast(worker1PrivateKey);
            milestonePaymentTask.payMilestone(taskId2, i);
            vm.stopBroadcast();
        }
        console.log("Milestone Task 2 completed with all 4 milestones paid");
    }

    function _createDisputes() internal {
        console.log("Creating disputes...");

        // Dispute 1: Fixed payment task dispute
        vm.startBroadcast(freelancer2PrivateKey);
        taskToken.approve(address(fixedPaymentTask), type(uint256).max);
        fixedPaymentTask.createTask(
            "Disputed Fixed Payment Task", "This task will have a dispute", block.timestamp + 30 days
        );
        uint256 taskId1 = fixedPaymentTask.taskCounter();
        fixedPaymentTask.addWorker(taskId1, worker3, 150 * 10 ** 18);
        vm.stopBroadcast();

        vm.startBroadcast(worker3PrivateKey);
        fixedPaymentTask.submitProofOfWork(taskId1, "Completed the disputed task");
        vm.stopBroadcast();

        vm.startBroadcast(freelancer2PrivateKey);
        uint256 processingReward = (150 * 10 ** 18 * disputeResolver.getDisputeProcessingRewardBps()) / 10000;
        taskToken.approve(address(fixedPaymentTask), processingReward);
        fixedPaymentTask.terminateTask(taskId1);
        vm.stopBroadcast();
        console.log("Dispute 1 created for fixed payment task");

        // Dispute 2: Milestone task dispute
        vm.startBroadcast(admin1PrivateKey);
        taskToken.approve(address(milestonePaymentTask), type(uint256).max);
        milestonePaymentTask.createTask(
            "Disputed Milestone Task", "This milestone task will have a dispute", block.timestamp + 60 days
        );
        uint256 taskId2 = milestonePaymentTask.taskCounter();
        milestonePaymentTask.addMilestone(taskId2, "Disputed milestone", 100 * 10 ** 18);
        milestonePaymentTask.addMilestone(taskId2, "Second milestone", 150 * 10 ** 18);
        milestonePaymentTask.addWorker(taskId2, worker1);
        vm.stopBroadcast();

        vm.startBroadcast(worker1PrivateKey);
        milestonePaymentTask.submitMilestoneProofOfWork(taskId2, 0, "Completed disputed milestone");
        vm.stopBroadcast();

        vm.startBroadcast(admin1PrivateKey);
        uint256 processingReward2 = (100 * 10 ** 18 * disputeResolver.getDisputeProcessingRewardBps()) / 10000;
        taskToken.approve(address(milestonePaymentTask), processingReward2);
        milestonePaymentTask.terminateTask(taskId2);
        vm.stopBroadcast();
        console.log("Dispute 2 created for milestone task");

        console.log("2 disputes created successfully");
    }

    function _createCollectiveRentalTests() internal {
        console.log("Creating collective rental tests...");

        // Approve collective rental contract to spend tokens
        vm.startBroadcast(freelancer1PrivateKey);
        taskToken.approve(address(collectiveRental), type(uint256).max);

        // Create a collective rental project
        collectiveRental.createRentalProject(
            "A comprehensive workshop on Web3 development",
            50 * 10 ** 18, // 50 tokens deposit per person
            10, // goal of 10 participants
            block.timestamp + 7 days // 7 days deadline
        );

        uint256 projectId = collectiveRental.getProjectCount() - 1;
        console.log("Created collective rental project with ID:", projectId);
        vm.stopBroadcast();

        // Have other users join the project
        vm.startBroadcast(worker1PrivateKey);
        taskToken.approve(address(collectiveRental), 50 * 10 ** 18);
        collectiveRental.joinRentalProject(projectId);
        vm.stopBroadcast();

        vm.startBroadcast(worker2PrivateKey);
        taskToken.approve(address(collectiveRental), 50 * 10 ** 18);
        collectiveRental.joinRentalProject(projectId);
        vm.stopBroadcast();

        console.log("Users joined the collective rental project");
    }

    function _createContentShareTests() internal {
        console.log("Creating content share tests...");

        // Create content
        vm.startBroadcast(freelancer1PrivateKey);
        contentShare.createContent(
            "Solidity Best Practices",
            100 * 10 ** 18 // 100 tokens price
        );

        uint256 contentId = contentShare.contentCounter();
        console.log("Created content with ID:", contentId);
        vm.stopBroadcast();

        // Have another user purchase the content
        vm.startBroadcast(worker1PrivateKey);
        taskToken.approve(address(contentShare), 100 * 10 ** 18);
        contentShare.purchaseContent(contentId);
        vm.stopBroadcast();

        console.log("User purchased the content");

        // Creator withdraws revenue
        vm.startBroadcast(freelancer1PrivateKey);
        contentShare.withdrawRevenue();
        vm.stopBroadcast();

        console.log("Creator withdrew revenue from content sales");
    }

    function _createProposalGovernanceTests() internal {
        console.log("Creating proposal governance tests...");

        // First create a collective rental project to use for governance
        vm.startBroadcast(freelancer2PrivateKey);
        taskToken.approve(address(collectiveRental), type(uint256).max);
        collectiveRental.createRentalProject(
            "A project for testing governance proposals",
            30 * 10 ** 18, // 30 tokens deposit per person
            5, // goal of 5 participants
            block.timestamp + 5 days // 5 days deadline
        );

        uint256 projectId = collectiveRental.getProjectCount() - 1;
        console.log("Created project for governance testing with ID:", projectId);
        vm.stopBroadcast();

        // Note: Proposal creation requires successful project - skipping for now
        // The project has been created and is ready for manual governance testing
        console.log("Project created for governance testing - ready for manual proposal creation");
    }

    /**
     * @dev Create additional completed tasks for more diverse data
     */
    function _createAdditionalTasks() internal {
        console.log("Creating additional completed tasks for richer data...");

        // Additional completed fixed payment task
        vm.startBroadcast(client2PrivateKey);
        taskToken.approve(address(fixedPaymentTask), type(uint256).max);
        fixedPaymentTask.createTask("Database Optimization", "Optimize database performance", block.timestamp + 10 days);
        uint256 taskId1 = fixedPaymentTask.taskCounter();
        fixedPaymentTask.addWorker(taskId1, worker1, 120 * 10 ** 18);
        vm.stopBroadcast();

        vm.startBroadcast(worker1PrivateKey);
        fixedPaymentTask.submitProofOfWork(taskId1, "Completed database optimization with 50% performance improvement");
        vm.stopBroadcast();

        vm.startBroadcast(client2PrivateKey);
        fixedPaymentTask.approveProofOfWork(taskId1);
        vm.stopBroadcast();

        vm.startBroadcast(worker1PrivateKey);
        fixedPaymentTask.payTask(taskId1);
        vm.stopBroadcast();
        console.log("Additional Fixed Task completed and paid");

        // Additional completed bidding task
        vm.startBroadcast(admin3PrivateKey);
        taskToken.approve(address(biddingTask), type(uint256).max);
        biddingTask.createTask("API Development", "Build RESTful API", block.timestamp + 15 days);
        uint256 taskId2 = biddingTask.taskCounter();
        vm.stopBroadcast();

        // Multiple bidders
        vm.startBroadcast(worker2PrivateKey);
        biddingTask.submitBid(taskId2, 80 * 10 ** 18, "I can deliver in 1 week", 7 days);
        vm.stopBroadcast();

        vm.startBroadcast(worker3PrivateKey);
        biddingTask.submitBid(taskId2, 90 * 10 ** 18, "High quality, 10 days", 10 days);
        vm.stopBroadcast();

        // Accept worker2's bid
        vm.startBroadcast(admin3PrivateKey);
        biddingTask.acceptBid(taskId2, 0);
        vm.stopBroadcast();

        vm.startBroadcast(worker2PrivateKey);
        biddingTask.submitProofOfWork(taskId2, "Delivered comprehensive RESTful API with documentation");
        vm.stopBroadcast();

        vm.startBroadcast(admin3PrivateKey);
        biddingTask.approveProofOfWork(taskId2);
        vm.stopBroadcast();

        vm.startBroadcast(worker2PrivateKey);
        biddingTask.payTask(taskId2);
        vm.stopBroadcast();
        console.log("Additional Bidding Task completed and paid");

        console.log("2 additional tasks completed successfully");
    }
}
