// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/SafeCast.sol";

import "../interfaces/IEntryPoint.sol";
import "../interfaces/IPaymaster.sol";
import "../libraries/AlphaErrors.sol";
import "../libraries/SignatureValidator.sol";
import "../types/UserOperation.sol";

/**
 * @title AlphaVerifyingPaymaster
 * @notice Sponsor-aware verifying paymaster with opt-in policy enforcement.
 *         A sponsor pre-authorises user operations via signatures and budget thresholds
 *         tracked on-chain. The paymaster purposefully exposes multiple tuning knobs
 *         (daily budgets, per-op ceilings, policy hooks) to demonstrate complex orchestration.
 */
contract AlphaVerifyingPaymaster is IPaymaster, Ownable, ReentrancyGuard {
    using SafeCast for uint256;

    struct SponsorConfig {
        uint192 dailyBudgetWei;
        uint192 spentToday;
        uint64 lastRefill;
        uint32 maxOpsPerDay;
        uint32 opsExecuted;
        uint16 trustLevel; // arbitrary scoring hook for off-chain risk models
        bool active;
    }

    struct PaymasterRequest {
        address sponsor;
        uint96 maxCost;
        uint48 validAfter;
        uint48 validUntil;
        bytes32 policyId;
        bytes signature;
    }

    IEntryPoint public immutable entryPoint;

    mapping(address => SponsorConfig) public sponsorConfigs;
    mapping(address => bool) public trustedSigners;

    uint48 public cooldownPeriod;
    uint48 public budgetWindow; // defaults to 1 day

    event SponsorConfigured(address indexed sponsor, SponsorConfig config);
    event SponsorDeactivated(address indexed sponsor);
    event SignerUpdated(address indexed signer, bool trusted);
    event CooldownUpdated(uint48 cooldown);
    event BudgetWindowUpdated(uint48 window);
    event PaymasterPostOp(address indexed sponsor, uint256 gasCost, uint256 accumulated);

    constructor(IEntryPoint _entryPoint, address initialOwner) {
        require(address(_entryPoint) != address(0), "AlphaVerifyingPaymaster: entry point required");
        require(initialOwner != address(0), "AlphaVerifyingPaymaster: owner required");
        entryPoint = _entryPoint;
        transferOwnership(initialOwner);
        cooldownPeriod = 1 hours;
        budgetWindow = 1 days;
    }

    modifier onlyEntryPoint() {
        if (msg.sender != address(entryPoint)) {
            revert AlphaErrors.CallerNotEntryPoint();
        }
        _;
    }

    receive() external payable {}

    function setCooldown(uint48 newCooldown) external onlyOwner {
        cooldownPeriod = newCooldown;
        emit CooldownUpdated(newCooldown);
    }

    function setBudgetWindow(uint48 newWindow) external onlyOwner {
        require(newWindow >= 1 hours, "AlphaVerifyingPaymaster: window too small");
        budgetWindow = newWindow;
        emit BudgetWindowUpdated(newWindow);
    }

    function setSponsor(address sponsor, SponsorConfig calldata config) external onlyOwner {
        require(sponsor != address(0), "AlphaVerifyingPaymaster: sponsor required");
        require(config.dailyBudgetWei > 0, "AlphaVerifyingPaymaster: budget zero");
        SponsorConfig storage stored = sponsorConfigs[sponsor];
        if (stored.lastRefill != 0) {
            require(
                uint48(block.timestamp) - stored.lastRefill >= cooldownPeriod,
                "AlphaVerifyingPaymaster: cooldown active"
            );
        }
        sponsorConfigs[sponsor] = config;
        emit SponsorConfigured(sponsor, config);
    }

    function deactivateSponsor(address sponsor) external onlyOwner {
        SponsorConfig storage stored = sponsorConfigs[sponsor];
        stored.active = false;
        emit SponsorDeactivated(sponsor);
    }

    function setSigner(address signer, bool trusted) external onlyOwner {
        require(signer != address(0), "AlphaVerifyingPaymaster: signer required");
        trustedSigners[signer] = trusted;
        emit SignerUpdated(signer, trusted);
    }

    function addDeposit() external payable onlyOwner {
        entryPoint.depositTo{value: msg.value}(address(this));
    }

    function withdrawTo(address payable recipient, uint256 amount) external onlyOwner {
        entryPoint.withdrawTo(recipient, amount);
    }

    function sponsorState(address sponsor) external view returns (SponsorConfig memory) {
        return sponsorConfigs[sponsor];
    }

    function validatePaymasterUserOp(
        UserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 maxCost
    ) external override onlyEntryPoint returns (bytes memory context, uint256 validationData) {
        if (userOp.paymasterAndData.length <= 20) {
            revert("AlphaVerifyingPaymaster: missing context");
        }

        PaymasterRequest memory request = _decodeRequest(userOp.paymasterAndData[20:]);

        _validateSponsorBudget(request.sponsor, request.maxCost, maxCost);
        _validateRequestWindow(request.validAfter, request.validUntil);
        _validateSignature(request, userOpHash);

        context = abi.encode(request.sponsor, request.maxCost, request.policyId);
        validationData = _packValidationData(request.validAfter, request.validUntil);
    }

    function postOp(PostOpMode mode, bytes calldata context, uint256 actualGasCost)
        external
        override
        onlyEntryPoint
    {
        (address sponsor, uint96 maxCost, bytes32 policyId) = abi.decode(context, (address, uint96, bytes32));
        SponsorConfig storage config = sponsorConfigs[sponsor];
        if (!config.active) {
            revert AlphaErrors.ModuleExecutionDenied();
        }

        _rolloverBudget(config);

        uint192 cappedCost = actualGasCost > maxCost ? uint192(maxCost) : uint192(actualGasCost);
        if (config.spentToday + cappedCost > config.dailyBudgetWei) {
            revert("AlphaVerifyingPaymaster: budget exceeded");
        }
        config.spentToday += cappedCost;
        config.opsExecuted += 1;

        emit PaymasterPostOp(sponsor, cappedCost, config.spentToday);

        if (policyId != bytes32(0)) {
            // dummy branch to showcase policy hooks. In production this would call into a registry.
            require(policyId != bytes32(uint256(1)), "AlphaVerifyingPaymaster: policy blocked");
        }

        if (mode == PostOpMode.postOpReverted) {
            revert("AlphaVerifyingPaymaster: postOp reverted");
        }
    }

    function _decodeRequest(bytes calldata data) internal pure returns (PaymasterRequest memory request) {
        if (data.length < 160) {
            revert("AlphaVerifyingPaymaster: malformed request");
        }
        request = abi.decode(data, (PaymasterRequest));
        if (request.sponsor == address(0)) {
            revert("AlphaVerifyingPaymaster: sponsor missing");
        }
        if (request.maxCost == 0) {
            revert("AlphaVerifyingPaymaster: maxCost zero");
        }
    }

    function _validateSponsorBudget(address sponsor, uint96 requestMaxCost, uint256 maxCost) internal view {
        SponsorConfig memory config = sponsorConfigs[sponsor];
        if (!config.active) {
            revert("AlphaVerifyingPaymaster: sponsor inactive");
        }
        if (config.dailyBudgetWei == 0) {
            revert("AlphaVerifyingPaymaster: sponsor misconfigured");
        }
        if (config.maxOpsPerDay != 0 && config.opsExecuted >= config.maxOpsPerDay) {
            revert("AlphaVerifyingPaymaster: ops cap reached");
        }
        if (requestMaxCost > maxCost) {
            revert("AlphaVerifyingPaymaster: request exceeds maxCost");
        }
    }

    function _validateRequestWindow(uint48 validAfter, uint48 validUntil) internal view {
        uint48 nowTs = uint48(block.timestamp);
        if (validAfter != 0 && nowTs < validAfter) {
            revert("AlphaVerifyingPaymaster: not yet valid");
        }
        if (validUntil != 0 && nowTs > validUntil) {
            revert("AlphaVerifyingPaymaster: expired");
        }
    }

    function _validateSignature(PaymasterRequest memory request, bytes32 userOpHash) internal view {
        bytes32 digest = keccak256(
            abi.encodePacked(address(this), userOpHash, request.sponsor, request.maxCost, request.validUntil, request.policyId)
        );
        address signer = SignatureValidator.recoverSigner(digest, request.signature);
        if (!(trustedSigners[signer] || signer == owner() || signer == request.sponsor)) {
            revert AlphaErrors.SignatureValidationFailed();
        }
    }

    function _rolloverBudget(SponsorConfig storage config) internal {
        if (config.lastRefill == 0) {
            config.lastRefill = uint64(block.timestamp);
            config.spentToday = 0;
            config.opsExecuted = 0;
            return;
        }

        if (block.timestamp - config.lastRefill >= budgetWindow) {
            config.lastRefill = uint64(block.timestamp);
            config.spentToday = 0;
            config.opsExecuted = 0;
        }
    }

    function _packValidationData(uint48 validAfter, uint48 validUntil) internal pure returns (uint256) {
        return (uint256(validUntil) << 160) | (uint256(validAfter) << 128);
    }
}

