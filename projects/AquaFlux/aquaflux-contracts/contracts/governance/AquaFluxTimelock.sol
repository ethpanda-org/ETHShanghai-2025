// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/governance/TimelockController.sol";

/**
 * @title AquaFluxTimelock
 * @dev AquaFlux protocol timelock controller with full security fixes, business defaults, and monitoring helpers.
 */
contract AquaFluxTimelock is TimelockController {
    // Roles
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");

    // Minimum allowed min delay
    uint256 public constant MINIMUM_ALLOWED_MIN_DELAY = 12 hours;

    // Special values
    uint256 private constant UNCONFIGURED_DELAY = type(uint256).max;

    // Emergency parameters
    uint256 public constant EMERGENCY_DELAY = MINIMUM_ALLOWED_MIN_DELAY;
    uint256 public constant EMERGENCY_COOLDOWN = 6 hours;

    // Operation tracking
    mapping(bytes4 => uint256) private operationDelays;
    mapping(bytes4 => bool) private emergencyWhitelist;
    mapping(bytes4 => bool) private selectorConfigured;
    bytes4[] private configuredSelectors;

    mapping(address => uint256) private lastEmergencyTime;
    uint256 private lastEmergencyTimeGlobal;
    uint256 private totalEmergencyOperations;

    // Events
    event OperationDelayConfigured(
        bytes4 indexed functionSelector,
        uint256 delay,
        address indexed updater
    );
    event EmergencyWhitelistUpdated(
        bytes4 indexed functionSelector,
        bool whitelisted,
        address indexed updater
    );
    event EmergencyOperationQueued(
        bytes32 indexed id,
        address indexed target,
        bytes4 indexed selector,
        uint256 delay,
        string reason,
        address operator
    );
    event OperationScheduledWithDelay(
        bytes32 indexed id,
        address indexed target,
        bytes4 indexed selector,
        uint256 delay
    );

    /**
     * @dev Constructor for AquaFlux timelock controller
     */
    constructor(
        uint256 minDelay,
        address[] memory proposers,
        address[] memory executors,
        address admin
    ) TimelockController(minDelay, proposers, executors, admin) {
        require(
            minDelay >= MINIMUM_ALLOWED_MIN_DELAY,
            "minDelay below allowed minimum"
        );
        _configureDefaults();
    }

    /**
     * @dev Internal helper: register selector and delay
     */
    function _setOperationDelay(bytes4 selector, uint256 delay) internal {
        require(selector != bytes4(0), "Zero selector");
        require(delay >= MINIMUM_ALLOWED_MIN_DELAY, "Delay below minimum");
        operationDelays[selector] = delay;
        if (!selectorConfigured[selector]) {
            selectorConfigured[selector] = true;
            configuredSelectors.push(selector);
        }
        emit OperationDelayConfigured(selector, delay, msg.sender);
    }

    /**
     * @dev Internal helper: emergency whitelist
     */
    function _setEmergencyWhitelist(
        bytes4 selector,
        bool whitelisted
    ) internal {
        emergencyWhitelist[selector] = whitelisted;
        emit EmergencyWhitelistUpdated(selector, whitelisted, msg.sender);
    }

    /**
     * @dev Configure default business and emergency operations
     */
    function _configureDefaults() internal {
        // Business operations - UUPS upgrade (OpenZeppelin 5.x only has upgradeToAndCall)
        _setOperationDelay(
            bytes4(keccak256("upgradeToAndCall(address,bytes)")),
            3 days
        );
        _setOperationDelay(
            bytes4(keccak256("withdrawAllProtocolFees(bytes32[],address)")),
            1 days
        );
        _setOperationDelay(
            bytes4(keccak256("withdrawForRedemption(bytes32,address)")),
            1 days
        );
        _setOperationDelay(
            bytes4(keccak256("withdrawProtocolFees(bytes32,address)")),
            1 days
        );
        _setOperationDelay(
            bytes4(keccak256("setDistributionConfig(bytes32,address,address,uint256)")),
            12 hours
        );
        _setOperationDelay(
            bytes4(keccak256("updateDistributionConfig(bytes32,address,address,uint256)")),
            2 days
        );

        // High-risk governance functions (longer delays)
        _setOperationDelay(bytes4(keccak256("setFactory(address)")), 3 days);
        _setOperationDelay(
            bytes4(keccak256("setGlobalFeeRate(string,uint256)")),
            2 days
        );

        // Medium-risk asset management functions (1 day delay)
        _setOperationDelay(
            bytes4(keccak256("updateCouponAllocation(bytes32,uint256,uint256)")),
            1 days
        );
        _setOperationDelay(
            bytes4(keccak256("updateSTokenFeeAllocation(bytes32,uint256)")),
            1 days
        );
        _setOperationDelay(
            bytes4(keccak256("updateOperationDeadline(bytes32,uint256)")),
            1 days
        );
        _setOperationDelay(
            bytes4(keccak256("setDistributionPlan(bytes32,uint256,uint256,uint256,uint256)")),
            1 days
        );

        // Low-risk metadata function (12 hours delay)
        _setOperationDelay(
            bytes4(keccak256("updateMetadataURI(bytes32,string)")),
            12 hours
        );
        
        // Critical ERC20 operations - approve is high risk as it grants spending rights
        _setOperationDelay(
            bytes4(keccak256("approve(address,uint256)")),
            3 days  // Same as other high-risk operations like setFactory
        );

        // Global pause/unpause functions (1 day delay) - affect entire protocol
        _setOperationDelay(bytes4(keccak256("pause()")), 1 days);
        _setOperationDelay(bytes4(keccak256("unpause()")), 1 days);

        // Note: pauseAsset() and unpauseAsset() now use OPERATOR_ROLE and don't require timelock
        // They handle individual assets and can be executed directly for quick response
    }

    /**
     * @dev Dynamic registration of selector by admin
     */
    function registerFunctionSelector(
        bytes4 selector,
        uint256 delay,
        bool emergency
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _setOperationDelay(selector, delay);
        if (emergency) _setEmergencyWhitelist(selector, true);
    }

    function _selectorFromCalldata(
        bytes calldata data
    ) internal pure returns (bytes4 selector) {
        require(data.length >= 4, "Invalid call data");
        selector = bytes4(data[0:4]);
    }

    /**
     * @dev Schedule single operation using configured delay
     */
    function scheduleWithAutomaticDelay(
        address target,
        uint256 value,
        bytes calldata data,
        bytes32 predecessor,
        bytes32 salt
    ) external returns (bytes32) {
        bytes4 selector = _selectorFromCalldata(data);
        require(selectorConfigured[selector], "Selector not configured");

        uint256 delay = operationDelays[selector];
        bytes32 id = hashOperation(target, value, data, predecessor, salt);
        schedule(target, value, data, predecessor, salt, delay);

        emit OperationScheduledWithDelay(id, target, selector, delay);
        return id;
    }

    /**
     * @dev Batch schedule: retain original atomicity with single batch operationId
     */
    function scheduleBatchWithAutomaticDelay(
        address[] calldata targets,
        uint256[] calldata values,
        bytes[] calldata payloads,
        bytes32 predecessor,
        bytes32 salt
    ) external returns (bytes32) {
        require(
            targets.length > 0 &&
                targets.length == values.length &&
                targets.length == payloads.length,
            "Length mismatch"
        );

        uint256 maxDelay = 0;
        bytes4[] memory selectors = new bytes4[](payloads.length);

        for (uint256 i = 0; i < payloads.length; i++) {
            bytes4 selector = _selectorFromCalldata(payloads[i]);
            selectors[i] = selector;
            require(
                selectorConfigured[selector],
                "Selector not configured in batch"
            );
            if (operationDelays[selector] > maxDelay)
                maxDelay = operationDelays[selector];
        }

        bytes32 id = hashOperationBatch(
            targets,
            values,
            payloads,
            predecessor,
            salt
        );
        scheduleBatch(targets, values, payloads, predecessor, salt, maxDelay);

        for (uint256 i = 0; i < payloads.length; i++) {
            emit OperationScheduledWithDelay(
                id,
                targets[i],
                selectors[i],
                operationDelays[selectors[i]]
            );
        }

        return id;
    }

    /**
     * @dev Emergency execute with full security fixes
     */
    function emergencyExecute(
        address target,
        uint256 value,
        bytes calldata data,
        string calldata reason
    ) external returns (bytes32) {
        require(
            hasRole(EMERGENCY_ROLE, msg.sender),
            "Caller must have EMERGENCY_ROLE"
        );
        require(
            hasRole(PROPOSER_ROLE, msg.sender),
            "Caller must also have PROPOSER_ROLE"
        );
        require(bytes(reason).length > 0, "Reason required");
        require(data.length >= 4, "Invalid calldata");

        // Global cooldown
        require(
            block.timestamp >= lastEmergencyTimeGlobal + EMERGENCY_COOLDOWN,
            "Global cooldown not elapsed"
        );

        bytes4 selector = _selectorFromCalldata(data);
        require(selectorConfigured[selector], "Selector not configured");
        require(emergencyWhitelist[selector], "Function not whitelisted");

        lastEmergencyTime[msg.sender] = block.timestamp;
        lastEmergencyTimeGlobal = block.timestamp;
        totalEmergencyOperations++;

        uint256 delay = operationDelays[selector];

        bytes32 salt = keccak256(
            abi.encodePacked(
                "EMERGENCY",
                block.timestamp,
                msg.sender,
                totalEmergencyOperations,
                reason,
                target,
                data,
                blockhash(block.number - 1)
            )
        );

        bytes32 id = hashOperation(target, value, data, bytes32(0), salt);
        schedule(target, value, data, bytes32(0), salt, delay);

        emit EmergencyOperationQueued(
            id,
            target,
            selector,
            delay,
            reason,
            msg.sender
        );
        return id;
    }

    // Admin functions
    function updateOperationDelay(
        bytes4 selector,
        uint256 delay
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _setOperationDelay(selector, delay);
    }

    function updateEmergencyWhitelist(
        bytes4 selector,
        bool whitelisted
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _setEmergencyWhitelist(selector, whitelisted);
    }

    // Emergency stats monitoring
    function getEmergencyStats(
        address operator
    )
        external
        view
        returns (uint256 totalOps, uint256 lastTime, uint256 cooldownRemaining)
    {
        totalOps = totalEmergencyOperations;
        lastTime = lastEmergencyTime[operator];
        if (lastTime + EMERGENCY_COOLDOWN > block.timestamp) {
            cooldownRemaining =
                (lastTime + EMERGENCY_COOLDOWN) -
                block.timestamp;
        } else {
            cooldownRemaining = 0;
        }
    }

    // View helpers
    function getOperationDelay(
        bytes4 selector
    ) external view returns (uint256) {
        return
            selectorConfigured[selector]
                ? operationDelays[selector]
                : UNCONFIGURED_DELAY;
    }

    function isEmergencyWhitelisted(
        bytes4 selector
    ) external view returns (bool) {
        return emergencyWhitelist[selector];
    }

    function getConfiguredSelectors() external view returns (bytes4[] memory) {
        return configuredSelectors;
    }

    function cancelOperation(bytes32 id) external onlyRole(PROPOSER_ROLE) {
        cancel(id);
    }
}
