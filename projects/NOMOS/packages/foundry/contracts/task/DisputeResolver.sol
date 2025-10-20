// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../interfaces/ISoulboundUserNFT.sol";

/**
 * @title 纠纷解决合约
 * @notice 用于处理任务创建者和工作者之间的纠纷，托管资金直到纠纷解决
 * @dev 该合约允许在纠纷期间冻结资金，直到顶级游民投票决定如何分配这些资金
 */
contract DisputeResolver is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // 纠纷状态枚举
    enum DisputeStatus {
        Filed, // 已提交纠纷
        Resolved, // 已解决（质押者投票已处理完成）
        Distributed // 已分配（资金已分配）

    }

    // 顶级游民投票结构体
    struct EliteVote {
        address elite; // 顶级游民地址
        uint256 workerShare; // 顶级游民投票的工作者份额
    }

    // 纠纷结构体
    struct Dispute {
        uint256 taskId; // 任务ID
        uint256 rewardAmount; // 奖励金额
        uint256 workerShare; // 分配给工作者的金额
        address taskContract; // 任务合约地址
        address worker; // 工作者地址
        address taskCreator; // 任务创建者地址
        bool workerApproved; // 工作者是否批准
        bool creatorApproved; // 创建者是否批准
        DisputeStatus status; // 纠纷状态
        EliteVote[] votes; // 投票列表
    }

    // 平台代币地址
    IERC20 public immutable taskToken;

    // 用户NFT合约地址
    ISoulboundUserNFT public immutable userInfoNFT;

    // 纠纷计数器
    uint256 public disputeCounter;

    // 纠纷处理奖励比例 (以基点表示，100基点=1%)
    uint256 public constant disputeProcessingRewardBps = 50; // 默认0.5%
    uint256 public constant DenominatorFee = 1e4;
    // 存储所有纠纷
    mapping(uint256 => Dispute) public disputes;

    // 存储顶级游民是否已对特定纠纷投票
    mapping(address => mapping(uint256 => bool)) public hasVotedOnDispute;

    // 自定义错误
    error DisputeResolver_InvalidTaskContract();
    error DisputeResolver_NoActiveDispute();
    error DisputeResolver_DisputeNotResolved();
    error DisputeResolver_ZeroReward();
    error DisputeResolver_InvalidWorkerShare();
    error DisputeResolver_OnlyDisputeParty();
    error DisputeResolver_ProposalNotApproved();
    error DisputeResolver_AlreadyApproved();
    error DisputeResolver_NotEliteUser();
    error DisputeResolver_AlreadyVoted();
    error DisputeResolver_NotEnoughVotes();
    error DisputeResolver_InvalidTaskToken();
    error DisputeResolver_InvalidUserNFTContract();

    // 事件定义
    event DisputeResolver_DisputeFiled(
        uint256 indexed disputeId,
        uint256 indexed taskId,
        address indexed taskContract,
        address worker,
        address taskCreator,
        uint256 rewardAmount,
        string proof
    );

    event DisputeResolver_DisputeResolved(uint256 indexed disputeId, uint256 workerShare);

    event DisputeResolver_ProposalApprovedByWorker(uint256 indexed disputeId, address worker);

    event DisputeResolver_ProposalApprovedByCreator(uint256 indexed disputeId, address taskCreator);

    event DisputeResolver_FundsDistributed(uint256 indexed disputeId);

    event DisputeResolver_ProposalRejected(uint256 indexed disputeId);

    event DisputeResolver_EliteVoted(uint256 indexed disputeId, address indexed elite, uint256 workerShare);

    modifier onlyActiveDispute(uint256 _disputeId) {
        if (_disputeId >= disputeCounter) {
            revert DisputeResolver_NoActiveDispute();
        }
        _;
    }

    modifier onlyEliteUser() {
        // 检查用户是否拥有NFT
        if (!userInfoNFT.hasUserMintedNFT(msg.sender)) {
            revert DisputeResolver_NotEliteUser();
        }

        // 检查用户是否为顶级游民
        ISoulboundUserNFT.UserGrade userGrade = userInfoNFT.getUserGrade(msg.sender);
        if (userGrade != ISoulboundUserNFT.UserGrade.Excellent) {
            revert DisputeResolver_NotEliteUser();
        }
        _;
    }

    /**
     * @notice 构造函数
     * @param _taskToken 平台代币地址
     * @param _userInfoNFT 用户NFT合约地址
     */
    constructor(IERC20 _taskToken, ISoulboundUserNFT _userInfoNFT) Ownable(msg.sender) {
        if (address(_taskToken) == address(0)) {
            revert DisputeResolver_InvalidTaskToken();
        }
        if (address(_userInfoNFT) == address(0)) {
            revert DisputeResolver_InvalidUserNFTContract();
        }
        taskToken = _taskToken;
        userInfoNFT = _userInfoNFT;
    }

    /**
     * @notice 提交纠纷
     * @param _taskContract 任务合约地址
     * @param _taskId 任务ID
     * @param _worker 工作者地址
     * @param _taskCreator 任务创建者地址
     * @param _rewardAmount 奖励金额
     */
    function fileDispute(
        address _taskContract,
        uint256 _taskId,
        address _worker,
        address _taskCreator,
        uint256 _rewardAmount,
        string calldata _proof
    ) external nonReentrant {
        // 检查任务合约地址是否有效
        if (_taskContract == address(0)) {
            revert DisputeResolver_InvalidTaskContract();
        }

        // 检查奖励金额是否大于0
        if (_rewardAmount == 0) {
            revert DisputeResolver_ZeroReward();
        }

        // 计算处理费用（与奖励一起转入）
        uint256 processingReward = (_rewardAmount * disputeProcessingRewardBps) / DenominatorFee;
        uint256 totalAmount = _rewardAmount + processingReward;

        // 创建新纠纷
        disputes[disputeCounter] = Dispute({
            taskId: _taskId,
            rewardAmount: _rewardAmount,
            workerShare: 0,
            taskContract: _taskContract,
            worker: _worker,
            taskCreator: _taskCreator,
            workerApproved: false,
            creatorApproved: false,
            status: DisputeStatus.Filed,
            votes: new EliteVote[](0)
        });
        // 增加纠纷计数器
        disputeCounter++;

        taskToken.safeTransferFrom(msg.sender, address(this), totalAmount);

        emit DisputeResolver_DisputeFiled(
            disputeCounter - 1, _taskId, _taskContract, _worker, _taskCreator, _rewardAmount, _proof
        );
    }

    /**
     * @notice 顶级游民对纠纷进行投票
     * @param _disputeId 纠纷ID
     * @param _workerShare 分配给工作者的金额
     */
    function voteOnDispute(uint256 _disputeId, uint256 _workerShare)
        external
        nonReentrant
        onlyActiveDispute(_disputeId)
        onlyEliteUser
    {
        Dispute storage dispute = disputes[_disputeId];

        // 检查纠纷状态
        if (dispute.status != DisputeStatus.Filed) {
            revert DisputeResolver_DisputeNotResolved();
        }

        // 检查分配给工作者的金额是否有效
        if (_workerShare > dispute.rewardAmount) {
            revert DisputeResolver_InvalidWorkerShare();
        }

        // 检查是否已经投过票
        if (hasVotedOnDispute[msg.sender][_disputeId]) {
            revert DisputeResolver_AlreadyVoted();
        }

        // 记录投票
        dispute.votes.push(EliteVote({ elite: msg.sender, workerShare: _workerShare }));

        // 标记为已投票
        hasVotedOnDispute[msg.sender][_disputeId] = true;

        emit DisputeResolver_EliteVoted(_disputeId, msg.sender, _workerShare);
    }

    /**
     * @notice 处理顶级游民投票，计算平均值并解决纠纷
     * @param _disputeId 纠纷ID
     */
    function processVotes(uint256 _disputeId) external nonReentrant onlyActiveDispute(_disputeId) {
        Dispute storage dispute = disputes[_disputeId];

        // 检查纠纷状态
        if (dispute.status != DisputeStatus.Filed) {
            revert DisputeResolver_DisputeNotResolved();
        }

        uint256 length = dispute.votes.length;

        // 检查投票数量是否足够（至少需要3票）
        if (length < 3) {
            revert DisputeResolver_NotEnoughVotes();
        }

        // 计算平均值
        uint256 totalWorkerShare = 0;
        for (uint256 i = 0; i < length; i++) {
            totalWorkerShare += dispute.votes[i].workerShare;
        }
        uint256 averageWorkerShare = totalWorkerShare / length;

        // 更新纠纷状态
        dispute.status = DisputeStatus.Resolved;

        // 存储分配方案
        dispute.workerShare = averageWorkerShare;

        emit DisputeResolver_DisputeResolved(_disputeId, averageWorkerShare);
    }

    /**
     * @notice 纠纷相关方确认分配方案
     * @param _disputeId 纠纷ID
     */
    function approveProposal(uint256 _disputeId) external nonReentrant onlyActiveDispute(_disputeId) {
        Dispute storage dispute = disputes[_disputeId];

        // 检查调用者是否为纠纷相关方
        if (msg.sender != dispute.worker && msg.sender != dispute.taskCreator) {
            revert DisputeResolver_OnlyDisputeParty();
        }

        // 检查纠纷状态
        if (dispute.status != DisputeStatus.Resolved) {
            revert DisputeResolver_DisputeNotResolved();
        }

        // 检查是否已经确认过
        bool isWorker = msg.sender == dispute.worker;
        bool alreadyApproved = isWorker ? dispute.workerApproved : dispute.creatorApproved;
        if (alreadyApproved) {
            revert DisputeResolver_AlreadyApproved();
        }

        // 更新确认状态
        if (isWorker) {
            dispute.workerApproved = true;
            emit DisputeResolver_ProposalApprovedByWorker(_disputeId, msg.sender);
        } else {
            dispute.creatorApproved = true;
            emit DisputeResolver_ProposalApprovedByCreator(_disputeId, msg.sender);
        }
    }

    /**
     * @notice 分配纠纷资金（需要双方同意后才能执行）
     * @param _disputeId 纠纷ID
     */
    function distributeFunds(uint256 _disputeId) external nonReentrant onlyActiveDispute(_disputeId) {
        Dispute storage dispute = disputes[_disputeId];

        // 检查纠纷是否已解决
        if (dispute.status != DisputeStatus.Resolved) {
            revert DisputeResolver_DisputeNotResolved();
        }

        // 检查分配方案是否已获双方同意
        if (!dispute.workerApproved || !dispute.creatorApproved) {
            revert DisputeResolver_ProposalNotApproved();
        }

        // 计算处理奖励金额
        uint256 processingReward = (dispute.rewardAmount * disputeProcessingRewardBps) / DenominatorFee;

        // 计算实际分配给工作者和创建者的金额（扣除奖励）
        uint256 workerAmount = dispute.workerShare;
        uint256 creatorAmount = dispute.rewardAmount - workerAmount;

        // 计算每个评判人的奖励
        uint256 length = dispute.votes.length;
        uint256 rewardPerElite = processingReward / length;

        // 更新纠纷状态
        dispute.status = DisputeStatus.Distributed;

        // 转移资金给工作者
        if (workerAmount > 0) {
            taskToken.safeTransfer(dispute.worker, workerAmount);
        }

        // 转移资金给任务创建者
        if (creatorAmount > 0) {
            taskToken.safeTransfer(dispute.taskCreator, creatorAmount);
        }

        // 为参与投票的顶级游民发放奖励
        if (rewardPerElite > 0) {
            for (uint256 i = 0; i < length; i++) {
                address elite = dispute.votes[i].elite;
                taskToken.safeTransfer(elite, rewardPerElite);
            }
        }

        emit DisputeResolver_FundsDistributed(_disputeId);
    }

    /**
     * @notice 拒绝分配方案并重新进入解决状态
     * @param _disputeId 纠纷ID
     */
    function rejectProposal(uint256 _disputeId) external nonReentrant onlyActiveDispute(_disputeId) {
        Dispute storage dispute = disputes[_disputeId];

        // 检查调用者是否为纠纷相关方
        if (msg.sender != dispute.worker && msg.sender != dispute.taskCreator) {
            revert DisputeResolver_OnlyDisputeParty();
        }

        // 检查纠纷状态
        if (dispute.status != DisputeStatus.Resolved) {
            revert DisputeResolver_DisputeNotResolved();
        }

        // 计算拒绝费用（与处理奖励相同）
        uint256 processingReward = (dispute.rewardAmount * disputeProcessingRewardBps) / DenominatorFee;
        uint256 length = dispute.votes.length;

        // 收取拒绝费用并分配给评判人
        if (processingReward > 0) {
            taskToken.safeTransferFrom(msg.sender, address(this), processingReward);
            uint256 rewardPerElite = processingReward / length;

            // 为参与投票的顶级游民发放拒绝费用奖励
            for (uint256 i = 0; i < length; i++) {
                address elite = dispute.votes[i].elite;
                taskToken.safeTransfer(elite, rewardPerElite);
                hasVotedOnDispute[elite][_disputeId] = false;
            }
        } else {
            // 如果没有处理费用，仍然需要重置投票状态
            for (uint256 i = 0; i < length; i++) {
                address elite = dispute.votes[i].elite;
                hasVotedOnDispute[elite][_disputeId] = false;
            }
        }

        // 清空投票列表
        delete dispute.votes;

        // 将纠纷状态改回Filed状态，以便重新投票
        dispute.status = DisputeStatus.Filed;

        // 重置分配方案确认状态
        dispute.workerApproved = false;
        dispute.creatorApproved = false;

        emit DisputeResolver_ProposalRejected(_disputeId);
    }

    /**
     * @notice 获取纠纷详情
     * @param _disputeId 纠纷ID
     * @return 纠纷结构体
     */
    function getDispute(uint256 _disputeId) external view returns (Dispute memory) {
        return disputes[_disputeId];
    }

    /**
     * @notice 获取纠纷处理奖励比例
     * @return 奖励比例（基点）
     */
    function getDisputeProcessingRewardBps() external pure returns (uint256) {
        return disputeProcessingRewardBps;
    }
}
