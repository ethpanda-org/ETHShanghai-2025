// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IIdentityRegistry {
    function ownerOf(uint256 agentId) external view returns (address);
    function tokenURI(uint256 agentId) external view returns (string memory);
}

interface IReputationRegistry {
    function getSummary(uint256 agentId, address[] calldata clients, bytes32 tag1, bytes32 tag2)
        external view returns (uint64 count, uint8 averageScore);
}

interface IValidationRegistry {
    function validationRequest(address validator, uint256 agentId, string calldata uri, bytes32 hash) external;
    function getValidationStatus(bytes32 requestHash)
        external view returns (address validator, uint256 agentId, uint8 response, bytes32 tag, uint256 lastUpdate);
}

contract MockIdentityRegistry is IIdentityRegistry {
    mapping(uint256 => address) public owners;
    mapping(uint256 => string) public uris;

    function set(uint256 agentId, address owner, string calldata uri) external {
        owners[agentId] = owner;
        uris[agentId] = uri;
    }

    function ownerOf(uint256 agentId) external view returns (address) {
        return owners[agentId];
    }

    function tokenURI(uint256 agentId) external view returns (string memory) {
        return uris[agentId];
    }
}

contract MockReputationRegistry is IReputationRegistry {
    struct Summary { uint64 count; uint8 avg; }
    mapping(uint256 => Summary) public summaries;
    function set(uint256 agentId, uint64 count, uint8 avg) external {
        summaries[agentId] = Summary(count, avg);
    }
    function getSummary(uint256 agentId, address[] calldata, bytes32, bytes32) external view returns (uint64, uint8) {
        Summary memory s = summaries[agentId];
        return (s.count, s.avg);
    }
}

contract MockValidationRegistry is IValidationRegistry {
    struct Val { address validator; uint256 agentId; uint8 response; bytes32 tag; uint256 lastUpdate; }
    mapping(bytes32 => Val) public vals;
    event ValidationRequested(address validator, uint256 agentId, string uri, bytes32 hash);

    function validationRequest(address validator, uint256 agentId, string calldata uri, bytes32 hash) external {
        emit ValidationRequested(validator, agentId, uri, hash);
    }
    function set(bytes32 requestHash, address validator, uint256 agentId, uint8 response, bytes32 tag) external {
        vals[requestHash] = Val(validator, agentId, response, tag, block.timestamp);
    }
    function getValidationStatus(bytes32 requestHash) external view returns (address, uint256, uint8, bytes32, uint256) {
        Val memory v = vals[requestHash];
        return (v.validator, v.agentId, v.response, v.tag, v.lastUpdate);
    }
}


