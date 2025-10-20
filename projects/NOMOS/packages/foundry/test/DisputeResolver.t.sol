// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "forge-std/Test.sol";
import "../contracts/task/DisputeResolver.sol";
import "../contracts/TaskToken.sol";
import "../contracts/SoulboundUserNFT.sol";
import "../contracts/interfaces/ISoulboundUserNFT.sol";

contract DisputeResolverTest is Test {
    DisputeResolver public disputeResolver;
    TaskToken public taskToken;
    SoulboundUserNFT public soulboundUserNFT;
    address public owner;
    address public admin1;
    address public admin2;
    address public admin3;
    address public worker;
    address public taskCreator;

    uint256 public constant ADMIN_STAKE_AMOUNT = 1000 * 10 ** 18;
    uint256 public constant REWARD_AMOUNT = 100 * 10 ** 18;

    function setUp() public {
        owner = address(this);
        admin1 = address(0x1);
        admin2 = address(0x2);
        admin3 = address(0x3);
        worker = address(0x4);
        taskCreator = address(0x5);

        // 部署TaskToken合约
        taskToken = new TaskToken("Task Token", "TASK", 18);

        // 为管理员铸造代币
        taskToken.mint(admin1, ADMIN_STAKE_AMOUNT * 2);
        taskToken.mint(admin2, ADMIN_STAKE_AMOUNT * 2);
        taskToken.mint(admin3, ADMIN_STAKE_AMOUNT * 2);
        taskToken.mint(worker, ADMIN_STAKE_AMOUNT + REWARD_AMOUNT);
        taskToken.mint(taskCreator, ADMIN_STAKE_AMOUNT);

        // 部署SoulboundUserNFT合约
        soulboundUserNFT = new SoulboundUserNFT("Test User NFT", "TUN");

        // 部署DisputeResolver合约
        disputeResolver = new DisputeResolver(taskToken, ISoulboundUserNFT(address(soulboundUserNFT)));

        // 为管理员铸造NFT
        vm.startPrank(admin1);
        soulboundUserNFT.mintUserNFT("Admin1", "admin1@test.com", "Test admin", "avatar1", new string[](0));
        vm.stopPrank();

        vm.startPrank(admin2);
        soulboundUserNFT.mintUserNFT("Admin2", "admin2@test.com", "Test admin", "avatar2", new string[](0));
        vm.stopPrank();

        vm.startPrank(admin3);
        soulboundUserNFT.mintUserNFT("Admin3", "admin3@test.com", "Test admin", "avatar3", new string[](0));
        vm.stopPrank();

        // 使用合约所有者设置管理员为顶级游民等级
        vm.startPrank(owner);
        soulboundUserNFT.updateUserGrade(admin1, SoulboundUserNFT.UserGrade.Excellent);
        soulboundUserNFT.updateUserGrade(admin2, SoulboundUserNFT.UserGrade.Excellent);
        soulboundUserNFT.updateUserGrade(admin3, SoulboundUserNFT.UserGrade.Excellent);
        vm.stopPrank();

        // 设置授权
        vm.prank(admin1);
        taskToken.approve(address(disputeResolver), ADMIN_STAKE_AMOUNT * 2);

        vm.prank(admin2);
        taskToken.approve(address(disputeResolver), ADMIN_STAKE_AMOUNT * 2);

        vm.prank(admin3);
        taskToken.approve(address(disputeResolver), ADMIN_STAKE_AMOUNT * 2);

        vm.prank(worker);
        taskToken.approve(address(disputeResolver), ADMIN_STAKE_AMOUNT + REWARD_AMOUNT);

        vm.prank(taskCreator);
        taskToken.approve(address(disputeResolver), ADMIN_STAKE_AMOUNT);
    }

    // 测试合约部署
    function testDeployment() public view {
        assertEq(disputeResolver.owner(), owner);
        assertEq(address(disputeResolver.taskToken()), address(taskToken));
        assertEq(disputeResolver.disputeCounter(), 0);
        // adminStakeAmount 已被移除，现在使用用户等级来判断管理员权限
    }

    // 测试提交纠纷
    function testFileDispute() public {
        uint256 initialWorkerBalance = taskToken.balanceOf(worker);
        uint256 initialContractBalance = taskToken.balanceOf(address(disputeResolver));

        // 提交纠纷
        vm.prank(worker);
        disputeResolver.fileDispute(address(0x123), 1, worker, taskCreator, REWARD_AMOUNT, "Proof of work");

        assertEq(disputeResolver.disputeCounter(), 1);

        DisputeResolver.Dispute memory dispute = disputeResolver.getDispute(0);
        assertEq(dispute.taskId, 1);
        assertEq(dispute.taskContract, address(0x123));
        assertEq(dispute.worker, worker);
        assertEq(dispute.taskCreator, taskCreator);
        assertEq(dispute.rewardAmount, REWARD_AMOUNT);
        assertEq(uint8(dispute.status), uint8(DisputeResolver.DisputeStatus.Filed));
        assertEq(dispute.votes.length, 0);

        uint256 processingReward = (REWARD_AMOUNT * 50) / 10000; // 0.5% = 0.5 * 10^18
        assertEq(taskToken.balanceOf(worker), initialWorkerBalance - REWARD_AMOUNT - processingReward);
        assertEq(
            taskToken.balanceOf(address(disputeResolver)), initialContractBalance + REWARD_AMOUNT + processingReward
        );
    }

    // 测试提交纠纷时任务合约地址为0
    function testFileDisputeInvalidTaskContract() public {
        vm.prank(worker);
        vm.expectRevert(DisputeResolver.DisputeResolver_InvalidTaskContract.selector);
        disputeResolver.fileDispute(address(0), 1, worker, taskCreator, REWARD_AMOUNT, "Proof of work");
    }

    // 测试提交纠纷时奖励金额为0
    function testFileDisputeZeroReward() public {
        vm.prank(worker);
        vm.expectRevert(DisputeResolver.DisputeResolver_ZeroReward.selector);
        disputeResolver.fileDispute(address(0x123), 1, worker, taskCreator, 0, "Proof of work");
    }

    // 测试管理员投票
    function testVoteOnDispute() public {
        // 准备测试环境
        setupDisputeAndAdmins();

        // 管理员1投票
        vm.prank(admin1);
        disputeResolver.voteOnDispute(0, REWARD_AMOUNT / 2);

        // 验证投票结果
        assertTrue(disputeResolver.hasVotedOnDispute(admin1, 0));
        DisputeResolver.Dispute memory dispute = disputeResolver.getDispute(0);
        assertEq(dispute.votes.length, 1);
        assertEq(dispute.votes[0].elite, admin1);
        assertEq(dispute.votes[0].workerShare, REWARD_AMOUNT / 2);
    }

    // 测试非管理员投票
    function testVoteOnDisputeNotAdmin() public {
        // 准备测试环境
        setupDisputeAndAdmins();

        // 非管理员尝试投票
        vm.prank(worker);
        vm.expectRevert(DisputeResolver.DisputeResolver_NotEliteUser.selector);
        disputeResolver.voteOnDispute(0, REWARD_AMOUNT / 2);
    }

    // 测试管理员对无效纠纷投票
    function testVoteOnDisputeInvalidDisputeId() public {
        // 准备测试环境
        setupDisputeAndAdmins();

        // 管理员尝试对不存在的纠纷投票
        vm.prank(admin1);
        vm.expectRevert(DisputeResolver.DisputeResolver_NoActiveDispute.selector);
        disputeResolver.voteOnDispute(1, REWARD_AMOUNT / 2);
    }

    // 测试管理员重复投票
    function testVoteOnDisputeAlreadyVoted() public {
        // 准备测试环境
        setupDisputeAndAdmins();

        // 管理员1投票
        vm.prank(admin1);
        disputeResolver.voteOnDispute(0, REWARD_AMOUNT / 2);

        // 管理员1再次投票
        vm.prank(admin1);
        vm.expectRevert(DisputeResolver.DisputeResolver_AlreadyVoted.selector);
        disputeResolver.voteOnDispute(0, REWARD_AMOUNT / 3);
    }

    // 测试管理员投票金额超过奖励金额
    function testVoteOnDisputeInvalidWorkerShare() public {
        // 准备测试环境
        setupDisputeAndAdmins();

        // 管理员1投票，金额超过奖励金额
        vm.prank(admin1);
        vm.expectRevert(DisputeResolver.DisputeResolver_InvalidWorkerShare.selector);
        disputeResolver.voteOnDispute(0, REWARD_AMOUNT + 1);
    }

    // 测试处理投票
    function testProcessVotes() public {
        // 准备测试环境
        setupDisputeAndAdmins();

        // 三个管理员投票
        vm.prank(admin1);
        disputeResolver.voteOnDispute(0, REWARD_AMOUNT / 4);

        vm.prank(admin2);
        disputeResolver.voteOnDispute(0, REWARD_AMOUNT / 2);

        vm.prank(admin3);
        disputeResolver.voteOnDispute(0, (REWARD_AMOUNT * 3) / 4);

        // 处理投票
        disputeResolver.processVotes(0);

        // 验证处理结果
        DisputeResolver.Dispute memory dispute = disputeResolver.getDispute(0);
        assertEq(uint8(dispute.status), uint8(DisputeResolver.DisputeStatus.Resolved));

        DisputeResolver.Dispute memory updatedDispute = disputeResolver.getDispute(0);
        uint256 workerShare = updatedDispute.workerShare;
        bool workerApproved = updatedDispute.workerApproved;
        bool creatorApproved = updatedDispute.creatorApproved;

        // 平均值应该是 (25 + 50 + 75) / 3 = 50
        assertEq(workerShare, REWARD_AMOUNT / 2);
        assertFalse(workerApproved);
        assertFalse(creatorApproved);
    }

    // 测试处理投票时纠纷状态不正确
    function testProcessVotesDisputeNotFiled() public {
        // 准备测试环境
        setupDisputeAndAdmins();

        // 三个管理员投票
        vm.prank(admin1);
        disputeResolver.voteOnDispute(0, REWARD_AMOUNT / 4);

        vm.prank(admin2);
        disputeResolver.voteOnDispute(0, REWARD_AMOUNT / 2);

        vm.prank(admin3);
        disputeResolver.voteOnDispute(0, (REWARD_AMOUNT * 3) / 4);

        // 处理投票
        disputeResolver.processVotes(0);

        // 再次处理投票
        vm.expectRevert(DisputeResolver.DisputeResolver_DisputeNotResolved.selector);
        disputeResolver.processVotes(0);
    }

    // 测试处理投票时投票数量不足
    function testProcessVotesNotEnoughVotes() public {
        // 准备测试环境
        setupDisputeAndAdmins();

        // 只有两个管理员投票（需要至少3个）
        vm.prank(admin1);
        disputeResolver.voteOnDispute(0, REWARD_AMOUNT / 4);

        vm.prank(admin2);
        disputeResolver.voteOnDispute(0, REWARD_AMOUNT / 2);

        // 处理投票
        vm.expectRevert(DisputeResolver.DisputeResolver_NotEnoughVotes.selector);
        disputeResolver.processVotes(0);
    }

    // 测试处理投票时纠纷已解决
    function testProcessVotesAlreadyProcessed() public {
        // 准备测试环境
        setupDisputeAndAdmins();

        // 投票并处理
        voteAndProcess();

        // 尝试再次处理已解决的纠纷应该失败
        vm.expectRevert(DisputeResolver.DisputeResolver_DisputeNotResolved.selector);
        disputeResolver.processVotes(0);
    }

    // 测试批准提案
    function testApproveProposal() public {
        // 准备测试环境
        setupDisputeAndAdmins();

        // 投票并处理
        voteAndProcess();

        // 工作者批准提案
        vm.prank(worker);
        disputeResolver.approveProposal(0);

        DisputeResolver.Dispute memory disputeAfterWorkerApproval = disputeResolver.getDispute(0);
        assertTrue(disputeAfterWorkerApproval.workerApproved);
        assertFalse(disputeAfterWorkerApproval.creatorApproved);

        // 任务创建者批准提案
        vm.prank(taskCreator);
        disputeResolver.approveProposal(0);

        DisputeResolver.Dispute memory disputeAfterBothApproval = disputeResolver.getDispute(0);
        assertTrue(disputeAfterBothApproval.workerApproved);
        assertTrue(disputeAfterBothApproval.creatorApproved);

        uint256 workerShare = disputeAfterBothApproval.workerShare;
        assertTrue(disputeAfterBothApproval.workerApproved);
        assertTrue(disputeAfterBothApproval.creatorApproved);

        assertEq(workerShare, REWARD_AMOUNT / 2);
    }

    // 测试非纠纷相关方批准提案
    function testApproveProposalOnlyDisputeParty() public {
        // 准备测试环境
        setupDisputeAndAdmins();

        // 投票并处理
        voteAndProcess();

        // 非相关方尝试批准提案
        vm.prank(admin1);
        vm.expectRevert(DisputeResolver.DisputeResolver_OnlyDisputeParty.selector);
        disputeResolver.approveProposal(0);
    }

    // 测试重复批准提案
    function testApproveProposalAlreadyApproved() public {
        // 准备测试环境
        setupDisputeAndAdmins();

        // 投票并处理
        voteAndProcess();

        // 工作者批准提案
        vm.prank(worker);
        disputeResolver.approveProposal(0);

        // 工作者再次批准提案
        vm.prank(worker);
        vm.expectRevert(DisputeResolver.DisputeResolver_AlreadyApproved.selector);
        disputeResolver.approveProposal(0);
    }

    // 测试批准提案时纠纷未解决
    function testApproveProposalDisputeNotResolved() public {
        // 准备测试环境
        setupDisputeAndAdmins();

        // 尝试批准未解决的纠纷提案应该失败
        vm.prank(worker);
        vm.expectRevert(DisputeResolver.DisputeResolver_DisputeNotResolved.selector);
        disputeResolver.approveProposal(0);
    }

    // 测试分配资金
    function testDistributeFunds() public {
        // 准备测试环境
        setupDisputeAndAdmins();

        // 投票并处理
        voteAndProcess();

        // 批准提案
        vm.prank(worker);
        disputeResolver.approveProposal(0);

        vm.prank(taskCreator);
        disputeResolver.approveProposal(0);

        uint256 initialContractBalance = taskToken.balanceOf(address(disputeResolver));
        uint256 initialWorkerBalance = taskToken.balanceOf(worker);
        uint256 initialCreatorBalance = taskToken.balanceOf(taskCreator);
        uint256 initialAdmin1Balance = taskToken.balanceOf(admin1);
        uint256 initialAdmin2Balance = taskToken.balanceOf(admin2);
        uint256 initialAdmin3Balance = taskToken.balanceOf(admin3);

        // 分配资金
        disputeResolver.distributeFunds(0);

        // 验证分配结果
        DisputeResolver.Dispute memory dispute = disputeResolver.getDispute(0);
        assertEq(uint8(dispute.status), uint8(DisputeResolver.DisputeStatus.Distributed));

        // 根据投票结果，工作者应得50 * 10^18，创建者应得50 * 10^18
        uint256 workerAmount = REWARD_AMOUNT / 2;
        uint256 creatorAmount = REWARD_AMOUNT / 2;
        uint256 processingReward = (REWARD_AMOUNT * 50) / 10000; // 0.5%
        uint256 rewardPerElite = processingReward / 3; // 3个顶级游民

        // 合约最终余额应该是初始余额减去所有分配的金额
        // 注意：由于整数除法，实际分配的奖励可能略少于计算的processingReward
        uint256 actualDistributedReward = rewardPerElite * 3; // 实际分配的奖励
        uint256 finalContractBalance = initialContractBalance - workerAmount - creatorAmount - actualDistributedReward;
        assertEq(taskToken.balanceOf(address(disputeResolver)), finalContractBalance);
        assertEq(taskToken.balanceOf(worker), initialWorkerBalance + workerAmount);
        assertEq(taskToken.balanceOf(taskCreator), initialCreatorBalance + creatorAmount);

        // 验证顶级游民获得处理奖励
        assertEq(taskToken.balanceOf(admin1), initialAdmin1Balance + rewardPerElite);
        assertEq(taskToken.balanceOf(admin2), initialAdmin2Balance + rewardPerElite);
        assertEq(taskToken.balanceOf(admin3), initialAdmin3Balance + rewardPerElite);
    }

    // 测试分配资金时提案未获批准
    function testDistributeFundsProposalNotApproved() public {
        // 准备测试环境
        setupDisputeAndAdmins();

        // 投票并处理
        voteAndProcess();

        // 未批准提案就尝试分配资金
        vm.expectRevert(DisputeResolver.DisputeResolver_ProposalNotApproved.selector);
        disputeResolver.distributeFunds(0);
    }

    // 测试分配资金时纠纷未解决
    function testDistributeFundsDisputeNotResolved() public {
        // 准备测试环境
        setupDisputeAndAdmins();

        // 尝试分配未解决的纠纷资金应该失败
        vm.expectRevert(DisputeResolver.DisputeResolver_DisputeNotResolved.selector);
        disputeResolver.distributeFunds(0);
    }

    // 测试拒绝提案
    function testRejectProposal() public {
        // 准备测试环境
        setupDisputeAndAdmins();

        // 投票并处理
        voteAndProcess();

        uint256 initialBalance = taskToken.balanceOf(worker);
        uint256 processingReward = (REWARD_AMOUNT * 50) / 10000; // 0.5%

        // 工作者拒绝提案
        vm.prank(worker);
        disputeResolver.rejectProposal(0);

        // 验证拒绝结果
        DisputeResolver.Dispute memory dispute = disputeResolver.getDispute(0);
        assertEq(uint8(dispute.status), uint8(DisputeResolver.DisputeStatus.Filed));
        assertEq(dispute.votes.length, 0);

        DisputeResolver.Dispute memory disputeAfterRejection = disputeResolver.getDispute(0);
        assertFalse(disputeAfterRejection.workerApproved);
        assertFalse(disputeAfterRejection.creatorApproved);

        // 检查拒绝费用是否正确扣除
        assertEq(taskToken.balanceOf(worker), initialBalance - processingReward);

        // 验证管理员可以重新投票
        assertFalse(disputeResolver.hasVotedOnDispute(admin1, 0));
        assertFalse(disputeResolver.hasVotedOnDispute(admin2, 0));
        assertFalse(disputeResolver.hasVotedOnDispute(admin3, 0));
    }

    // 测试非相关方拒绝提案
    function testRejectProposalOnlyDisputeParty() public {
        // 准备测试环境
        setupDisputeAndAdmins();

        // 投票并处理
        voteAndProcess();

        // 非相关方尝试拒绝提案
        vm.prank(admin1);
        vm.expectRevert(DisputeResolver.DisputeResolver_OnlyDisputeParty.selector);
        disputeResolver.rejectProposal(0);
    }

    // 测试拒绝提案时纠纷未解决
    function testRejectProposalDisputeNotResolved() public {
        // 准备测试环境
        setupDisputeAndAdmins();

        // 尝试拒绝未解决的纠纷提案应该失败
        vm.prank(worker);
        vm.expectRevert(DisputeResolver.DisputeResolver_DisputeNotResolved.selector);
        disputeResolver.rejectProposal(0);
    }

    // 辅助函数：设置纠纷和顶级游民
    function setupDisputeAndAdmins() internal {
        // 管理员已经是顶级游民，无需额外设置

        // 提交纠纷
        vm.prank(worker);
        disputeResolver.fileDispute(address(0x123), 1, worker, taskCreator, REWARD_AMOUNT, "Proof of work");
    }

    // 辅助函数：投票并处理
    function voteAndProcess() internal {
        // 三个管理员投票 (25, 50, 75 tokens)
        vm.prank(admin1);
        disputeResolver.voteOnDispute(0, REWARD_AMOUNT / 4); // 25 * 10^18

        vm.prank(admin2);
        disputeResolver.voteOnDispute(0, REWARD_AMOUNT / 2); // 50 * 10^18

        vm.prank(admin3);
        disputeResolver.voteOnDispute(0, (REWARD_AMOUNT * 3) / 4); // 75 * 10^18

        // 处理投票，平均值为 (25 + 50 + 75) / 3 = 50 * 10^18
        disputeResolver.processVotes(0);
    }
}
