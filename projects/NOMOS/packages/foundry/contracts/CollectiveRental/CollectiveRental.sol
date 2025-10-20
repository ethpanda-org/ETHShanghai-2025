// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../interfaces/ISoulboundUserNFT.sol";

/**
 * @title 集体租赁合约
 * @notice 支持集体租赁活动的去中心化平台
 * @dev 使用TaskToken代币，集成用户NFT系统，统一平台手续费
 */
contract CollectiveRental is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /*//////////////////////////////////////////////////////////////
                                 TYPES
    //////////////////////////////////////////////////////////////*/
    // 租赁项目结构体
    struct RentalProject {
        uint256 id; // 项目唯一标识
        address payable creator; // 项目发起人地址
        string description; // 活动描述
        uint256 depositPerPerson; // 每人押金
        uint256 participantGoal; // 参与者目标人数
        uint256 currentParticipants; // 当前参与者数量
        uint256 deadline; // 报名截止日期（时间戳）
        uint256 currentDeposits; // 当前收取的押金总额
        uint256 allowence; // 提案者允许使用的金额
        uint256 alreadyWithdrawAmount; // 提案者已经提取的金额
        bool completed; // 项目是否已结束
        bool isSuccessful; // 项目是否成功
    }

    /*//////////////////////////////////////////////////////////////
                            STATE VARIABLES
    //////////////////////////////////////////////////////////////*/
    // 平台代币
    IERC20 public immutable taskToken;

    // 用户NFT合约
    ISoulboundUserNFT public immutable userNFT;

    // 提案治理合约地址
    address public proposalAddress;

    // 平台手续费 (基点，100 = 1%)
    uint256 public platformFee = 100; // 1%
    uint256 public constant DENOMINATOR = 10000;

    // 平台总收入
    uint256 public totalPlatformRevenue;

    // 存储所有租赁项目
    RentalProject[] public projects;

    // 记录项目ID到其对应参与者的映射
    mapping(uint256 => address[]) public projectParticipants;

    // 记录用户是否为项目的参与者
    mapping(address => mapping(uint256 => bool)) public isParticipant;

    /*//////////////////////////////////////////////////////////////
                               MODIFIERS
    //////////////////////////////////////////////////////////////*/
    modifier projectExists(uint256 _projectId) {
        require(_projectId < projects.length, "Project does not exist");
        _;
    }

    modifier projectNotCompleted(uint256 _projectId) {
        require(!projects[_projectId].completed, "Project has already completed");
        _;
    }

    modifier projectCompleted(uint256 _projectId) {
        require(projects[_projectId].completed, "Project has not completed");
        _;
    }

    modifier deadlineReached(uint256 _projectId) {
        require(block.timestamp >= projects[_projectId].deadline, "Deadline has not expired");
        _;
    }

    modifier onlyCreator(uint256 _projectId) {
        require(msg.sender == projects[_projectId].creator, "Only the creator can perform this action");
        _;
    }

    modifier participantHasBalance(uint256 _projectId) {
        require(isParticipant[msg.sender][_projectId], "Not a participant");
        _;
    }

    modifier hasUserNFT() {
        require(userNFT.hasUserMintedNFT(msg.sender), "Must have user NFT");
        _;
    }

    /*//////////////////////////////////////////////////////////////
                               EVENTS
    //////////////////////////////////////////////////////////////*/
    event ProjectCreated(
        uint256 indexed id,
        address indexed creator,
        string description,
        uint256 depositPerPerson,
        uint256 participantGoal,
        uint256 deadline
    );

    event ParticipantJoined(
        uint256 indexed id, address indexed participant, uint256 depositAmount, uint256 currentParticipants
    );

    event ProjectCompleted(uint256 indexed id, bool isSuccessful);

    event FundsWithdrawn(uint256 indexed id, address indexed account, uint256 amount);

    event AllowenceIncreased(uint256 indexed id, uint256 allowence);

    event ProjectFailed(uint256 indexed id);

    event PlatformFeeUpdated(uint256 oldFee, uint256 newFee);

    event PlatformRevenueWithdrawn(address owner, uint256 amount);

    /*//////////////////////////////////////////////////////////////
                             MAIN FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    constructor(IERC20 _taskToken, ISoulboundUserNFT _userNFT) Ownable(msg.sender) {
        taskToken = _taskToken;
        userNFT = _userNFT;
    }

    /**
     * @notice 设置提案治理合约地址
     * @param _proposalAddress 提案合约地址
     */
    function setProposalAddress(address _proposalAddress) external onlyOwner {
        require(_proposalAddress != address(0), "Invalid address");
        proposalAddress = _proposalAddress;
    }

    /**
     * @notice 更新平台手续费
     * @param _newFee 新手续费（基点）
     */
    function updatePlatformFee(uint256 _newFee) external onlyOwner {
        require(_newFee <= 500, "Fee cannot exceed 5%"); // 最大5%

        emit PlatformFeeUpdated(platformFee, _newFee);
        platformFee = _newFee;
    }

    /**
     * @notice 提取平台收益
     */
    function withdrawPlatformRevenue() external nonReentrant onlyOwner {
        require(totalPlatformRevenue > 0, "No revenue to withdraw");

        uint256 amount = totalPlatformRevenue;
        totalPlatformRevenue = 0;

        taskToken.safeTransfer(owner(), amount);

        emit PlatformRevenueWithdrawn(owner(), amount);
    }

    /**
     * @notice 创建新的集体租赁项目（需要用户NFT）
     * @param _description 活动描述
     * @param _depositPerPerson 每人押金
     * @param _participantGoal 参与者目标人数
     * @param _deadline 报名截止日期
     */
    function createRentalProject(
        string calldata _description,
        uint256 _depositPerPerson,
        uint256 _participantGoal,
        uint256 _deadline
    ) public hasUserNFT {
        require(_depositPerPerson > 0, "Deposit per person must be greater than 0");
        require(_participantGoal > 0, "Participant goal must be greater than 0");
        require(_deadline > block.timestamp, "Deadline must be in the future");

        RentalProject memory newProject = RentalProject({
            id: projects.length,
            creator: payable(msg.sender), // 项目发起人地址(payable)
            description: _description,
            depositPerPerson: _depositPerPerson,
            participantGoal: _participantGoal,
            currentParticipants: 0,
            deadline: _deadline,
            currentDeposits: 0,
            allowence: 0,
            alreadyWithdrawAmount: 0,
            completed: false,
            isSuccessful: false
        });

        projects.push(newProject);

        emit ProjectCreated(
            newProject.id,
            newProject.creator,
            newProject.description,
            newProject.depositPerPerson,
            newProject.participantGoal,
            newProject.deadline
        );
    }

    /**
     * @notice 参与集体租赁项目（需要用户NFT）
     * @param _projectId 项目ID
     */
    function joinRentalProject(uint256 _projectId)
        public
        nonReentrant
        projectExists(_projectId)
        projectNotCompleted(_projectId)
        hasUserNFT
    {
        RentalProject storage project = projects[_projectId];
        require(block.timestamp < project.deadline, "Registration has passed deadline");
        require(!isParticipant[msg.sender][_projectId], "Already a participant");
        require(project.currentParticipants < project.participantGoal, "Project is full");

        // 检查用户余额
        require(taskToken.balanceOf(msg.sender) >= project.depositPerPerson, "Insufficient TaskToken balance");

        // 计算平台手续费
        uint256 fee = (project.depositPerPerson * platformFee) / DENOMINATOR;
        uint256 actualAmount = project.depositPerPerson - fee;
        // 更新平台收益
        totalPlatformRevenue += fee;

        // 转移代币到合约
        taskToken.safeTransferFrom(msg.sender, address(this), project.depositPerPerson);

        // 更新项目信息
        project.currentDeposits += actualAmount;
        project.currentParticipants += 1;

        // 记录参与者
        isParticipant[msg.sender][_projectId] = true;
        projectParticipants[_projectId].push(msg.sender);

        emit ParticipantJoined(_projectId, msg.sender, actualAmount, project.currentParticipants);
    }

    /**
     * @notice 结束项目报名并自动激活成功项目的租赁
     * @param _projectId 项目ID
     */
    function completeProject(uint256 _projectId)
        public
        projectExists(_projectId)
        projectNotCompleted(_projectId)
        deadlineReached(_projectId)
    {
        RentalProject storage project = projects[_projectId];

        // 集体租赁：需要达到参与者目标人数
        bool isSuccess = project.currentParticipants >= project.participantGoal;
        project.completed = true;

        if (isSuccess) {
            project.isSuccessful = true;
            // 释放启动资金给项目发起人（25%）
            project.allowence = (project.currentDeposits * 25) / 100;

            emit ProjectCompleted(_projectId, true);
        } else {
            project.isSuccessful = false;
            emit ProjectCompleted(_projectId, false);
        }
    }

    /**
     * @notice 提取项目资金（仅限项目发起人）
     * @param _projectId 项目ID
     * @param _amount 提取金额
     */
    function withdrawFunds(uint256 _projectId, uint256 _amount)
        public
        nonReentrant
        projectExists(_projectId)
        projectCompleted(_projectId)
        onlyCreator(_projectId)
    {
        RentalProject storage project = projects[_projectId];
        require(project.isSuccessful, "Project was not successful");
        require(project.alreadyWithdrawAmount + _amount <= project.allowence, "Exceeds available allowance");

        project.alreadyWithdrawAmount += _amount;
        taskToken.safeTransfer(project.creator, _amount);

        emit FundsWithdrawn(_projectId, project.creator, _amount);
    }

    /**
     * @notice 退款（仅限未成功的项目）
     * @param _projectId 项目ID
     */
    function refund(uint256 _projectId)
        public
        nonReentrant
        projectExists(_projectId)
        projectCompleted(_projectId)
        participantHasBalance(_projectId)
    {
        RentalProject storage project = projects[_projectId];
        require(!project.isSuccessful, "Project was successful, cannot refund");

        // 计算用户应退还的金额（固定押金减去手续费）
        uint256 fee = (project.depositPerPerson * platformFee) / DENOMINATOR;
        uint256 refundAmount = project.depositPerPerson - fee;

        taskToken.safeTransfer(msg.sender, refundAmount);

        emit FundsWithdrawn(_projectId, msg.sender, refundAmount);
    }

    /*//////////////////////////////////////////////////////////////
                                EXTERNAL
    //////////////////////////////////////////////////////////////*/
    /**
     * @notice 增加allowence（只有提案合约可以调用）
     * @param _projectId 项目ID
     * @param _amount 增加金额
     */
    function increaseAllowence(uint256 _projectId, uint256 _amount) external {
        require(msg.sender == proposalAddress, "Unauthorized");
        projects[_projectId].allowence += _amount;
        emit AllowenceIncreased(_projectId, projects[_projectId].allowence);
    }

    /**
     * @notice 设置项目失败（只有提案合约可以调用）
     * @param _projectId 项目ID
     */
    function setProjectFailed(uint256 _projectId) external {
        require(msg.sender == proposalAddress, "Unauthorized");
        RentalProject storage project = projects[_projectId];
        project.allowence = 0;
        project.isSuccessful = false;
        emit ProjectFailed(_projectId);
    }

    /*//////////////////////////////////////////////////////////////
                            GETTER FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    function getProjectParticipants(uint256 _projectId) public view returns (address[] memory) {
        return projectParticipants[_projectId];
    }

    function getProjectCount() public view returns (uint256) {
        return projects.length;
    }

    function getProjectInfo(uint256 _projectId)
        public
        view
        projectExists(_projectId)
        returns (
            uint256 id,
            address payable creator,
            string memory description,
            uint256 depositPerPerson,
            uint256 participantGoal,
            uint256 currentParticipants,
            uint256 deadline,
            uint256 currentDeposits,
            uint256 allowence,
            uint256 alreadyWithdrawAmount,
            bool completed,
            bool isSuccessful
        )
    {
        RentalProject storage project = projects[_projectId];
        return (
            project.id,
            project.creator,
            project.description,
            project.depositPerPerson,
            project.participantGoal,
            project.currentParticipants,
            project.deadline,
            project.currentDeposits,
            project.allowence,
            project.alreadyWithdrawAmount,
            project.completed,
            project.isSuccessful
        );
    }

    /**
     * @notice 检查用户是否为项目参与者
     * @param _user 用户地址
     * @param _projectId 项目ID
     */
    function checkIsParticipant(address _user, uint256 _projectId) public view returns (bool) {
        return isParticipant[_user][_projectId];
    }

    /**
     * @notice 获取项目已提取的金额
     * @param _projectId 项目ID
     */
    function getAlreadyWithdrawAmount(uint256 _projectId) public view projectExists(_projectId) returns (uint256) {
        return projects[_projectId].alreadyWithdrawAmount;
    }

    /**
     * @notice 获取项目剩余可提取金额
     * @param _projectId 项目ID
     */
    function getRemainingAllowance(uint256 _projectId) public view projectExists(_projectId) returns (uint256) {
        RentalProject storage project = projects[_projectId];
        return project.allowence - project.alreadyWithdrawAmount;
    }
}
