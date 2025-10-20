// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract TaskContract {
    struct Execution {
        address executor;
        uint256 executedAt;
        string result;
        bool isWinner;  // 新增：标记是否被选为最佳提交
    }

    struct Task {
        uint256 id;
        address publisher;
        string title;
        string description;
        uint256 reward;
        bool isCompleted;
        bool isClaimed;
        address worker;
        uint256 createdAt;
        uint256 deadline;
        string taskType;
        string requirements;
        bool rewardPaid;  // 新增：标记奖金是否已支付
    }
    
    mapping(uint256 => Task) public tasks;
    // 新增：每个任务的执行记录列表
    mapping(uint256 => Execution[]) public taskExecutions;
    mapping(address => bool) public workers;
    
    uint256 public taskCounter;
    address public owner;
    
    event TaskCreated(uint256 indexed taskId, address indexed publisher, string title, uint256 reward);
    event TaskClaimed(uint256 indexed taskId, address indexed worker);
    event TaskCompleted(uint256 indexed taskId, address indexed worker, uint256 reward);
    event WorkerRegistered(address indexed worker);
    event ExecutionSubmitted(uint256 indexed taskId, address indexed executor, uint256 executedAt);
    // 新增：选择最佳提交和支付奖金事件
    event WinnerSelected(uint256 indexed taskId, address indexed winner, uint256 executionIndex, uint256 reward);
    event RewardPaid(uint256 indexed taskId, address indexed winner, uint256 amount);
    
    constructor() {
        owner = msg.sender;
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    modifier taskExists(uint256 taskId) {
        require(tasks[taskId].id != 0, "Task does not exist");
        _;
    }
    
    modifier onlyWorker() {
        require(workers[msg.sender], "Worker not registered");
        _;
    }
    
    // 发布任务（不需要提前支付奖金）
    function publishTask(
        string memory _title,
        string memory _description,
        uint256 _deadline,
        string memory _taskType,
        string memory _requirements,
        uint256 _reward,
        address _publisher
    ) public {
        taskCounter++;
        tasks[taskCounter] = Task({
            id: taskCounter,
            publisher: _publisher,
            title: _title,
            description: _description,
            reward: _reward,
            isCompleted: false,
            isClaimed: false,
            worker: address(0),
            createdAt: block.timestamp,
            deadline: _deadline,
            taskType: _taskType,
            requirements: _requirements,
            rewardPaid: false
        });
        
        emit TaskCreated(taskCounter, _publisher, _title, _reward);
    }
    
    // 注册工作者
    function registerWorker() public {
        workers[msg.sender] = true;
        emit WorkerRegistered(msg.sender);
    }
    
    // 领取任务
    function claimTask(uint256 _taskId) public onlyWorker taskExists(_taskId) {
        require(tasks[_taskId].worker == address(0), "Task already claimed");
        require(block.timestamp <= tasks[_taskId].deadline, "Task deadline passed");
        
        tasks[_taskId].worker = msg.sender;
        emit TaskClaimed(_taskId, msg.sender);
    }
    
    // 完成任务（保留：仅标记状态与奖励事件）
    function completeTask(uint256 _taskId) public taskExists(_taskId) {
        require(tasks[_taskId].worker == msg.sender, "Only assigned worker can complete");
        require(!tasks[_taskId].isCompleted, "Task already completed");
        
        tasks[_taskId].isCompleted = true;
        emit TaskCompleted(_taskId, msg.sender, tasks[_taskId].reward);
    }
    
    // 提交执行记录（可多次）
    function submitExecution(uint256 _taskId, address _executor, string calldata _result) public taskExists(_taskId) {
        require(!tasks[_taskId].isCompleted, "Task already completed");
        require(block.timestamp <= tasks[_taskId].deadline, "Task deadline passed");
        
        Execution memory e = Execution({
            executor: _executor,
            executedAt: block.timestamp,
            result: _result,
            isWinner: false
        });
        taskExecutions[_taskId].push(e);
        emit ExecutionSubmitted(_taskId, _executor, e.executedAt);
    }
    
    // 新增：发布者选择最佳提交并直接支付奖金
    function selectWinnerAndPay(uint256 _taskId, uint256 _executionIndex) public payable taskExists(_taskId) {
        Task storage task = tasks[_taskId];
        
        // 验证权限：只有发布者可以选择
        require(msg.sender == task.publisher, "Only publisher can select winner");
        
        // 验证状态
        require(!task.isCompleted, "Task already completed");
        require(!task.rewardPaid, "Reward already paid");
        require(_executionIndex < taskExecutions[_taskId].length, "Invalid execution index");
        
        // 验证发送的金额等于奖励金额
        require(msg.value == task.reward, "Sent value must equal reward amount");
        
        // 获取获胜者
        Execution storage winningExecution = taskExecutions[_taskId][_executionIndex];
        address winner = winningExecution.executor;
        
        // 标记状态
        winningExecution.isWinner = true;
        task.isCompleted = true;
        task.rewardPaid = true;
        task.worker = winner;  // 记录最终获胜者
        
        // 直接转账给获胜者
        uint256 rewardAmount = msg.value;
        if (rewardAmount > 0) {
            (bool success, ) = payable(winner).call{value: rewardAmount}("");
            require(success, "Payment failed");
            emit RewardPaid(_taskId, winner, rewardAmount);
        }
        
        emit WinnerSelected(_taskId, winner, _executionIndex, rewardAmount);
        emit TaskCompleted(_taskId, winner, rewardAmount);
    }

    // 获取任务信息
    function getTask(uint256 _taskId) public view taskExists(_taskId) returns (Task memory) {
        return tasks[_taskId];
    }

    // 获取任务的执行数量
    function getExecutionCount(uint256 _taskId) public view taskExists(_taskId) returns (uint256) {
        return taskExecutions[_taskId].length;
    }

    // 获取任务的某条执行详情
    function getExecution(uint256 _taskId, uint256 _index) public view taskExists(_taskId) returns (Execution memory) {
        require(_index < taskExecutions[_taskId].length, "Execution index out of range");
        return taskExecutions[_taskId][_index];
    }
    
    // 新增：获取任务的所有执行记录
    function getAllExecutions(uint256 _taskId) public view taskExists(_taskId) returns (Execution[] memory) {
        return taskExecutions[_taskId];
    }
    
    // 新增：获取合约余额
    function getContractBalance() public view returns (uint256) {
        return address(this).balance;
    }
    
    // 新增：获取任务已锁定的奖金
    function getTaskLockedReward(uint256 _taskId) public view taskExists(_taskId) returns (uint256) {
        if (tasks[_taskId].rewardPaid) {
            return 0;
        }
        return tasks[_taskId].reward;
    }
}