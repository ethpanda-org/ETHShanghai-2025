// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title TaskContract
 * @dev 去中心化任务管理智能合约
 * @author FlowPay Team
 */
contract TaskContract {
    // 任务结构体
    struct Task {
        string title;           // 任务标题
        string description;     // 任务描述
        uint256 deadline;       // 截止时间
        string taskType;        // 任务类型
        string requirements;    // 任务要求
        uint256 reward;         // 奖励金额
        bool isCompleted;       // 是否已完成
        address publisher;      // 发布者地址
    }
    
    // 执行记录结构体
    struct Execution {
        address executor;       // 执行者地址
        string result;          // 执行结果
        uint256 executedAt;     // 执行时间
        bool isWinner;          // 是否为获胜者
    }
    
    // 状态变量
    Task[] public tasks;                    // 任务列表
    mapping(uint256 => Execution[]) public executions;  // 任务执行记录
    mapping(uint256 => uint256) public taskExecutionCount;  // 任务执行数量
    
    // 事件
    event TaskPublished(uint256 indexed taskId, address indexed publisher, string title, uint256 reward);
    event ExecutionSubmitted(uint256 indexed taskId, address indexed executor, string result);
    event WinnerSelected(uint256 indexed taskId, address indexed winner, uint256 reward);
    
    // 修饰符
    modifier taskExists(uint256 _taskId) {
        require(_taskId < tasks.length, "Task does not exist");
        _;
    }
    
    modifier notCompleted(uint256 _taskId) {
        require(!tasks[_taskId].isCompleted, "Task is already completed");
        _;
    }
    
    modifier onlyPublisher(uint256 _taskId) {
        require(msg.sender == tasks[_taskId].publisher, "Only publisher can perform this action");
        _;
    }
    
    /**
     * @dev 发布任务
     * @param _title 任务标题
     * @param _description 任务描述
     * @param _deadline 截止时间
     * @param _taskType 任务类型
     * @param _requirements 任务要求
     * @param _reward 奖励金额
     */
    function publishTask(
        string memory _title,
        string memory _description,
        uint256 _deadline,
        string memory _taskType,
        string memory _requirements,
        uint256 _reward
    ) external payable {
        require(bytes(_title).length > 0, "Title cannot be empty");
        require(bytes(_description).length > 0, "Description cannot be empty");
        require(_deadline > block.timestamp, "Deadline must be in the future");
        require(_reward > 0, "Reward must be greater than 0");
        require(msg.value >= _reward, "Insufficient payment for reward");
        
        Task memory newTask = Task({
            title: _title,
            description: _description,
            deadline: _deadline,
            taskType: _taskType,
            requirements: _requirements,
            reward: _reward,
            isCompleted: false,
            publisher: msg.sender
        });
        
        tasks.push(newTask);
        uint256 taskId = tasks.length - 1;
        
        emit TaskPublished(taskId, msg.sender, _title, _reward);
    }
    
    /**
     * @dev 提交任务执行结果
     * @param _taskId 任务ID
     * @param _result 执行结果
     */
    function submitExecution(uint256 _taskId, string memory _result) 
        external 
        taskExists(_taskId) 
        notCompleted(_taskId) 
    {
        require(bytes(_result).length > 0, "Result cannot be empty");
        require(block.timestamp <= tasks[_taskId].deadline, "Task deadline has passed");
        
        Execution memory newExecution = Execution({
            executor: msg.sender,
            result: _result,
            executedAt: block.timestamp,
            isWinner: false
        });
        
        executions[_taskId].push(newExecution);
        taskExecutionCount[_taskId]++;
        
        emit ExecutionSubmitted(_taskId, msg.sender, _result);
    }
    
    /**
     * @dev 选择获胜者并支付奖励
     * @param _taskId 任务ID
     * @param _executionIndex 执行记录索引
     */
    function selectWinnerAndPay(uint256 _taskId, uint256 _executionIndex) 
        external 
        payable 
        taskExists(_taskId) 
        notCompleted(_taskId) 
        onlyPublisher(_taskId) 
    {
        require(_executionIndex < executions[_taskId].length, "Invalid execution index");
        require(block.timestamp > tasks[_taskId].deadline, "Cannot select winner before deadline");
        
        // 标记获胜者
        executions[_taskId][_executionIndex].isWinner = true;
        
        // 标记任务为已完成
        tasks[_taskId].isCompleted = true;
        
        // 支付奖励
        address winner = executions[_taskId][_executionIndex].executor;
        uint256 reward = tasks[_taskId].reward;
        
        require(address(this).balance >= reward, "Insufficient contract balance");
        require(msg.value >= reward, "Insufficient payment for reward");
        
        // 转账给获胜者
        (bool success, ) = winner.call{value: reward}("");
        require(success, "Transfer failed");
        
        emit WinnerSelected(_taskId, winner, reward);
    }
    
    /**
     * @dev 获取任务总数
     * @return 任务总数
     */
    function getTaskCount() external view returns (uint256) {
        return tasks.length;
    }
    
    /**
     * @dev 获取任务详情
     * @param _taskId 任务ID
     * @return 任务详情
     */
    function getTask(uint256 _taskId) external view taskExists(_taskId) returns (
        string memory title,
        string memory description,
        uint256 deadline,
        string memory taskType,
        string memory requirements,
        uint256 reward,
        bool isCompleted,
        address publisher
    ) {
        Task memory task = tasks[_taskId];
        return (
            task.title,
            task.description,
            task.deadline,
            task.taskType,
            task.requirements,
            task.reward,
            task.isCompleted,
            task.publisher
        );
    }
    
    /**
     * @dev 获取任务的执行记录数量
     * @param _taskId 任务ID
     * @return 执行记录数量
     */
    function getExecutionCount(uint256 _taskId) external view taskExists(_taskId) returns (uint256) {
        return executions[_taskId].length;
    }
    
    /**
     * @dev 获取任务的执行记录
     * @param _taskId 任务ID
     * @param _executionIndex 执行记录索引
     * @return 执行记录详情
     */
    function getExecution(uint256 _taskId, uint256 _executionIndex) external view taskExists(_taskId) returns (
        address executor,
        string memory result,
        uint256 executedAt,
        bool isWinner
    ) {
        require(_executionIndex < executions[_taskId].length, "Invalid execution index");
        Execution memory execution = executions[_taskId][_executionIndex];
        return (
            execution.executor,
            execution.result,
            execution.executedAt,
            execution.isWinner
        );
    }
    
    /**
     * @dev 获取合约余额
     * @return 合约余额
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @dev 获取可用任务ID列表
     * @return 可用任务ID数组
     */
    function getAvailableTasks() external view returns (uint256[] memory) {
        uint256[] memory availableTasks = new uint256[](tasks.length);
        uint256 count = 0;
        
        for (uint256 i = 0; i < tasks.length; i++) {
            if (!tasks[i].isCompleted && block.timestamp <= tasks[i].deadline) {
                availableTasks[count] = i;
                count++;
            }
        }
        
        // 调整数组大小
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = availableTasks[i];
        }
        
        return result;
    }
    
    /**
     * @dev 获取任务的所有执行记录
     * @param _taskId 任务ID
     * @return 执行记录数组
     */
    function getTaskExecutions(uint256 _taskId) external view taskExists(_taskId) returns (
        address[] memory executors,
        string[] memory results,
        uint256[] memory executedAts,
        bool[] memory isWinners
    ) {
        uint256 executionCount = executions[_taskId].length;
        executors = new address[](executionCount);
        results = new string[](executionCount);
        executedAts = new uint256[](executionCount);
        isWinners = new bool[](executionCount);
        
        for (uint256 i = 0; i < executionCount; i++) {
            Execution memory execution = executions[_taskId][i];
            executors[i] = execution.executor;
            results[i] = execution.result;
            executedAts[i] = execution.executedAt;
            isWinners[i] = execution.isWinner;
        }
    }
    
    /**
     * @dev 紧急提取函数（仅合约所有者）
     * @param _amount 提取金额
     */
    function emergencyWithdraw(uint256 _amount) external {
        require(msg.sender == owner, "Only owner can withdraw");
        require(_amount <= address(this).balance, "Insufficient balance");
        
        (bool success, ) = msg.sender.call{value: _amount}("");
        require(success, "Withdrawal failed");
    }
    
    // 合约所有者
    address public owner;
    
    constructor() {
        owner = msg.sender;
    }
    
    // 接收以太币
    receive() external payable {}
}