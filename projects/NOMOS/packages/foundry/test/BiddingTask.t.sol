// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "forge-std/Test.sol";
import "../contracts/task/BiddingTask.sol";
import "../contracts/TaskToken.sol";
import "../contracts/task/DisputeResolver.sol";
import "../contracts/SoulboundUserNFT.sol";
import "../contracts/interfaces/ISoulboundUserNFT.sol";
import "../contracts/interfaces/IDisputeResolver.sol";

contract BiddingTaskTest is Test {
    BiddingTask public biddingTask;
    TaskToken public taskToken;
    DisputeResolver public disputeResolver;
    SoulboundUserNFT public soulboundUserNFT;

    address public owner;
    address public taskCreator;
    address public worker1;
    address public worker2;
    address public otherUser;

    uint256 public constant BID_AMOUNT_1 = 100 * 10 ** 18;
    uint256 public constant BID_AMOUNT_2 = 80 * 10 ** 18;
    uint256 public constant ADMIN_STAKE_AMOUNT = 1000 * 10 ** 18;

    // Modifiers to reduce code duplication
    modifier givenTaskCreated() {
        vm.prank(taskCreator);
        biddingTask.createTask("Test Bidding Task", "Test Description", block.timestamp + 1 days);
        _;
    }

    modifier givenTaskWithBid() {
        vm.prank(taskCreator);
        biddingTask.createTask("Test Bidding Task", "Test Description", block.timestamp + 1 days);

        vm.prank(worker1);
        biddingTask.submitBid(1, BID_AMOUNT_1, "Bid description 1", 2 days);
        _;
    }

    modifier givenTaskWithAcceptedBid() {
        vm.prank(taskCreator);
        biddingTask.createTask("Test Bidding Task", "Test Description", block.timestamp + 1 days);

        vm.prank(worker1);
        biddingTask.submitBid(1, BID_AMOUNT_1, "Bid description 1", 2 days);

        vm.prank(taskCreator);
        biddingTask.acceptBid(1, 0);
        _;
    }

    modifier givenTaskWithProofOfWork() {
        vm.prank(taskCreator);
        biddingTask.createTask("Test Bidding Task", "Test Description", block.timestamp + 1 days);

        vm.prank(worker1);
        biddingTask.submitBid(1, BID_AMOUNT_1, "Bid description 1", 2 days);

        vm.prank(taskCreator);
        biddingTask.acceptBid(1, 0);

        vm.prank(worker1);
        biddingTask.submitProofOfWork(1, "This is my proof of work");
        _;
    }

    modifier givenTaskWithApprovedProofOfWork() {
        vm.prank(taskCreator);
        biddingTask.createTask("Test Bidding Task", "Test Description", block.timestamp + 1 days);

        vm.prank(worker1);
        biddingTask.submitBid(1, BID_AMOUNT_1, "Bid description 1", 2 days);

        vm.prank(taskCreator);
        biddingTask.acceptBid(1, 0);

        vm.prank(worker1);
        biddingTask.submitProofOfWork(1, "This is my proof of work");

        vm.prank(taskCreator);
        biddingTask.approveProofOfWork(1);
        _;
    }

    function setUp() public {
        owner = address(this);
        taskCreator = address(0x1);
        worker1 = address(0x2);
        worker2 = address(0x3);
        otherUser = address(0x4);

        // 部署TaskToken合约
        taskToken = new TaskToken("Task Token", "TASK", 18);

        // 为用户铸造代币
        taskToken.mint(taskCreator, BID_AMOUNT_1 * 10);
        taskToken.mint(worker1, ADMIN_STAKE_AMOUNT);
        taskToken.mint(worker2, ADMIN_STAKE_AMOUNT);
        taskToken.mint(otherUser, BID_AMOUNT_1);

        // 部署SoulboundUserNFT合约
        soulboundUserNFT = new SoulboundUserNFT("Test User NFT", "TUN");

        // 部署DisputeResolver合约
        disputeResolver = new DisputeResolver(taskToken, ISoulboundUserNFT(address(soulboundUserNFT)));

        // 部署BiddingTask合约
        biddingTask = new BiddingTask(taskToken, IDisputeResolver(address(disputeResolver)));

        // 设置授权
        vm.prank(taskCreator);
        taskToken.approve(address(biddingTask), BID_AMOUNT_1 * 10);

        vm.prank(worker1);
        taskToken.approve(address(disputeResolver), ADMIN_STAKE_AMOUNT);
        taskToken.approve(address(biddingTask), ADMIN_STAKE_AMOUNT);

        vm.prank(worker2);
        taskToken.approve(address(disputeResolver), ADMIN_STAKE_AMOUNT);
        taskToken.approve(address(biddingTask), ADMIN_STAKE_AMOUNT);

        vm.prank(otherUser);
        taskToken.approve(address(biddingTask), BID_AMOUNT_1);
    }

    // 测试合约部署
    function testDeployment() public view {
        assertEq(biddingTask.owner(), owner);
        assertEq(address(biddingTask.taskToken()), address(taskToken));
        assertEq(address(biddingTask.disputeResolver()), address(disputeResolver));
    }

    // 测试创建任务
    function testCreateTask() public givenTaskCreated {
        (uint256 id, uint256 totalreward, uint256 deadline, BaseTask.TaskStatus status, address creator,) =
            biddingTask.tasks(1);

        assertEq(id, 1);
        assertEq(creator, taskCreator);
        assertEq(totalreward, 0);
        assertEq(deadline, block.timestamp + 1 days);
        assertEq(uint8(status), uint8(BaseTask.TaskStatus.Open));
        assertEq(biddingTask.taskCounter(), 1);
    }

    // 测试创建任务时截止时间无效
    function testCreateTaskInvalidDeadline() public {
        // 设置一个确定的区块时间戳
        vm.warp(1000000);

        vm.prank(taskCreator);
        vm.expectRevert(BaseTask.InvalidDeadline.selector);
        biddingTask.createTask("Test Bidding Task", "Test Description", block.timestamp - 1 hours);
    }

    // 测试提交竞标
    function testSubmitBid() public givenTaskCreated {
        // 工作者1提交竞标
        vm.prank(worker1);
        biddingTask.submitBid(1, BID_AMOUNT_1, "Bid description 1", 2 days);

        // 验证竞标已提交
        BiddingTask.Bid memory bid1 = biddingTask.getBid(1, 0);
        assertEq(bid1.bidder, worker1);
        assertEq(bid1.amount, BID_AMOUNT_1);
        // 注意：描述存储在事件中，不在Bid结构体中
        assertEq(bid1.estimatedTime, 2 days);

        // 通过getBid函数检查竞标数量
        vm.expectRevert(BiddingTask.BiddingTask_InvalidBidIndex.selector);
        biddingTask.getBid(1, 1); // 尝试获取第二个竞标应该失败，说明只有一个竞标

        BiddingTask.Bid memory bid = biddingTask.getBid(1, 0);
        assertEq(bid.bidder, worker1);
        assertEq(bid.amount, BID_AMOUNT_1);
        assertEq(bid.estimatedTime, 2 days);
    }

    // 测试提交竞标时任务不是开放状态
    function testSubmitBidTaskNotOpen() public givenTaskWithBid {
        // 任务创建者接受竞标
        vm.prank(taskCreator);
        biddingTask.acceptBid(1, 0);

        // 另一个工作者尝试提交竞标应该失败
        vm.prank(worker2);
        vm.expectRevert(BiddingTask.BiddingTask_TaskNotOpen.selector);
        biddingTask.submitBid(1, BID_AMOUNT_2, "Bid description 2", 1 days);
    }

    // 测试提交竞标时金额为0
    function testSubmitBidInvalidAmount() public givenTaskCreated {
        // 工作者提交金额为0的竞标应该失败
        vm.prank(worker1);
        vm.expectRevert(BiddingTask.BiddingTask_InvalidBidAmount.selector);
        biddingTask.submitBid(1, 0, "Bid description 1", 2 days);
    }

    // 测试提交竞标时描述为空
    function testSubmitBidEmptyDescription() public givenTaskCreated {
        // 工作者提交描述为空的竞标应该失败
        vm.prank(worker1);
        vm.expectRevert(BiddingTask.BiddingTask_BidDescriptionEmpty.selector);
        biddingTask.submitBid(1, BID_AMOUNT_1, "", 2 days);
    }

    // 测试任务创建者接受竞标
    function testAcceptBid() public {
        // 先创建任务
        vm.prank(taskCreator);
        biddingTask.createTask("Test Bidding Task", "Test Description", block.timestamp + 1 days);

        // 工作者1提交竞标
        vm.prank(worker1);
        biddingTask.submitBid(1, BID_AMOUNT_1, "Bid description 1", 2 days);

        // 工作者2提交竞标
        vm.prank(worker2);
        biddingTask.submitBid(1, BID_AMOUNT_2, "Bid description 2", 1 days);

        // 任务创建者接受工作者2的竞标
        vm.prank(taskCreator);
        biddingTask.acceptBid(1, 1);

        // 验证任务状态
        (
            uint256 taskId,
            uint256 reward,
            uint256 deadline,
            BaseTask.TaskStatus status,
            address taskCreatorAddr,
            address worker
        ) = biddingTask.tasks(1);

        assertEq(taskId, 1);
        assertEq(taskCreatorAddr, taskCreator);
        assertEq(reward, BID_AMOUNT_2);
        assertEq(uint8(status), uint8(BaseTask.TaskStatus.InProgress));
        assertEq(worker, worker2);
        assertEq(taskToken.balanceOf(address(biddingTask)), BID_AMOUNT_2);
        assertEq(deadline, block.timestamp + 1 days);
    }

    // 测试非任务创建者接受竞标
    function testAcceptBidOnlyTaskCreator() public givenTaskWithBid {
        // 其他用户尝试接受竞标应该失败
        vm.prank(otherUser);
        vm.expectRevert(abi.encodeWithSelector(BaseTask.OnlyTaskCreator.selector, otherUser, 1));
        biddingTask.acceptBid(1, 0);
    }

    // 测试接受无效竞标索引
    function testAcceptBidInvalidIndex() public givenTaskCreated {
        // 任务创建者尝试接受不存在的竞标应该失败
        vm.prank(taskCreator);
        vm.expectRevert(BiddingTask.BiddingTask_InvalidBidIndex.selector);
        biddingTask.acceptBid(1, 0);
    }

    // 测试提交工作量证明
    function testSubmitProofOfWork() public givenTaskWithAcceptedBid {
        // 工作者提交工作量证明
        vm.prank(worker1);
        biddingTask.submitProofOfWork(1, "This is my proof of work");

        // 验证工作量证明已提交
        (bool submitted, bool approved, uint256 submittedAt, string memory proof) = biddingTask.taskWorkProof(1);

        assertEq(proof, "This is my proof of work");
        assertTrue(submitted);
        assertFalse(approved);
        assertGt(submittedAt, 0);
    }

    // 测试非工作者提交工作量证明
    function testSubmitProofOfWorkOnlyWorker() public givenTaskWithAcceptedBid {
        // 其他用户尝试提交工作量证明应该失败
        vm.prank(otherUser);
        vm.expectRevert(abi.encodeWithSelector(BaseTask.OnlyTaskWorker.selector, otherUser, 1));
        biddingTask.submitProofOfWork(1, "This is my proof of work");
    }

    // 测试提交空工作量证明
    function testSubmitProofOfWorkEmpty() public givenTaskWithAcceptedBid {
        // 工作者尝试提交空的工作量证明应该失败
        vm.prank(worker1);
        vm.expectRevert(BiddingTask.BiddingTask_ProofOfWorkEmpty.selector);
        biddingTask.submitProofOfWork(1, "");
    }

    // 测试验证工作量证明
    function testApproveProofOfWork() public givenTaskWithProofOfWork {
        // 任务创建者验证工作量证明
        vm.prank(taskCreator);
        biddingTask.approveProofOfWork(1);

        // 验证工作量证明已批准，任务状态已更新
        (bool submitted, bool approved, uint256 submittedAt, string memory proof) = biddingTask.taskWorkProof(1);
        assertEq(proof, "This is my proof of work");
        assertTrue(submitted);
        assertTrue(approved);
        assertGt(submittedAt, 0);

        (,,, BaseTask.TaskStatus status,,) = biddingTask.tasks(1);
        assertEq(uint8(status), uint8(BaseTask.TaskStatus.Completed));
    }

    // 测试支付任务
    function testPayTask() public givenTaskWithApprovedProofOfWork {
        uint256 initialWorkerBalance = taskToken.balanceOf(worker1);
        uint256 initialPlatformRevenue = biddingTask.totalPlatformRevenue();

        // 工作者支付任务
        vm.prank(worker1);
        biddingTask.payTask(1);

        // 验证任务状态已更新
        (,,, BaseTask.TaskStatus status,,) = biddingTask.tasks(1);
        assertEq(uint8(status), uint8(BaseTask.TaskStatus.Paid));

        // 验证资金已正确分配
        uint256 platformFee = (BID_AMOUNT_1 * 100) / 10000; // 1% 平台费用
        uint256 workerPayment = BID_AMOUNT_1 - platformFee;

        assertEq(taskToken.balanceOf(worker1), initialWorkerBalance + workerPayment);
        assertEq(biddingTask.totalPlatformRevenue(), initialPlatformRevenue + platformFee);
    }

    // 测试终止开放状态的任务
    function testTerminateTaskOpen() public givenTaskCreated {
        // 任务创建者终止任务
        vm.prank(taskCreator);
        biddingTask.terminateTask(1);

        // 验证任务状态已更新
        (,,, BaseTask.TaskStatus status,,) = biddingTask.tasks(1);
        assertEq(uint8(status), uint8(BaseTask.TaskStatus.Cancelled));
    }

    // 测试终止进行中的任务
    function testTerminateTaskInProgress() public givenTaskWithAcceptedBid {
        // 任务创建者终止任务
        vm.prank(taskCreator);
        biddingTask.terminateTask(1);

        // 验证任务状态已更新
        (,,, BaseTask.TaskStatus status,,) = biddingTask.tasks(1);
        assertEq(uint8(status), uint8(BaseTask.TaskStatus.Cancelled));
    }

    // 测试提交纠纷
    function testFileDisputeByWorker() public givenTaskWithProofOfWork {
        // 推进时间以满足纠纷提交的最小时间要求 (3天)
        vm.warp(block.timestamp + 4 days);

        // 计算纠纷处理费用: rewardAmount * disputeProcessingRewardBps / DenominatorFee
        // disputeProcessingRewardBps = 50 (0.5%)
        // DenominatorFee = 10000
        uint256 disputeProcessingFee = (BID_AMOUNT_1 * 50) / 10000;

        // 确保worker1有足够的代币支付纠纷处理费用
        vm.prank(owner);
        taskToken.mint(worker1, disputeProcessingFee);

        vm.prank(worker1);
        taskToken.approve(address(biddingTask), disputeProcessingFee);

        // 工作者提交纠纷
        vm.prank(worker1);
        biddingTask.fileDisputeByWorker(1);

        // 验证纠纷已提交
        // 这里主要是验证函数能正常执行，具体的纠纷处理逻辑在DisputeResolver中测试
    }

    // 测试提交纠纷时未提交工作量证明
    function testFileDisputeByWorkerNoProof() public givenTaskWithAcceptedBid {
        // 工作者未提交工作量证明就尝试提交纠纷应该失败
        vm.prank(worker1);
        vm.expectRevert(BiddingTask.BiddingTask_NoProofOfWorkSubmitted.selector);
        biddingTask.fileDisputeByWorker(1);
    }

    // 测试提交纠纷时时间未到
    function testFileDisputeByWorkerTimeNotReached() public givenTaskWithProofOfWork {
        // 未推进足够时间就尝试提交纠纷应该失败 (需要至少3天)
        vm.prank(worker1);
        vm.expectRevert(BiddingTask.BiddingTask_DisputeTimeNotReached.selector);
        biddingTask.fileDisputeByWorker(1);
    }

    // 测试提交工作量证明时没有分配的工作者
    function testSubmitProofOfWorkNoAssignedWorker() public givenTaskCreated {
        // 在没有分配工作者的情况下尝试提交工作量证明应该失败
        vm.prank(worker1);
        vm.expectRevert(abi.encodeWithSelector(BaseTask.OnlyTaskWorker.selector, worker1, 1));
        biddingTask.submitProofOfWork(1, "This is my proof of work");
    }

    // 测试提交工作量证明时任务状态不是进行中
    function testSubmitProofOfWorkTaskNotInProgress() public {
        // 创建任务
        vm.prank(taskCreator);
        biddingTask.createTask("Test Bidding Task", "Test Description", block.timestamp + 1 days);

        // 工作者提交竞标
        vm.prank(worker1);
        biddingTask.submitBid(1, BID_AMOUNT_1, "Bid description 1", 2 days);

        // 任务创建者接受竞标
        vm.prank(taskCreator);
        biddingTask.acceptBid(1, 0);

        // 任务创建者终止任务
        vm.prank(taskCreator);
        biddingTask.terminateTask(1);

        // 工作者尝试提交工作量证明应该失败
        vm.prank(worker1);
        vm.expectRevert(BaseTask.TaskNotInProgress.selector);
        biddingTask.submitProofOfWork(1, "This is my proof of work");
    }

    // 测试批准工作量证明时未提交工作量证明
    function testApproveProofOfWorkNotSubmitted() public givenTaskWithAcceptedBid {
        // 尝试批准未提交的工作量证明应该失败
        vm.prank(taskCreator);
        vm.expectRevert(BiddingTask.BiddingTask_ProofNotSubmitted.selector);
        biddingTask.approveProofOfWork(1);
    }

    // 测试获取无效索引的竞标信息
    function testGetBidInvalidIndex() public givenTaskWithBid {
        // 尝试获取无效索引的竞标信息应该失败
        vm.prank(taskCreator);
        vm.expectRevert(BiddingTask.BiddingTask_InvalidBidIndex.selector);
        biddingTask.getBid(1, 5); // 无效索引
    }

    // 测试在任务截止时间后提交竞标
    function testSubmitBidAfterDeadline() public givenTaskCreated {
        // 推进时间超过截止时间
        vm.warp(block.timestamp + 2 days);

        // 工作者尝试提交竞标应该失败
        vm.prank(worker1);
        vm.expectRevert(BiddingTask.BiddingTask_TaskDeadlinePassed.selector);
        biddingTask.submitBid(1, BID_AMOUNT_1, "Bid description 1", 2 days);
    }

    // 测试接受竞标时任务不是开放状态
    function testAcceptBidTaskNotOpen() public givenTaskWithBid {
        // 任务创建者接受竞标
        vm.prank(taskCreator);
        biddingTask.acceptBid(1, 0);

        // 再次尝试接受竞标应该失败，因为任务状态已改变
        vm.prank(taskCreator);
        vm.expectRevert(BiddingTask.BiddingTask_TaskNotOpen.selector);
        biddingTask.acceptBid(1, 0);
    }

    // 测试提交工作量证明时任务已截止
    function testSubmitProofOfWorkAfterDeadline() public givenTaskWithAcceptedBid {
        // 推进时间超过截止时间
        vm.warp(block.timestamp + 2 days);

        // 工作者尝试提交工作量证明应该失败
        vm.prank(worker1);
        vm.expectRevert(BiddingTask.BiddingTask_TaskDeadlinePassed.selector);
        biddingTask.submitProofOfWork(1, "This is my proof of work");
    }

    // 测试验证已批准的工作量证明
    function testApproveAlreadyApprovedProofOfWork() public givenTaskWithApprovedProofOfWork {
        // 再次尝试验证已批准的工作量证明应该失败
        vm.prank(taskCreator);
        vm.expectRevert(BaseTask.TaskNotInProgress.selector);
        biddingTask.approveProofOfWork(1);
    }

    // 测试工作者在提交纠纷前时间不足
    function testFileDisputeByWorkerInsufficientTime() public givenTaskWithProofOfWork {
        // 仅推进1天时间（不足3天）
        vm.warp(block.timestamp + 1 days);

        // 工作者尝试提交纠纷应该失败
        vm.prank(worker1);
        vm.expectRevert(BiddingTask.BiddingTask_DisputeTimeNotReached.selector);
        biddingTask.fileDisputeByWorker(1);
    }

    // 测试工作者提交纠纷时工作量证明已批准
    function testFileDisputeByWorkerApprovedProof() public givenTaskWithApprovedProofOfWork {
        // 推进足够时间
        vm.warp(block.timestamp + 4 days);

        // 工作者尝试提交纠纷应该失败，因为工作量证明已批准
        vm.prank(worker1);
        vm.expectRevert(BaseTask.TaskNotInProgress.selector);
        biddingTask.fileDisputeByWorker(1);
    }

    // 测试终止已支付的任务
    /// @dev 测试当任务已经支付时尝试终止任务的情况
    function testTerminateTaskPaid() public {
        // 创建任务
        createBasicTaskAndApproveBid();

        // 工作者提交工作量证明
        vm.prank(worker1);
        biddingTask.submitProofOfWork(1, "This is my proof of work");

        // 任务创建者验证工作量证明
        vm.prank(taskCreator);
        biddingTask.approveProofOfWork(1);

        // 工作者支付任务
        vm.prank(worker1);
        biddingTask.payTask(1);

        // 尝试终止已支付的任务应该失败
        vm.prank(taskCreator);
        vm.expectRevert(BiddingTask.BiddingTask_TaskCannotBeCancelled.selector);
        biddingTask.terminateTask(1);
    }

    // 测试终止已取消的任务
    /// @dev 测试当任务已经取消时再次尝试终止任务的情况
    function testTerminateTaskCancelled() public givenTaskCreated {
        // 任务创建者终止任务
        vm.prank(taskCreator);
        biddingTask.terminateTask(1);

        // 尝试再次终止已取消的任务应该失败
        vm.prank(taskCreator);
        vm.expectRevert(BiddingTask.BiddingTask_TaskCannotBeCancelled.selector);
        biddingTask.terminateTask(1);
    }

    // 测试在任务创建者终止任务时没有分配工作者的情况
    function testTerminateTaskWithoutAssignedWorker() public givenTaskCreated {
        // 任务创建者终止任务（没有分配工作者）
        vm.prank(taskCreator);
        biddingTask.terminateTask(1);

        // 验证任务状态为已取消
        (,,, BaseTask.TaskStatus status,,) = biddingTask.tasks(1);
        assertEq(uint8(status), uint8(BaseTask.TaskStatus.Cancelled));
    }

    // 测试在任务创建者终止任务时工作者已提交工作量证明的情况
    function testTerminateTaskWithSubmittedProofOfWork() public {
        // 创建任务
        vm.prank(taskCreator);
        biddingTask.createTask("Test Bidding Task", "Test Description", block.timestamp + 10 days);

        // 工作者提交竞标
        vm.prank(worker1);
        biddingTask.submitBid(1, BID_AMOUNT_1, "Bid description 1", 2 days);

        // 任务创建者接受竞标
        vm.prank(taskCreator);
        biddingTask.acceptBid(1, 0);

        // 工作者提交工作量证明
        vm.prank(worker1);
        biddingTask.submitProofOfWork(1, "This is my proof of work");

        // 推进时间
        vm.warp(block.timestamp + 4 days);

        // 任务创建者终止任务
        vm.prank(taskCreator);
        biddingTask.terminateTask(1);

        // 验证是否触发了纠纷提交
        // 这里我们验证任务状态为已取消，但实际应该触发纠纷
        // 在当前实现中，terminateTask函数会直接提交纠纷
        (,,, BaseTask.TaskStatus status,,) = biddingTask.tasks(1);
        assertEq(uint8(status), uint8(BaseTask.TaskStatus.Cancelled));
    }

    // 测试提交已批准的工作量证明
    function testSubmitProofOfWorkAlreadyApproved() public givenTaskWithApprovedProofOfWork {
        // 工作者尝试再次提交工作量证明应该失败，因为任务状态已不是InProgress
        vm.prank(worker1);
        vm.expectRevert(BaseTask.TaskNotInProgress.selector);
        biddingTask.submitProofOfWork(1, "This is another proof of work");
    }

    // 测试批准未提交的工作量证明（新版本）
    function testApproveProofOfWorkNotSubmittedNew() public givenTaskWithAcceptedBid {
        // 任务创建者尝试批准未提交的工作量证明应该失败
        vm.prank(taskCreator);
        vm.expectRevert(BiddingTask.BiddingTask_ProofNotSubmitted.selector);
        biddingTask.approveProofOfWork(1);
    }

    // 测试终止任务时工作者地址为0的情况
    function testTerminateTaskWithZeroWorkerAddress() public {
        // 创建任务
        vm.prank(taskCreator);
        biddingTask.createTask("Test Bidding Task", "Test Description", block.timestamp + 1 days);

        // 工作者提交竞标
        vm.prank(worker1);
        biddingTask.submitBid(1, BID_AMOUNT_1, "Bid description 1", 2 days);

        // 任务创建者接受竞标
        vm.prank(taskCreator);
        biddingTask.acceptBid(1, 0);

        // 任务创建者终止任务
        vm.prank(taskCreator);
        biddingTask.terminateTask(1);

        // 验证任务状态为已取消
        (,,, BaseTask.TaskStatus status,,) = biddingTask.tasks(1);
        assertEq(uint8(status), uint8(BaseTask.TaskStatus.Cancelled));
    }

    // 测试工作者提交纠纷时工作量证明已批准的情况（新版本）
    function testFileDisputeByWorkerApprovedProofNew() public givenTaskWithApprovedProofOfWork {
        // 推进足够时间
        vm.warp(block.timestamp + 4 days);

        // 工作者尝试提交纠纷应该失败，因为任务状态已不是InProgress
        vm.prank(worker1);
        vm.expectRevert(BaseTask.TaskNotInProgress.selector);
        biddingTask.fileDisputeByWorker(1);
    }

    // 测试terminateTask中worker != address(0)条件为false的情况
    function testTerminateTaskWithZeroWorker() public givenTaskCreated {
        // 任务创建者终止任务，此时没有分配工作者
        vm.prank(taskCreator);
        biddingTask.terminateTask(1);

        // 验证任务状态为已取消
        (,,, BaseTask.TaskStatus status,,) = biddingTask.tasks(1);
        assertEq(uint8(status), uint8(BaseTask.TaskStatus.Cancelled));
    }

    // 测试terminateTask中proof.submitted为false的情况
    function testTerminateTaskWithoutProofSubmitted() public {
        // 创建任务
        vm.prank(taskCreator);
        biddingTask.createTask("Test Bidding Task", "Test Description", block.timestamp + 1 days);

        // 工作者提交竞标
        vm.prank(worker1);
        biddingTask.submitBid(1, BID_AMOUNT_1, "Bid description 1", 2 days);

        // 任务创建者接受竞标
        vm.prank(taskCreator);
        biddingTask.acceptBid(1, 0);

        // 此时工作者尚未提交工作量证明，任务创建者终止任务
        vm.prank(taskCreator);
        biddingTask.terminateTask(1);

        // 验证任务状态为已取消
        (,,, BaseTask.TaskStatus status,,) = biddingTask.tasks(1);
        assertEq(uint8(status), uint8(BaseTask.TaskStatus.Cancelled));
    }

    // 测试payTask任务未完成的情况
    function testPayTaskNotCompleted() public givenTaskWithAcceptedBid {
        // 工作者尝试支付未完成的任务应该失败
        vm.prank(worker1);
        vm.expectRevert(BiddingTask.BiddingTask_TaskNotCompleted.selector);
        biddingTask.payTask(1);
    }

    // 创建基本任务并批准竞标
    /// @dev 创建一个基本任务并让工作者提交竞标，任务创建者接受竞标
    function createBasicTaskAndApproveBid() internal {
        vm.prank(taskCreator);
        biddingTask.createTask("Test Bidding Task", "Test Description", block.timestamp + 1 days);

        // 工作者提交竞标
        vm.prank(worker1);
        biddingTask.submitBid(1, BID_AMOUNT_1, "Bid description 1", 2 days);

        // 任务创建者接受竞标
        vm.prank(taskCreator);
        biddingTask.acceptBid(1, 0);
    }
}
