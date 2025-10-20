// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./RiskAnalyzer.sol";

/**
 * @title AI驱动的风险控制器
 * @dev 在现有风险分析基础上，增加AI自主风险控制机制
 */
contract AIRiskController is RiskAnalyzer {
    
    // AI风险控制结构
    struct RiskControlAction {
        uint256 actionId;
        address targetContract;
        uint256 riskThreshold;
        ActionType actionType;
        bool isActive;
        uint256 triggerCount;
        uint256 lastTriggered;
        address aiController;
    }
    
    enum ActionType {
        PAUSE_TRADING,      // 暂停交易
        LIMIT_EXPOSURE,     // 限制敞口
        EMERGENCY_WITHDRAW, // 紧急提取
        BLACKLIST_CONTRACT, // 拉黑合约
        ADJUST_PARAMETERS   // 调整参数
    }
    
    // AI稳定机制结构
    struct StabilityMechanism {
        uint256 mechanismId;
        string name;
        uint256 stabilityScore;
        bool isEnabled;
        uint256 interventionCount;
        mapping(address => uint256) userProtections;
    }
    
    // 存储映射
    mapping(uint256 => RiskControlAction) public riskActions;
    mapping(uint256 => StabilityMechanism) public stabilityMechanisms;
    mapping(address => uint256[]) public contractActions;
    mapping(address => bool) public aiControllers;
    
    // 计数器
    uint256 public nextActionId = 1;
    uint256 public nextMechanismId = 1;
    
    // 风险控制参数
    uint256 public constant CRITICAL_RISK_THRESHOLD = 80;
    uint256 public constant HIGH_RISK_THRESHOLD = 60;
    uint256 public constant STABILITY_THRESHOLD = 70;
    
    // 事件
    event RiskControlTriggered(uint256 indexed actionId, address indexed targetContract, ActionType actionType);
    event StabilityMechanismActivated(uint256 indexed mechanismId, address indexed protectedUser);
    event AIControllerAuthorized(address indexed controller);
    event EmergencyProtectionActivated(address indexed user, uint256 protectedAmount);
    
    modifier onlyAIController() {
        require(aiControllers[msg.sender] || msg.sender == owner(), "Not authorized AI controller");
        _;
    }
    
    constructor() {}

    /**
     * @dev 授权AI控制器
     */
    function authorizeAIController(address _controller) external onlyOwner {
        aiControllers[_controller] = true;
        emit AIControllerAuthorized(_controller);
    }
    
    /**
     * @dev AI创建风险控制动作
     */
    function createRiskControlAction(
        address _targetContract,
        uint256 _riskThreshold,
        ActionType _actionType
    ) external onlyAIController returns (uint256) {
        uint256 actionId = nextActionId++;
        
        riskActions[actionId] = RiskControlAction({
            actionId: actionId,
            targetContract: _targetContract,
            riskThreshold: _riskThreshold,
            actionType: _actionType,
            isActive: true,
            triggerCount: 0,
            lastTriggered: 0,
            aiController: msg.sender
        });
        
        contractActions[_targetContract].push(actionId);
        return actionId;
    }
    
    /**
     * @dev AI触发风险控制
     */
    function triggerRiskControl(uint256 _actionId) external onlyAIController {
        RiskControlAction storage action = riskActions[_actionId];
        require(action.isActive, "Action not active");
        
        // 检查当前风险分数
        RiskData memory riskData = this.getRiskData(action.targetContract);
        require(riskData.riskScore >= action.riskThreshold, "Risk threshold not met");
        
        // 执行风险控制动作
        _executeRiskControl(action);
        
        action.triggerCount++;
        action.lastTriggered = block.timestamp;
        
        emit RiskControlTriggered(_actionId, action.targetContract, action.actionType);
    }
    
    /**
     * @dev 执行具体的风险控制动作
     */
    function _executeRiskControl(RiskControlAction memory action) internal {
        if (action.actionType == ActionType.BLACKLIST_CONTRACT) {
            this.blacklistContract(action.targetContract);
        } else if (action.actionType == ActionType.PAUSE_TRADING) {
            // 实现交易暂停逻辑
            _pauseContractTrading(action.targetContract);
        }
        // 其他动作类型的实现...
    }
    
    /**
     * @dev 创建AI稳定机制
     */
    function createStabilityMechanism(
        string memory _name,
        uint256 _stabilityScore
    ) external onlyAIController returns (uint256) {
        uint256 mechanismId = nextMechanismId++;
        
        StabilityMechanism storage mechanism = stabilityMechanisms[mechanismId];
        mechanism.mechanismId = mechanismId;
        mechanism.name = _name;
        mechanism.stabilityScore = _stabilityScore;
        mechanism.isEnabled = true;
        mechanism.interventionCount = 0;
        
        return mechanismId;
    }
    
    /**
     * @dev AI激活用户保护机制
     */
    function activateUserProtection(
        uint256 _mechanismId,
        address _user,
        uint256 _protectionAmount
    ) external onlyAIController {
        StabilityMechanism storage mechanism = stabilityMechanisms[_mechanismId];
        require(mechanism.isEnabled, "Mechanism not enabled");
        
        mechanism.userProtections[_user] = _protectionAmount;
        mechanism.interventionCount++;
        
        emit StabilityMechanismActivated(_mechanismId, _user);
        emit EmergencyProtectionActivated(_user, _protectionAmount);
    }
    
    /**
     * @dev 暂停合约交易（内部函数）
     */
    function _pauseContractTrading(address _contract) internal {
        // 实现合约交易暂停逻辑
        // 这里可以调用目标合约的暂停函数或设置全局暂停状态
    }
    
    /**
     * @dev 获取合约的风险控制动作
     */
    function getContractActions(address _contract) external view returns (uint256[] memory) {
        return contractActions[_contract];
    }
    
    /**
     * @dev 检查用户保护状态
     */
    function getUserProtection(uint256 _mechanismId, address _user) external view returns (uint256) {
        return stabilityMechanisms[_mechanismId].userProtections[_user];
    }
}