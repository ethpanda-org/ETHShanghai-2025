// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

interface IIdentityRegistry {
    function ownerOf(uint256 agentId) external view returns (address);
}
interface IReputationRegistry {
    function getSummary(uint256 agentId, address[] calldata clients, bytes32 tag1, bytes32 tag2)
        external view returns (uint64 count, uint8 averageScore);
}
interface IValidationRegistry {
    function getValidationStatus(bytes32 requestHash)
        external view returns (address validator, uint256 agentId, uint8 response, bytes32 tag, uint256 lastUpdate);
}

/// @notice 业务合约骨架：派单→请求验证→放款，内置 ERC-8004 校验硬门槛
contract BusinessContract is Ownable {
    struct Job { address client; uint256 agentId; uint256 escrow; bool assigned; bool paid; }

    event JobAssigned(bytes32 indexed jobId, address indexed client, uint256 indexed agentId, uint256 escrow);
    event PaymentReleased(bytes32 indexed jobId, address indexed to, uint256 amount, bytes32 requestHash);

    address public identityRegistry;
    address public reputationRegistry;
    address public validationRegistry;
    uint8 public minAvgScore;
    uint8 public minValidationResponse;
    address public preferredValidator;
    bool public enforceChecks;

    mapping(bytes32 => Job) public jobs; // jobId => Job

    constructor(address identity, address reputation, address validation, uint8 _minAvg, uint8 _minResp) Ownable(msg.sender) {
        identityRegistry = identity;
        reputationRegistry = reputation;
        validationRegistry = validation;
        minAvgScore = _minAvg;
        minValidationResponse = _minResp;
    }

    function setGovernance(address identity, address reputation, address validation, uint8 _minAvg, uint8 _minResp, address _pref, bool _enforce) external onlyOwner {
        identityRegistry = identity;
        reputationRegistry = reputation;
        validationRegistry = validation;
        minAvgScore = _minAvg;
        minValidationResponse = _minResp;
        preferredValidator = _pref;
        enforceChecks = _enforce;
    }

    function assignJob(bytes32 jobId, address client, uint256 agentId) external payable onlyOwner {
        require(!jobs[jobId].assigned, "assigned");
        if (enforceChecks) {
            require(IIdentityRegistry(identityRegistry).ownerOf(agentId) != address(0), "bad agent");
            (, uint8 avg) = IReputationRegistry(reputationRegistry).getSummary(agentId, new address[](0), bytes32(0), bytes32(0));
            require(avg >= minAvgScore, "reputation low");
        }
        jobs[jobId] = Job(client, agentId, msg.value, true, false);
        emit JobAssigned(jobId, client, agentId, msg.value);
    }

    function releasePayment(bytes32 jobId, bytes32 requestHash, address to) external onlyOwner {
        Job storage j = jobs[jobId];
        require(j.assigned && !j.paid, "invalid state");
        if (enforceChecks) {
            (address v, uint256 aid, uint8 resp,,) = IValidationRegistry(validationRegistry).getValidationStatus(requestHash);
            require(aid == j.agentId, "agent mismatch");
            require(resp >= minValidationResponse, "validation not pass");
            if (preferredValidator != address(0)) require(v == preferredValidator, "validator mismatch");
        }
        j.paid = true;
        (bool ok,) = to.call{value: j.escrow}("");
        require(ok, "transfer failed");
        emit PaymentReleased(jobId, to, j.escrow, requestHash);
    }
}


