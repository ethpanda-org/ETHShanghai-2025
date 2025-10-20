// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./BaseTask.sol";

/**
 * @title 一次性结清的任务合约
 * @notice 任务完成后一次性支付全部报酬的任务类型，适用于一对一结算场景
 * @dev 这是默认的支付方式，任务完成后支付全部报酬，只允许一个工作者参与
 */
contract FixedPaymentTask is BaseTask {
    using SafeERC20 for IERC20;

    // 存储任务的工作量证明（一对一任务）
    mapping(uint256 => ProofOfWork) public taskWorkProof;

    // 自定义错误
    error FixedPaymentTask_TaskDeadlinePassed();
    error FixedPaymentTask_ProofOfWorkEmpty();
    error FixedPaymentTask_ProofNotSubmitted();
    error FixedPaymentTask_TaskCannotBeCancelled();
    error FixedPaymentTask_TaskNotCompleted();
    error FixedPaymentTask_OnlyOneWorkerAllowed();
    error FixedPaymentTask_InvalidWorkerAddress();
    error FixedPaymentTask_TaskNotOpen(uint256 taskId);
    error FixedPaymentTask_NoProofOfWorkSubmitted();
    error FixedPaymentTask_ProofAlreadyApproved();
    error FixedPaymentTask_DisputeTimeNotReached();

    // 自定义事件
    event FixedPaymentTask_TaskWorkerAdded(uint256 indexed taskId, address indexed worker, uint256 reward);
    event FixedPaymentTask_TaskWorkerRemoved(uint256 indexed taskId, address indexed worker);
    event FixedPaymentTask_TaskCancelled(uint256 indexed taskId);
    event FixedPaymentTask_TaskPaid(uint256 indexed taskId, uint256 amount);
    event FixedPaymentTask_ProofOfWorkSubmitted(uint256 indexed taskId, string proof);
    event FixedPaymentTask_ProofOfWorkApproved(uint256 indexed taskId);

    event FixedPaymentTaskCreated(
        uint256 indexed taskId, address indexed creator, string title, string description, uint256 deadline
    );

    /**
     * @notice 构造函数
     * @param _taskToken 平台代币地址
     * @param _disputeResolver 纠纷解决合约地址
     */
    constructor(IERC20 _taskToken, IDisputeResolver _disputeResolver) BaseTask(_taskToken, _disputeResolver) { }

    /**
     * @notice 创建固定报酬任务
     * @param _title 任务标题
     * @param _description 任务描述
     * @param _deadline 任务截止时间
     */
    function createTask(string calldata _title, string calldata _description, uint256 _deadline)
        public
        override
        whenNotPaused
    {
        if (_deadline < block.timestamp) {
            revert InvalidDeadline();
        }

        taskCounter++;

        Task storage newTask = tasks[taskCounter];
        newTask.id = taskCounter;
        newTask.creator = msg.sender;
        newTask.totalreward = 0;
        newTask.deadline = _deadline;
        newTask.status = TaskStatus.Open;

        emit FixedPaymentTaskCreated(taskCounter, msg.sender, _title, _description, _deadline);
    }

    /**
     * @notice 添加工作者到任务中（一对一任务只允许一个工作者）
     * @param _taskId 任务ID
     * @param _worker 工作者地址
     */
    function addWorker(uint256 _taskId, address _worker, uint256 _reward)
        external
        onlyTaskCreator(_taskId)
        whenNotPaused
    {
        Task storage task = tasks[_taskId];

        if (task.status != TaskStatus.Open) {
            revert FixedPaymentTask_TaskNotOpen(_taskId);
        }

        if (_worker == address(0)) {
            revert FixedPaymentTask_InvalidWorkerAddress();
        }

        // 一次性结清任务只允许一个工作者
        if (task.worker != address(0)) {
            revert FixedPaymentTask_OnlyOneWorkerAllowed();
        }

        task.worker = _worker;
        task.totalreward = _reward;

        taskToken.safeTransferFrom(msg.sender, address(this), _reward);

        task.status = TaskStatus.InProgress;

        emit FixedPaymentTask_TaskWorkerAdded(_taskId, _worker, _reward);
    }

    /**
     * @notice 终止任务，直接取消任务
     * @param _taskId 任务ID
     */
    function terminateTask(uint256 _taskId) public override onlyTaskCreator(_taskId) whenNotPaused {
        Task storage task = tasks[_taskId];

        // 检查任务状态是否允许终止
        if (task.status == TaskStatus.Cancelled || task.status == TaskStatus.Paid) {
            revert FixedPaymentTask_TaskCannotBeCancelled();
        }

        task.status = TaskStatus.Cancelled;

        // 获取当前分配的工作者
        address worker = task.worker;

        // 检查是否有工作量证明提交，如果有则可以提交纠纷
        ProofOfWork memory proof = taskWorkProof[_taskId];
        if (worker != address(0) && proof.approved) {
            // 如果工作者的工作量证明已经被批准，说明任务已经完成，不能取消
            revert FixedPaymentTask_ProofAlreadyApproved();
        }
        if (worker != address(0) && proof.submitted && !proof.approved) {
            // 如果工作者已经提交了工作量证明，则提交纠纷进行评判
            // 资金将在纠纷解决时分配，这里不需要进行补偿

            // 提交纠纷
            submitDispute(_taskId, worker, task.creator, task.totalreward, proof.proof);
        } else {
            uint256 amount = task.totalreward;
            task.totalreward = 0;
            taskToken.safeTransfer(task.creator, amount);
        }

        emit FixedPaymentTask_TaskCancelled(_taskId);
    }

    /**
     * @notice 提交工作量证明
     * @param _taskId 任务ID
     * @param _proof 工作量证明内容
     */
    function submitProofOfWork(uint256 _taskId, string calldata _proof)
        external
        whenNotPaused
        onlyTaskWorker(_taskId)
        onlyTaskInProgress(_taskId)
    {
        Task memory task = tasks[_taskId];
        if (block.timestamp >= task.deadline) {
            revert FixedPaymentTask_TaskDeadlinePassed();
        }
        if (bytes(_proof).length == 0) {
            revert FixedPaymentTask_ProofOfWorkEmpty();
        }

        // 检查工作量证明是否已经批准
        if (taskWorkProof[_taskId].approved) {
            revert FixedPaymentTask_ProofAlreadyApproved();
        }

        taskWorkProof[_taskId] =
            ProofOfWork({ submitted: true, approved: false, submittedAt: block.timestamp, proof: _proof });

        emit FixedPaymentTask_ProofOfWorkSubmitted(_taskId, _proof);
    }

    /**
     * @notice 验证工作量证明并检查工作者是否符合任务要求
     * @param _taskId 任务ID
     */
    function approveProofOfWork(uint256 _taskId)
        external
        onlyTaskCreator(_taskId)
        whenNotPaused
        onlyTaskInProgress(_taskId)
    {
        Task storage task = tasks[_taskId];
        ProofOfWork storage proof = taskWorkProof[_taskId];
        if (!proof.submitted) {
            revert FixedPaymentTask_ProofNotSubmitted();
        }

        proof.approved = true;
        task.status = TaskStatus.Completed;

        emit FixedPaymentTask_ProofOfWorkApproved(_taskId);
    }

    /**
     * @notice 支付任务奖励
     * @param _taskId 任务ID
     */
    function payTask(uint256 _taskId) external onlyTaskWorker(_taskId) whenNotPaused {
        Task storage task = tasks[_taskId];

        // 检查任务是否可以支付
        if (task.status != TaskStatus.Completed) {
            revert FixedPaymentTask_TaskNotCompleted();
        }

        // 计算平台费用
        uint256 fee = (task.totalreward * platformFee) / DenominatorFee;
        uint256 payment = task.totalreward - fee;

        // 更新平台总收入
        totalPlatformRevenue += fee;

        // 支付给工作者
        address worker = task.worker;
        taskToken.safeTransfer(worker, payment);

        // 更新任务状态
        task.status = TaskStatus.Paid;

        emit FixedPaymentTask_TaskPaid(_taskId, payment);
    }

    /**
     * @notice 允许工作者提交纠纷
     * @param _taskId 任务ID
     * @dev 只有任务的工作者可以调用此函数
     * @dev 只有在工作证明已提交但未被批准时才能调用
     * @dev 只有在工作证明提交一段时间后才能提交纠纷（防止过早提交）
     */
    function fileDisputeByWorker(uint256 _taskId)
        external
        whenNotPaused
        onlyTaskWorker(_taskId)
        onlyTaskInProgress(_taskId)
    {
        Task storage task = tasks[_taskId];

        ProofOfWork memory proof = taskWorkProof[_taskId];

        // 检查是否已提交工作证明
        if (!proof.submitted) {
            revert FixedPaymentTask_NoProofOfWorkSubmitted();
        }

        // 检查工作证明是否已被批准
        if (proof.approved) {
            revert FixedPaymentTask_ProofAlreadyApproved();
        }

        // 检查是否已经过了足够的时间（例如3天）工作者才能提交纠纷
        // 这给任务创建者一些时间来批准工作证明

        if (block.timestamp < proof.submittedAt + minTimeBeforeDispute) {
            revert FixedPaymentTask_DisputeTimeNotReached();
        }

        task.status = TaskStatus.Cancelled; // 任务状态改为取消，等待纠纷解决

        // 提交纠纷
        submitDispute(_taskId, msg.sender, task.creator, task.totalreward, proof.proof);
        emit FixedPaymentTask_TaskCancelled(_taskId);
    }

    function increaseReward(uint256 _taskId, uint256 _reward) external onlyTaskCreator(_taskId) {
        Task storage task = tasks[_taskId];

        if (_reward == 0) {
            revert RewardMoreThanZero();
        }

        task.totalreward += _reward;

        taskToken.safeTransferFrom(msg.sender, address(this), _reward);

        emit RewardIncreased(_taskId, task.totalreward);
    }
}
