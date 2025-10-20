// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "./interfaces/IFXPool.sol";

/**
 * @title AetherOracleV2
 * @author AetherPay Team
 * @notice Multi-oracle consensus-based price feed with ECDSA signature verification
 * @dev Implements decentralized oracle network with reputation system
 */
contract AetherOracleV2 is Ownable, ReentrancyGuard, Pausable {
    using ECDSA for bytes32;

    // ============ Structs ============
    
    struct RateData {
        uint256 rate;           // Rate with 8 decimal places
        uint256 confidence;     // Confidence in basis points (0-10000)
        uint256 timestamp;      // Block timestamp
        address[] submitters;   // Oracles that submitted this rate
        bool isValid;           // Whether the rate is valid
    }
    
    struct OracleNode {
        address nodeAddress;
        bool isActive;
        uint256 reputation;         // Reputation score (0-1000)
        uint256 totalSubmissions;
        uint256 successfulSubmissions;
        uint256 lastSubmitTime;
    }
    
    struct PendingRate {
        uint256[] rates;
        uint256[] confidences;
        address[] submitters;
        uint256 timestamp;
    }
    
    // ============ State Variables ============

    // Oracle configuration
    uint256 public minOracleNodes = 1;        // ✅ 改为 1（测试环境）
    uint256 public requiredSubmissions = 1;   // ✅ 改为 1（测试环境）
    uint256 public consensusWindow = 300; // 5 minutes
    uint256 public minConfidenceThreshold = 8000; // 80%
    uint256 public maxRateDeviation = 1000; // 10%
    
    // Mappings
    mapping(string => RateData) public latestRates;
    mapping(string => RateData[]) public rateHistory;
    mapping(address => OracleNode) public oracleNodes;
    mapping(string => PendingRate) public pendingRates;
    
    address[] public activeOracles;
    
    // FXPool integration
    address public fxPoolAddress;
    IFXPool public fxPool;
    
    // ============ Events ============
    
    event RateSubmitted(
        string indexed pair,
        address indexed oracle,
        uint256 rate,
        uint256 confidence,
        uint256 timestamp
    );
    
    event ConsensusReached(
        string indexed pair,
        uint256 rate,
        uint256 confidence,
        uint256 submissionCount,
        uint256 timestamp
    );
    
    event OracleNodeAdded(address indexed nodeAddress, uint256 timestamp);
    event OracleNodeRemoved(address indexed nodeAddress, uint256 timestamp);
    event ReputationUpdated(address indexed oracle, uint256 oldRep, uint256 newRep);
    event FXPoolUpdated(address indexed oldPool, address indexed newPool);
    
    // ============ Modifiers ============
    
    modifier onlyAuthorizedOracle() {
        require(oracleNodes[msg.sender].isActive, "Not authorized oracle");
        _;
    }
    
    modifier validPair(string memory pair) {
        require(bytes(pair).length > 0, "Invalid pair");
        _;
    }
    
    modifier validConfidence(uint256 confidence) {
        require(confidence <= 10000, "Confidence too high");
        require(confidence >= minConfidenceThreshold, "Confidence too low");
        _;
    }
    
    // ============ Constructor ============
    
    constructor() {}
    
    // ============ Oracle Management ============
    
    /**
     * @notice Add a new oracle node
     * @param nodeAddress Address of the oracle node
     */
    function addOracleNode(address nodeAddress) external onlyOwner {
        require(nodeAddress != address(0), "Invalid address");
        require(!oracleNodes[nodeAddress].isActive, "Oracle already exists");
        
        oracleNodes[nodeAddress] = OracleNode({
            nodeAddress: nodeAddress,
            isActive: true,
            reputation: 1000,
            totalSubmissions: 0,
            successfulSubmissions: 0,
            lastSubmitTime: 0
        });
        
        activeOracles.push(nodeAddress);
        
        emit OracleNodeAdded(nodeAddress, block.timestamp);
    }
    
    /**
     * @notice Remove an oracle node
     * @param nodeAddress Address of the oracle node to remove
     */
    function removeOracleNode(address nodeAddress) external onlyOwner {
        require(oracleNodes[nodeAddress].isActive, "Oracle not active");
        
        oracleNodes[nodeAddress].isActive = false;
        
        // Remove from active oracles array
        for (uint256 i = 0; i < activeOracles.length; i++) {
            if (activeOracles[i] == nodeAddress) {
                activeOracles[i] = activeOracles[activeOracles.length - 1];
                activeOracles.pop();
                break;
            }
        }
        
        emit OracleNodeRemoved(nodeAddress, block.timestamp);
    }
    
    // ============ Core Oracle Functions ============
    
    /**
     * @notice Submit rate with ECDSA signature (POC for ZK proof)
     * @param pair Currency pair
     * @param rate Exchange rate (8 decimals)
     * @param confidence Confidence level (basis points)
     * @param signature ECDSA signature of the data
     */
    function submitRate(
        string memory pair,
        uint256 rate,
        uint256 confidence,
        bytes memory signature
    ) external onlyAuthorizedOracle validPair(pair) validConfidence(confidence) nonReentrant whenNotPaused {
        
        // Verify ECDSA signature (POC for ZK proof)
        require(_verifySignature(pair, rate, confidence, signature), "Invalid signature");
        
        // Check rate deviation if previous rate exists
        if (latestRates[pair].isValid) {
            require(_checkRateDeviation(pair, rate), "Rate deviation too high");
        }
        
        // Get or create pending rate
        PendingRate storage pending = pendingRates[pair];
        
        // Check if this is a new consensus window
        if (block.timestamp > pending.timestamp + consensusWindow) {
            // Reset pending submissions
            delete pendingRates[pair];
            pending = pendingRates[pair];
            pending.timestamp = block.timestamp;
        }
        
        // Check if oracle already submitted in this window
        for (uint256 i = 0; i < pending.submitters.length; i++) {
            require(pending.submitters[i] != msg.sender, "Already submitted in this window");
        }
        
        // Add submission to pending pool
        pending.rates.push(rate);
        pending.confidences.push(confidence);
        pending.submitters.push(msg.sender);
        
        // Update oracle stats
        OracleNode storage oracle = oracleNodes[msg.sender];
        oracle.totalSubmissions++;
        oracle.lastSubmitTime = block.timestamp;
        
        emit RateSubmitted(pair, msg.sender, rate, confidence, block.timestamp);
        
        // Check if we have enough submissions for consensus
        if (pending.rates.length >= requiredSubmissions) {
            _reachConsensus(pair);
        }
    }
    
    /**
     * @notice Calculate consensus from pending submissions
     * @param pair Currency pair
     */
    function _reachConsensus(string memory pair) internal {
        PendingRate storage pending = pendingRates[pair];
        
        require(pending.rates.length >= requiredSubmissions, "Not enough submissions");
        
        // Calculate median rate
        uint256 medianRate = _calculateMedian(pending.rates);
        uint256 avgConfidence = _calculateAverage(pending.confidences);
        
        // Create rate data
        RateData memory newRate = RateData({
            rate: medianRate,
            confidence: avgConfidence,
            timestamp: block.timestamp,
            submitters: pending.submitters,
            isValid: true
        });
        
        // Update latest rate
        latestRates[pair] = newRate;
        
        // Add to history
        rateHistory[pair].push(newRate);
        
        // Update reputation for all submitters
        _updateReputations(pair, medianRate, pending);
        
        // Update FXPool if connected
        if (address(fxPool) != address(0)) {
            try fxPool.updateRate(pair, medianRate, avgConfidence) {
                // Rate updated in FXPool
            } catch {
                // FXPool update failed, continue
            }
        }
        
        emit ConsensusReached(
            pair,
            medianRate,
            avgConfidence,
            pending.submitters.length,
            block.timestamp
        );
        
        // Clear pending submissions
        delete pendingRates[pair];
    }
    
    /**
     * @notice Update oracle reputations based on submission accuracy
     * @param pair Currency pair
     * @param consensusRate The agreed upon rate
     * @param pending Pending rate data
     */
    function _updateReputations(
        string memory pair,
        uint256 consensusRate,
        PendingRate storage pending
    ) internal {
        for (uint256 i = 0; i < pending.submitters.length; i++) {
            address submitter = pending.submitters[i];
            uint256 submittedRate = pending.rates[i];
            
            OracleNode storage oracle = oracleNodes[submitter];
            uint256 oldReputation = oracle.reputation;
            
            // Calculate deviation from consensus
            uint256 deviation;
            if (submittedRate > consensusRate) {
                deviation = ((submittedRate - consensusRate) * 10000) / consensusRate;
            } else {
                deviation = ((consensusRate - submittedRate) * 10000) / consensusRate;
            }
            
            // Update reputation based on accuracy
            if (deviation <= 100) { // Within 1%
                oracle.successfulSubmissions++;
                if (oracle.reputation < 1000) {
                    oracle.reputation += 5;
                }
            } else if (deviation <= 500) { // Within 5%
                oracle.successfulSubmissions++;
                // No change
            } else {
                // Penalize for large deviation
                if (oracle.reputation > 100) {
                    oracle.reputation -= 10;
                }
            }
            
            if (oldReputation != oracle.reputation) {
                emit ReputationUpdated(submitter, oldReputation, oracle.reputation);
            }
        }
    }
    
    /**
     * @notice Verify ECDSA signature (POC for ZK proof)
     * @param pair Currency pair
     * @param rate Exchange rate
     * @param confidence Confidence level
     * @param signature ECDSA signature
     * @return bool Whether signature is valid
     */
    function _verifySignature(
        string memory pair,
        uint256 rate,
        uint256 confidence,
        bytes memory signature
    ) internal view returns (bool) {
        // Create message hash (rate updates should be signed within 1-minute window)
        bytes32 messageHash = keccak256(
            abi.encodePacked(pair, rate, confidence, block.timestamp / 60)
        );
        
        // Recover signer from signature
        address signer = messageHash.toEthSignedMessageHash().recover(signature);
        
        // Verify signer is the message sender
        return signer == msg.sender;
    }
    
    /**
     * @notice Check if rate deviation is within acceptable range
     * @param pair Currency pair
     * @param newRate New rate to check
     * @return bool Whether deviation is acceptable
     */
    function _checkRateDeviation(
        string memory pair,
        uint256 newRate
    ) internal view returns (bool) {
        RateData memory latest = latestRates[pair];
        if (!latest.isValid || latest.rate == 0) {
            return true;
        }
        
        uint256 deviation;
        if (newRate > latest.rate) {
            deviation = ((newRate - latest.rate) * 10000) / latest.rate;
        } else {
            deviation = ((latest.rate - newRate) * 10000) / latest.rate;
        }
        
        return deviation <= maxRateDeviation;
    }
    
    /**
     * @notice Calculate median of an array
     * @param values Array of values
     * @return uint256 Median value
     */
    function _calculateMedian(uint256[] memory values) internal pure returns (uint256) {
        require(values.length > 0, "Empty array");
        
        // Sort array (bubble sort for small arrays)
        uint256[] memory sorted = new uint256[](values.length);
        for (uint256 i = 0; i < values.length; i++) {
            sorted[i] = values[i];
        }
        
        for (uint256 i = 0; i < sorted.length; i++) {
            for (uint256 j = i + 1; j < sorted.length; j++) {
                if (sorted[i] > sorted[j]) {
                    uint256 temp = sorted[i];
                    sorted[i] = sorted[j];
                    sorted[j] = temp;
                }
            }
        }
        
        // Return median
        uint256 mid = sorted.length / 2;
        if (sorted.length % 2 == 0) {
            return (sorted[mid - 1] + sorted[mid]) / 2;
        } else {
            return sorted[mid];
        }
    }
    
    /**
     * @notice Calculate average of an array
     * @param values Array of values
     * @return uint256 Average value
     */
    function _calculateAverage(uint256[] memory values) internal pure returns (uint256) {
        require(values.length > 0, "Empty array");
        
        uint256 sum = 0;
        for (uint256 i = 0; i < values.length; i++) {
            sum += values[i];
        }
        
        return sum / values.length;
    }
    
    // ============ View Functions ============
    
    /**
     * @notice Get latest rate for a pair
     * @param pair Currency pair
     * @return rate Latest rate
     * @return confidence Confidence level
     * @return timestamp Last update timestamp
     * @return isValid Whether rate is valid
     */
    function getLatestRate(string memory pair) external view returns (
        uint256 rate,
        uint256 confidence,
        uint256 timestamp,
        bool isValid
    ) {
        RateData memory data = latestRates[pair];
        return (data.rate, data.confidence, data.timestamp, data.isValid);
    }
    
    /**
     * @notice Get pending submissions for a pair
     * @param pair Currency pair
     * @return rates Array of pending rates
     * @return submitters Array of submitter addresses
     * @return count Number of pending submissions
     */
    function getPendingSubmissions(string memory pair) external view returns (
        uint256[] memory rates,
        address[] memory submitters,
        uint256 count
    ) {
        PendingRate memory pending = pendingRates[pair];
        return (pending.rates, pending.submitters, pending.rates.length);
    }
    
    /**
     * @notice Get oracle information
     * @param nodeAddress Oracle node address
     */
    function getOracleInfo(address nodeAddress) external view returns (
        bool isActive,
        uint256 reputation,
        uint256 totalSubmissions,
        uint256 successfulSubmissions,
        uint256 lastSubmitTime
    ) {
        OracleNode memory oracle = oracleNodes[nodeAddress];
        return (
            oracle.isActive,
            oracle.reputation,
            oracle.totalSubmissions,
            oracle.successfulSubmissions,
            oracle.lastSubmitTime
        );
    }
    
    /**
     * @notice Get all active oracles
     * @return address[] Array of active oracle addresses
     */
    function getActiveOracles() external view returns (address[] memory) {
        return activeOracles;
    }
    
    /**
     * @notice Check if rate is fresh
     * @param pair Currency pair
     * @param maxAge Maximum age in seconds
     * @return bool Whether rate is fresh
     */
    function isRateFresh(string memory pair, uint256 maxAge) external view returns (bool) {
        if (!latestRates[pair].isValid) {
            return false;
        }
        
        return (block.timestamp - latestRates[pair].timestamp) <= maxAge;
    }
    
    // ============ Admin Functions ============
    
    /**
     * @notice Set FXPool address
     * @param _fxPoolAddress FXPool contract address
     */
    function setFXPool(address _fxPoolAddress) external onlyOwner {
        require(_fxPoolAddress != address(0), "Invalid FXPool address");
        
        address oldPool = fxPoolAddress;
        fxPoolAddress = _fxPoolAddress;
        fxPool = IFXPool(_fxPoolAddress);
        
        emit FXPoolUpdated(oldPool, _fxPoolAddress);
    }
    
    /**
     * @notice Set minimum oracle nodes required
     * @param _minNodes Minimum number of nodes
     */
    function setMinOracleNodes(uint256 _minNodes) external onlyOwner {
        require(_minNodes >= 1, "Must have at least 1 node");
        minOracleNodes = _minNodes;
    }
    
    /**
     * @notice Set required submissions for consensus
     * @param _required Required number of submissions
     */
    function setRequiredSubmissions(uint256 _required) external onlyOwner {
        require(_required >= 1, "Must require at least 1 submission");
        require(_required <= activeOracles.length, "Cannot require more than active oracles");
        requiredSubmissions = _required;
    }
    
    /**
     * @notice Set consensus window duration
     * @param _window Window duration in seconds
     */
    function setConsensusWindow(uint256 _window) external onlyOwner {
        require(_window >= 60, "Window too short");
        require(_window <= 3600, "Window too long");
        consensusWindow = _window;
    }
    
    /**
     * @notice Set minimum confidence threshold
     * @param _threshold Threshold in basis points
     */
    function setMinConfidenceThreshold(uint256 _threshold) external onlyOwner {
        require(_threshold <= 10000, "Threshold too high");
        require(_threshold >= 5000, "Threshold too low");
        minConfidenceThreshold = _threshold;
    }
    
    /**
     * @notice Set maximum rate deviation
     * @param _deviation Deviation in basis points
     */
    function setMaxRateDeviation(uint256 _deviation) external onlyOwner {
        require(_deviation <= 5000, "Deviation too high");
        require(_deviation >= 100, "Deviation too low");
        maxRateDeviation = _deviation;
    }
    
    /**
     * @notice Pause the contract
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @notice Unpause the contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @notice Emergency function to invalidate a rate
     * @param pair Currency pair
     */
    function invalidateRate(string memory pair) external onlyOwner {
        if (latestRates[pair].isValid) {
            latestRates[pair].isValid = false;
        }
    }
}






