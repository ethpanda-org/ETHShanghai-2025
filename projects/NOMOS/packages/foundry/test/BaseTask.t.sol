// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "forge-std/Test.sol";
import "../contracts/task/BaseTask.sol";
import "../contracts/TaskToken.sol";
import "../contracts/task/DisputeResolver.sol";
import "../contracts/SoulboundUserNFT.sol";
import "../contracts/interfaces/ISoulboundUserNFT.sol";
import "../contracts/interfaces/IDisputeResolver.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

// 创建一个简单的实现合约来测试BaseTask的抽象功能
contract TestBaseTask is BaseTask {
    using SafeERC20 for IERC20;

    // 添加任务的标题和描述存储
    mapping(uint256 => string) public taskTitles;
    mapping(uint256 => string) public taskDescriptions;
    mapping(uint256 => uint256) public taskCreatedAt;

    constructor(IERC20 _taskToken, IDisputeResolver _disputeResolver) BaseTask(_taskToken, _disputeResolver) { }

    function createTask(string calldata _title, string calldata _description, uint256 _deadline) public override {
        taskCounter++;
        Task storage newTask = tasks[taskCounter];
        newTask.id = taskCounter;
        newTask.creator = msg.sender;
        newTask.deadline = _deadline;
        newTask.status = TaskStatus.Open;

        taskTitles[taskCounter] = _title;
        taskDescriptions[taskCounter] = _description;
        taskCreatedAt[taskCounter] = block.timestamp;
    }

    function terminateTask(uint256 _taskId) public override {
        Task storage task = tasks[_taskId];
        task.status = TaskStatus.Cancelled;
    }
}

contract BaseTaskTest is Test {
    TestBaseTask public baseTask;
    TaskToken public taskToken;
    DisputeResolver public disputeResolver;
    SoulboundUserNFT public soulboundUserNFT;

    address public owner;
    address public taskCreator;
    address public worker;

    uint256 public constant PLATFORM_FEE = 100; // 1%
    uint256 public constant REWARD_AMOUNT = 1000 * 10 ** 18;

    function setUp() public {
        owner = address(this);
        taskCreator = address(0x1);
        worker = address(0x2);

        // 部署TaskToken合约
        taskToken = new TaskToken("Task Token", "TASK", 18);

        // 为用户铸造代币
        taskToken.mint(taskCreator, REWARD_AMOUNT * 10);

        // 部署SoulboundUserNFT合约
        soulboundUserNFT = new SoulboundUserNFT("Test User NFT", "TUN");

        // 部署DisputeResolver合约
        disputeResolver = new DisputeResolver(taskToken, ISoulboundUserNFT(address(soulboundUserNFT)));

        // 部署BaseTask合约
        baseTask = new TestBaseTask(taskToken, IDisputeResolver(address(disputeResolver)));
    }

    // 测试合约部署
    function testDeployment() public view {
        assertEq(baseTask.owner(), owner);
        assertEq(address(baseTask.taskToken()), address(taskToken));
        assertEq(address(baseTask.disputeResolver()), address(disputeResolver));
        assertEq(baseTask.platformFee(), PLATFORM_FEE);
    }

    // 测试创建任务
    function testCreateTask() public {
        vm.prank(taskCreator);
        baseTask.createTask("Test Task", "Test Description", block.timestamp + 1 days);

        // 从映射中获取任务信息
        BaseTask.Task memory task = baseTask.getTask(1);

        assertEq(task.id, 1);
        assertEq(task.creator, taskCreator);
        assertEq(baseTask.taskTitles(1), "Test Task");
        assertEq(baseTask.taskDescriptions(1), "Test Description");
        assertEq(task.totalreward, 0);
        assertEq(task.deadline, block.timestamp + 1 days);
        assertEq(uint8(task.status), uint8(BaseTask.TaskStatus.Open));
        assertGt(baseTask.taskCreatedAt(1), 0);
        assertEq(baseTask.taskCounter(), 1);
    }

    // 测试更新平台费用
    function testUpdatePlatformFee() public {
        // 只有所有者可以更新平台费用
        vm.prank(owner);
        baseTask.updatePlatformFee(200); // 2%

        assertEq(baseTask.platformFee(), 200);
    }

    // 测试更新平台费用过高
    function testUpdatePlatformFeeTooHigh() public {
        // 尝试设置过高的费用应该失败
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(BaseTask.FeeTooHigh.selector, 1001));
        baseTask.updatePlatformFee(1001); // 超过10%应该失败
    }

    // 测试非所有者更新平台费用
    function testUpdatePlatformFeeOnlyOwner() public {
        address notOwner = address(0x3);
        vm.prank(notOwner);
        vm.expectRevert();
        baseTask.updatePlatformFee(200);
    }

    // 测试暂停和恢复合约
    function testPauseUnpause() public {
        // 只有所有者可以暂停合约
        vm.prank(owner);
        baseTask.pause();

        assertTrue(baseTask.paused());

        // 只有所有者可以恢复合约
        vm.prank(owner);
        baseTask.unpause();

        assertFalse(baseTask.paused());
    }

    // 测试非所有者暂停合约
    function testPauseOnlyOwner() public {
        address notOwner = address(0x3);
        vm.prank(notOwner);
        vm.expectRevert();
        baseTask.pause();
    }

    // 测试提取平台收入
    function testWithdrawPlatformRevenue() public {
        // 设置一些平台收入
        vm.prank(owner);
        baseTask.updatePlatformFee(100); // 1%

        // 由于BaseTask是抽象合约，我们无法直接测试完整的收入流程
        // 这里只是验证函数的基本逻辑
        vm.expectRevert(BaseTask.NoRevenueToWithdraw.selector);
        vm.prank(owner);
        baseTask.withdrawPlatformRevenue();
    }

    // 测试修改截止时间
    function testChangeDeadline() public {
        // 创建任务
        vm.prank(taskCreator);
        baseTask.createTask("Test Task", "Test Description", block.timestamp + 1 days);

        // 任务创建者修改截止时间
        vm.prank(taskCreator);
        baseTask.changedeadline(1, block.timestamp + 2 days);

        BaseTask.Task memory task = baseTask.getTask(1);
        assertEq(task.deadline, block.timestamp + 2 days);
    }

    // 测试修改截止时间为更早的时间
    function testChangeDeadlineInvalid() public {
        // 创建任务
        vm.prank(taskCreator);
        baseTask.createTask("Test Task", "Test Description", block.timestamp + 1 days);

        // 尝试将截止时间修改为更早的时间应该失败
        vm.prank(taskCreator);
        vm.expectRevert(BaseTask.InvalidDeadline.selector);
        baseTask.changedeadline(1, block.timestamp);
    }

    // 测试非任务创建者修改截止时间
    function testChangeDeadlineOnlyTaskCreator() public {
        // 创建任务
        vm.prank(taskCreator);
        baseTask.createTask("Test Task", "Test Description", block.timestamp + 1 days);

        // 非任务创建者尝试修改截止时间应该失败
        address notCreator = address(0x3);
        vm.prank(notCreator);
        vm.expectRevert(abi.encodeWithSelector(BaseTask.OnlyTaskCreator.selector, notCreator, 1));
        baseTask.changedeadline(1, block.timestamp + 2 days);
    }

    // 测试获取任务详情
    function testGetTask() public {
        // 创建任务
        vm.prank(taskCreator);
        baseTask.createTask("Test Task", "Test Description", block.timestamp + 1 days);

        BaseTask.Task memory task = baseTask.getTask(1);

        assertEq(task.id, 1);
        assertEq(task.creator, taskCreator);
        assertEq(task.totalreward, 0);
        assertEq(task.deadline, block.timestamp + 1 days);
        assertEq(uint8(task.status), uint8(BaseTask.TaskStatus.Open));
    }
}
