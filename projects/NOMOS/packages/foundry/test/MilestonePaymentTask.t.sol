// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "../contracts/task/MilestonePaymentTask.sol";
import "../contracts/TaskToken.sol";
import "../contracts/task/DisputeResolver.sol";
import "../contracts/SoulboundUserNFT.sol";
import "../contracts/interfaces/ISoulboundUserNFT.sol";
import "../contracts/interfaces/IDisputeResolver.sol";

contract MilestonePaymentTaskTest is Test {
    MilestonePaymentTask public milestonePaymentTask;
    TaskToken public taskToken;
    DisputeResolver public disputeResolver;
    SoulboundUserNFT public soulboundUserNFT;

    address public owner;
    address public taskCreator;
    address public worker;
    address public otherUser;

    uint256 public constant TOTAL_REWARD = 300 * 10 ** 18;
    uint256 public constant ADMIN_STAKE_AMOUNT = 1000 * 10 ** 18;
    uint256 public constant MILESTONE_REWARD_1 = 100 * 10 ** 18;
    uint256 public constant MILESTONE_REWARD_2 = 200 * 10 ** 18;

    // Modifiers to reduce code duplication
    modifier givenTaskCreated() {
        vm.prank(taskCreator);
        milestonePaymentTask.createTask("Test Task", "Test Description", block.timestamp + 1 days);
        _;
    }

    modifier givenTaskWithWorker() {
        vm.prank(taskCreator);
        milestonePaymentTask.createTask("Test Task", "Test Description", block.timestamp + 1 days);

        vm.prank(taskCreator);
        milestonePaymentTask.addWorker(1, worker);
        _;
    }

    modifier givenTaskWithMilestones() {
        vm.prank(taskCreator);
        milestonePaymentTask.createTask("Test Task", "Test Description", block.timestamp + 1 days);

        vm.prank(taskCreator);
        milestonePaymentTask.addWorker(1, worker);

        vm.prank(taskCreator);
        milestonePaymentTask.addMilestone(1, "Milestone 1", MILESTONE_REWARD_1);
        _;
    }

    modifier givenTaskWithProofOfWork() {
        vm.prank(taskCreator);
        milestonePaymentTask.createTask("Test Task", "Test Description", block.timestamp + 1 days);

        vm.prank(taskCreator);
        milestonePaymentTask.addWorker(1, worker);

        vm.prank(taskCreator);
        milestonePaymentTask.addMilestone(1, "Milestone 1", MILESTONE_REWARD_1);

        vm.prank(worker);
        milestonePaymentTask.submitMilestoneProofOfWork(1, 0, "Proof of work");
        _;
    }

    modifier givenTaskWithApprovedMilestone() {
        vm.prank(taskCreator);
        milestonePaymentTask.createTask("Test Task", "Test Description", block.timestamp + 1 days);

        vm.prank(taskCreator);
        milestonePaymentTask.addWorker(1, worker);

        vm.prank(taskCreator);
        milestonePaymentTask.addMilestone(1, "Milestone 1", MILESTONE_REWARD_1);

        vm.prank(worker);
        milestonePaymentTask.submitMilestoneProofOfWork(1, 0, "Proof of work");

        vm.prank(taskCreator);
        milestonePaymentTask.approveMilestone(1, 0);
        _;
    }

    function setUp() public {
        owner = address(this);
        taskCreator = address(0x1);
        worker = address(0x2);
        otherUser = address(0x3);

        // 部署TaskToken合约
        taskToken = new TaskToken("Task Token", "TASK", 18);

        // 为用户铸造代币
        taskToken.mint(taskCreator, TOTAL_REWARD * 10);
        taskToken.mint(worker, ADMIN_STAKE_AMOUNT);
        taskToken.mint(otherUser, TOTAL_REWARD);

        // 部署SoulboundUserNFT合约
        soulboundUserNFT = new SoulboundUserNFT("Test User NFT", "TUN");

        // 部署DisputeResolver合约
        disputeResolver = new DisputeResolver(taskToken, ISoulboundUserNFT(address(soulboundUserNFT)));

        // 部署MilestonePaymentTask合约
        milestonePaymentTask = new MilestonePaymentTask(taskToken, IDisputeResolver(address(disputeResolver)));

        // 设置授权
        vm.prank(taskCreator);
        taskToken.approve(address(milestonePaymentTask), TOTAL_REWARD * 10);

        vm.prank(worker);
        taskToken.approve(address(disputeResolver), ADMIN_STAKE_AMOUNT);

        // 为fileDisputeByWorker测试添加授权
        vm.prank(otherUser);
        taskToken.approve(address(disputeResolver), ADMIN_STAKE_AMOUNT);
    }

    // 测试合约部署
    function testDeployment() public view {
        assertEq(milestonePaymentTask.owner(), owner);
        assertEq(address(milestonePaymentTask.taskToken()), address(taskToken));
        assertEq(address(milestonePaymentTask.disputeResolver()), address(disputeResolver));
    }

    // 测试创建任务
    function testCreateTask() public givenTaskCreated {
        (uint256 id,, uint256 deadline, BaseTask.TaskStatus status, address creator,) = milestonePaymentTask.tasks(1);

        assertEq(id, 1);
        assertEq(creator, taskCreator);
        assertEq(deadline, block.timestamp + 1 days);
        assertEq(uint8(status), uint8(BaseTask.TaskStatus.Open));
        assertEq(milestonePaymentTask.taskCounter(), 1);
    }

    // 测试创建任务时截止时间无效
    function testCreateTaskInvalidDeadline() public {
        vm.warp(1000000);

        vm.prank(taskCreator);
        vm.expectRevert(BaseTask.InvalidDeadline.selector);
        milestonePaymentTask.createTask("Test Task", "Test Description", block.timestamp - 1 hours);
    }

    // 测试添加工作者
    function testAddWorker() public givenTaskCreated {
        // 添加工作者并存入报酬
        vm.prank(taskCreator);
        milestonePaymentTask.addWorker(1, worker);

        // 检查任务状态
        (, uint256 totalreward,, BaseTask.TaskStatus status,, address taskWorker) = milestonePaymentTask.tasks(1);
        assertEq(totalreward, 0);
        assertEq(uint8(status), uint8(BaseTask.TaskStatus.InProgress));
        assertEq(taskWorker, worker);
        assertEq(taskToken.balanceOf(address(milestonePaymentTask)), 0);
    }

    // 测试只有任务创建者可以添加工作者
    function testAddWorkerOnlyTaskCreator() public givenTaskCreated {
        // 其他用户尝试添加工作者
        vm.prank(otherUser);
        vm.expectRevert(abi.encodeWithSelector(BaseTask.OnlyTaskCreator.selector, otherUser, 1));
        milestonePaymentTask.addWorker(1, worker); // 移除第三个参数
    }

    // 测试添加工作者时使用无效地址的情况
    function testAddWorkerInvalidAddress() public givenTaskCreated {
        // 尝试添加零地址工作者应该失败
        vm.prank(taskCreator);
        vm.expectRevert(MilestonePaymentTask.MilestonePaymentTask_InvalidWorkerAddress.selector);
        milestonePaymentTask.addWorker(1, address(0));
    }

    // 测试向非开放状态的任务添加工作者的情况
    function testAddWorkerNotOpen() public {
        // 创建任务
        vm.prank(taskCreator);
        milestonePaymentTask.createTask("Test Task", "Test Description", block.timestamp + 1 days);

        // 添加工作者
        vm.prank(taskCreator);
        milestonePaymentTask.addWorker(1, worker);

        // 完成任务
        // 添加里程碑
        vm.prank(taskCreator);
        milestonePaymentTask.addMilestone(1, "Milestone 1", MILESTONE_REWARD_1);

        // 提交工作量证明
        vm.prank(worker);
        milestonePaymentTask.submitMilestoneProofOfWork(1, 0, "Proof of work");

        // 批准里程碑
        vm.prank(taskCreator);
        milestonePaymentTask.approveMilestone(1, 0);

        // 支付里程碑
        milestonePaymentTask.payMilestone(1, 0);

        // 完成任务
        milestonePaymentTask.completeTask(1);

        address anotherWorker = address(0x4);
        // 尝试向已完成的任务添加另一个工作者应该失败
        vm.prank(taskCreator);
        vm.expectRevert(abi.encodeWithSelector(MilestonePaymentTask.MilestonePaymentTask_TaskNotOpen.selector, 1));
        milestonePaymentTask.addWorker(1, anotherWorker);
    }

    // 测试添加里程碑
    function testAddMilestone() public givenTaskWithWorker {
        // 添加里程碑
        vm.prank(taskCreator);
        milestonePaymentTask.addMilestone(1, "Milestone 1", MILESTONE_REWARD_1);

        // 验证里程碑已添加
        assertEq(milestonePaymentTask.getMilestonesCount(1), 1);

        MilestonePaymentTask.Milestone memory milestone = milestonePaymentTask.getMilestone(1, 0);
        assertEq(milestone.reward, MILESTONE_REWARD_1);
        assertFalse(milestone.paid);
        assertFalse(milestone.workProof.submitted);
        assertFalse(milestone.workProof.approved);
        assertEq(milestone.workProof.submittedAt, 0);
    }

    // 测试添加多个里程碑
    function testAddMultipleMilestones() public givenTaskWithWorker {
        // 添加多个里程碑
        vm.prank(taskCreator);
        milestonePaymentTask.addMilestone(1, "Milestone 1", MILESTONE_REWARD_1);
        vm.prank(taskCreator);
        milestonePaymentTask.addMilestone(1, "Milestone 2", MILESTONE_REWARD_2);

        // 验证里程碑已添加
        assertEq(milestonePaymentTask.getMilestonesCount(1), 2);

        MilestonePaymentTask.Milestone memory milestone1 = milestonePaymentTask.getMilestone(1, 0);
        assertEq(milestone1.reward, MILESTONE_REWARD_1);

        MilestonePaymentTask.Milestone memory milestone2 = milestonePaymentTask.getMilestone(1, 1);
        assertEq(milestone2.reward, MILESTONE_REWARD_2);
    }

    // 测试添加里程碑时奖励不足
    function testAddMilestoneRewardInsufficient() public givenTaskWithWorker {
        // 添加里程碑，奖励为0应该失败
        vm.prank(taskCreator);
        vm.expectRevert(BaseTask.RewardMoreThanZero.selector);
        milestonePaymentTask.addMilestone(1, "Milestone 1", 0);
    }

    // 测试提交里程碑工作量证明
    function testSubmitMilestoneProofOfWork() public givenTaskWithMilestones {
        // 工作者提交工作量证明
        vm.prank(worker);
        milestonePaymentTask.submitMilestoneProofOfWork(1, 0, "This is my proof of work");

        // 验证工作量证明已提交
        MilestonePaymentTask.Milestone memory milestone = milestonePaymentTask.getMilestone(1, 0);
        assertEq(milestone.workProof.proof, "This is my proof of work");
        assertTrue(milestone.workProof.submitted);
        assertFalse(milestone.workProof.approved);
        assertGt(milestone.workProof.submittedAt, 0);
    }

    // 测试提交里程碑工作量证明时截止时间已过
    function testSubmitMilestoneProofOfWorkDeadlinePassed() public givenTaskWithMilestones {
        // 将时间推进到截止时间之后
        vm.warp(block.timestamp + 2 days);

        // 工作者尝试提交工作量证明应该失败
        vm.prank(worker);
        vm.expectRevert(MilestonePaymentTask.MilestonePaymentTask_DeadlinePassed.selector);
        milestonePaymentTask.submitMilestoneProofOfWork(1, 0, "This is my proof of work");
    }

    // 测试提交空工作量证明
    function testSubmitMilestoneProofOfWorkEmpty() public givenTaskWithMilestones {
        // 工作者尝试提交空的工作量证明应该失败
        vm.prank(worker);
        vm.expectRevert(MilestonePaymentTask.MilestonePaymentTask_ProofOfWorkEmpty.selector);
        milestonePaymentTask.submitMilestoneProofOfWork(1, 0, "");
    }

    // 测试非工作者提交工作量证明
    function testSubmitMilestoneProofOfWorkOnlyWorker() public givenTaskWithMilestones {
        // 其他用户尝试提交工作量证明应该失败
        vm.prank(otherUser);
        vm.expectRevert(abi.encodeWithSelector(BaseTask.OnlyTaskWorker.selector, otherUser, 1));
        milestonePaymentTask.submitMilestoneProofOfWork(1, 0, "This is my proof of work");
    }

    // 测试提交工作量证明时里程碑索引无效
    function testSubmitMilestoneProofOfWorkInvalidIndex() public givenTaskWithMilestones {
        // 工作者尝试使用无效的里程碑索引提交工作量证明应该失败
        vm.prank(worker);
        vm.expectRevert(MilestonePaymentTask.MilestonePaymentTask_InvalidMilestoneIndex.selector);
        milestonePaymentTask.submitMilestoneProofOfWork(1, 1, "This is my proof of work");
    }

    // 测试批准里程碑
    function testApproveMilestone() public givenTaskWithProofOfWork {
        // 任务创建者批准里程碑
        vm.prank(taskCreator);
        milestonePaymentTask.approveMilestone(1, 0);

        // 验证里程碑已批准
        MilestonePaymentTask.Milestone memory milestone = milestonePaymentTask.getMilestone(1, 0);
        assertTrue(milestone.workProof.approved);
        // 计数递增应在 payMilestone 后断言
        milestonePaymentTask.payMilestone(1, 0);
        assertEq(milestonePaymentTask.completedMilestonesCount(1), 1);
    }

    // 测试批准未提交的里程碑
    function testApproveMilestoneNotSubmitted() public givenTaskWithMilestones {
        // 任务创建者尝试批准未提交的工作量证明应该失败
        vm.prank(taskCreator);
        vm.expectRevert(MilestonePaymentTask.MilestonePaymentTask_MilestoneNotSubmitted.selector);
        milestonePaymentTask.approveMilestone(1, 0);
    }

    // 测试批准已批准的里程碑
    function testApproveMilestoneAlreadyApproved() public givenTaskWithApprovedMilestone {
        // 再次批准应该失败
        vm.prank(taskCreator);
        vm.expectRevert(MilestonePaymentTask.MilestonePaymentTask_MilestoneAlreadyApproved.selector);
        milestonePaymentTask.approveMilestone(1, 0);
    }

    // 测试支付里程碑
    function testPayMilestone() public givenTaskWithApprovedMilestone {
        uint256 initialWorkerBalance = taskToken.balanceOf(worker);
        uint256 initialPlatformRevenue = milestonePaymentTask.totalPlatformRevenue();

        // 支付里程碑
        milestonePaymentTask.payMilestone(1, 0);

        // 验证里程碑已支付
        MilestonePaymentTask.Milestone memory milestone = milestonePaymentTask.getMilestone(1, 0);
        assertTrue(milestone.paid);

        // 验证资金已正确分配
        uint256 platformFee = (MILESTONE_REWARD_1 * 100) / 10000; // 1% 平台费用
        uint256 workerPayment = MILESTONE_REWARD_1 - platformFee;

        assertEq(taskToken.balanceOf(worker), initialWorkerBalance + workerPayment);
        assertEq(milestonePaymentTask.totalPlatformRevenue(), initialPlatformRevenue + platformFee);
    }

    // 测试支付未批准的里程碑
    function testPayMilestoneNotApproved() public givenTaskWithProofOfWork {
        // 尝试支付未批准的里程碑应该失败
        vm.expectRevert(MilestonePaymentTask.MilestonePaymentTask_MilestoneNotApproved.selector);
        milestonePaymentTask.payMilestone(1, 0);
    }

    // 测试支付已支付的里程碑
    function testPayMilestoneAlreadyPaid() public givenTaskWithApprovedMilestone {
        // 支付里程碑
        milestonePaymentTask.payMilestone(1, 0);

        // 再次支付应该失败
        vm.expectRevert(MilestonePaymentTask.MilestonePaymentTask_MilestoneAlreadyPaid.selector);
        milestonePaymentTask.payMilestone(1, 0);
    }

    // 测试完成任务
    function testCompleteTask() public givenTaskWithApprovedMilestone {
        // 支付里程碑
        milestonePaymentTask.payMilestone(1, 0);
        // 完成任务
        milestonePaymentTask.completeTask(1);

        // 验证任务状态
        (,,, BaseTask.TaskStatus status,,) = milestonePaymentTask.tasks(1);
        assertEq(uint8(status), uint8(BaseTask.TaskStatus.Paid));
    }

    // 测试完成任务时没有定义里程碑
    function testCompleteTaskNoMilestonesDefined() public givenTaskWithWorker {
        // 尝试完成没有里程碑的任务应该失败
        vm.expectRevert(MilestonePaymentTask.MilestonePaymentTask_NoMilestonesDefined.selector);
        milestonePaymentTask.completeTask(1);
    }

    // 测试完成任务时里程碑未全部批准
    function testCompleteTaskMilestoneNotApproved() public givenTaskWithProofOfWork {
        // 尝试完成未批准里程碑的任务应该失败
        vm.expectRevert(MilestonePaymentTask.MilestonePaymentTask_MilestoneNotApproved.selector);
        milestonePaymentTask.completeTask(1);
    }

    // 测试终止任务
    function testTerminateTask() public givenTaskCreated {
        uint256 initialCreatorBalance = taskToken.balanceOf(taskCreator);

        // 添加工作者
        vm.prank(taskCreator);
        milestonePaymentTask.addWorker(1, worker);

        // 任务创建者终止任务
        vm.prank(taskCreator);
        milestonePaymentTask.terminateTask(1);

        // 验证任务状态已更新
        (,,, BaseTask.TaskStatus status,,) = milestonePaymentTask.tasks(1);
        assertEq(uint8(status), uint8(BaseTask.TaskStatus.Cancelled));

        // 验证资金已退还给任务创建者
        assertEq(taskToken.balanceOf(taskCreator), initialCreatorBalance);
        assertEq(taskToken.balanceOf(address(milestonePaymentTask)), 0);
    }

    // 测试工作者提交纠纷
    function testFileDisputeByWorker() public givenTaskWithProofOfWork {
        // 推进时间以满足纠纷提交的最小时间要求 (3天)
        vm.warp(block.timestamp + 4 days);

        // 为提交纠纷提供处理奖励
        uint256 disputeProcessingRewardBps = disputeResolver.getDisputeProcessingRewardBps();
        uint256 processingReward =
            (MILESTONE_REWARD_1 * disputeProcessingRewardBps) / milestonePaymentTask.DenominatorFee();
        vm.prank(worker);
        taskToken.approve(address(milestonePaymentTask), processingReward);

        // 工作者提交纠纷
        vm.prank(worker);
        milestonePaymentTask.fileDisputeByWorker(1, 0);

        // 验证纠纷已提交
        // 这里主要是验证函数能正常执行，具体的纠纷处理逻辑在DisputeResolver中测试
    }

    // 测试工作者提交纠纷时未提交工作量证明
    function testFileDisputeByWorkerNoProof() public givenTaskWithMilestones {
        // 工作者未提交工作量证明就尝试提交纠纷应该失败
        vm.prank(worker);
        vm.expectRevert(MilestonePaymentTask.MilestonePaymentTask_NoProofOfWorkSubmitted.selector);
        milestonePaymentTask.fileDisputeByWorker(1, 0);
    }

    // 测试工作者提交纠纷时工作量证明已批准
    function testFileDisputeByWorkerAlreadyApproved() public givenTaskWithApprovedMilestone {
        // 推进时间
        vm.warp(block.timestamp + 4 days);

        // 工作者尝试对已批准的工作量证明提交纠纷应该失败
        vm.prank(worker);
        vm.expectRevert(MilestonePaymentTask.MilestonePaymentTask_ProofAlreadyApproved.selector);
        milestonePaymentTask.fileDisputeByWorker(1, 0);
    }

    // 测试工作者提交纠纷时时间未到
    function testFileDisputeByWorkerTimeNotReached() public givenTaskWithProofOfWork {
        // 推进少量时间但不足以满足纠纷提交的最小时间要求 (需要至少3天)
        vm.warp(block.timestamp + 2 days);

        // 尝试提交纠纷应该失败 (时间未到)
        vm.prank(worker);
        vm.expectRevert(MilestonePaymentTask.MilestonePaymentTask_DisputeSubmissionPeriodNotReached.selector);
        milestonePaymentTask.fileDisputeByWorker(1, 0);
    }

    // 测试onlyTaskWorker修饰符中的错误情况
    function testOnlyTaskWorkerModifier() public givenTaskWithMilestones {
        // 其他用户尝试调用仅工作者可调用的函数应该失败
        vm.prank(otherUser);
        vm.expectRevert(abi.encodeWithSelector(BaseTask.OnlyTaskWorker.selector, otherUser, 1));
        milestonePaymentTask.submitMilestoneProofOfWork(1, 0, "Proof");
    }

    // 测试onlyTaskInProgress修饰符中的错误情况
    function testOnlyTaskInProgressModifier() public {
        // 创建任务
        vm.prank(taskCreator);
        milestonePaymentTask.createTask("Test Task", "Test Description", block.timestamp + 1 days);

        // 添加工作者
        vm.prank(taskCreator);
        milestonePaymentTask.addWorker(1, worker);

        // 完成任务使其状态不是InProgress
        // 添加里程碑
        vm.prank(taskCreator);
        milestonePaymentTask.addMilestone(1, "Milestone 1", MILESTONE_REWARD_1);

        // 提交工作量证明
        vm.prank(worker);
        milestonePaymentTask.submitMilestoneProofOfWork(1, 0, "Proof of work");

        // 批准里程碑
        vm.prank(taskCreator);
        milestonePaymentTask.approveMilestone(1, 0);

        // 支付里程碑
        milestonePaymentTask.payMilestone(1, 0);

        // 完成任务
        milestonePaymentTask.completeTask(1);

        // 工作者尝试调用仅进行中任务可调用的函数应该失败
        vm.prank(worker);
        vm.expectRevert(abi.encodeWithSelector(BaseTask.TaskNotInProgress.selector));
        milestonePaymentTask.submitMilestoneProofOfWork(1, 0, "Proof");
    }

    // 测试InvalidMilestoneIndex修饰符中的错误情况
    function testInvalidMilestoneIndexModifier() public givenTaskWithWorker {
        // 使用无效的里程碑索引调用函数应该失败
        vm.prank(worker);
        vm.expectRevert(MilestonePaymentTask.MilestonePaymentTask_InvalidMilestoneIndex.selector);
        milestonePaymentTask.submitMilestoneProofOfWork(1, 1, "Proof");
    }

    // 测试addWorker函数中已经分配工作者的情况
    function testAddWorkerAlreadyAssigned() public givenTaskCreated {
        // 直接设置任务工作者而不调用addWorker函数
        // 这样可以测试OnlyOneWorkerAllowed错误
        vm.prank(taskCreator);
        milestonePaymentTask.addWorker(1, worker);

        // 手动设置taskWorker映射以模拟已经分配工作者的情况
        // 由于Solidity的限制，我们无法直接在测试中修改私有状态变量
        // 所以这个测试实际上无法触发OnlyOneWorkerAllowed错误

        // 我们改为测试任务不是Open状态时的情况
        address anotherWorker = address(0x4);
        vm.prank(taskCreator);
        vm.expectRevert(abi.encodeWithSelector(MilestonePaymentTask.MilestonePaymentTask_TaskNotOpen.selector, 1));
        milestonePaymentTask.addWorker(1, anotherWorker);
    }

    // 测试addMilestone函数中奖励为0的情况
    function testAddMilestoneZeroReward() public givenTaskWithWorker {
        // 添加奖励为0的里程碑应该失败
        vm.prank(taskCreator);
        vm.expectRevert(BaseTask.RewardMoreThanZero.selector);
        milestonePaymentTask.addMilestone(1, "Milestone 1", 0);
    }

    // 测试submitMilestoneProofOfWork函数中工作量证明已批准的情况
    function testSubmitMilestoneProofOfWorkAlreadyApproved() public givenTaskWithApprovedMilestone {
        // 工作者尝试再次提交工作量证明应该失败
        vm.prank(worker);
        vm.expectRevert(MilestonePaymentTask.MilestonePaymentTask_ProofAlreadyApproved.selector);
        milestonePaymentTask.submitMilestoneProofOfWork(1, 0, "Another proof");
    }

    // 测试terminateTask函数中处理已批准但未支付的里程碑
    function testTerminateTaskWithApprovedUnpaidMilestones() public givenTaskWithApprovedMilestone {
        // 终止任务，此时应该自动支付已批准但未支付的里程碑
        vm.prank(taskCreator);
        milestonePaymentTask.terminateTask(1);

        // 验证任务状态
        (,,, BaseTask.TaskStatus status,,) = milestonePaymentTask.tasks(1);
        assertEq(uint8(status), uint8(BaseTask.TaskStatus.Cancelled));

        // 验证里程碑已支付
        MilestonePaymentTask.Milestone memory milestone = milestonePaymentTask.getMilestone(1, 0);
        assertTrue(milestone.paid);
    }

    // 测试fileDisputeByWorker函数中未定义里程碑的情况
    function testFileDisputeByWorkerNoMilestonesDefined() public givenTaskWithWorker {
        // 工作者尝试提交纠纷但未定义里程碑应该失败
        // 由于InvalidMilestoneIndex修饰符会先检查索引有效性，所以我们需要处理这个错误
        vm.prank(worker);
        vm.expectRevert(MilestonePaymentTask.MilestonePaymentTask_InvalidMilestoneIndex.selector);
        milestonePaymentTask.fileDisputeByWorker(1, 0);
    }
}
