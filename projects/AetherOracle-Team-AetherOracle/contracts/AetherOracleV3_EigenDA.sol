// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "./interfaces/IFXPool.sol";

/**
 * @dev Simulated EigenDA interface - in production, this would be an external contract
 */
interface IEigenDAServiceManager {
    function storeBlob(bytes calldata data) external returns (bytes32 blobId);
    function retrieveBlob(bytes32 blobId) external view returns (bytes memory data);
    function verifyAvailability(bytes32 blobId) external view returns (bool);
}

/**
 * @title AetherOracleV3_EigenDA
 * @author AetherPay Team
 * @notice Multi-oracle with EigenDA decentralized storage (POC)
 * @dev POC implementation demonstrating EigenDA integration pattern
 *
 * Key Improvements:
 * - Uses bytes32 for blob IDs (gas efficient)
 * - Limited on-chain history (max 100 entries)
 * - Simulated EigenDA interface for demonstration
 * - Optimized struct packing
 *
 * Note: In production, this would connect to actual EigenDA service via:
 * - EigenDA ServiceManager contract
 * - Disperser client for blob submission
 * - Retriever for data availability proofs
 */
contract AetherOracleV3_EigenDA is Ownable, ReentrancyGuard, Pausable {
    using ECDSA for bytes32;

    // ============ Constants ============

    uint256 public constant MAX_HISTORY_LENGTH = 100;  // Limit history to prevent gas issues
    uint256 public constant BLOB_RETENTION_DAYS = 30;  // Data retention period

    // ============ Optimized Structs ============

    /**
     * @dev Optimized rate data structure using packed storage
     * Total: 256 bits (1 storage slot) + 1 slot for blobId
     */
    struct RateData {
        uint128 rate;           // Rate with 8 decimal places (128 bits)
        uint64 confidence;      // Confidence in basis points (64 bits)
        uint64 timestamp;       // Block timestamp (64 bits)
        bytes32 eigenDABlobId;  // EigenDA blob identifier (256 bits)
        bool isValid;           // Validity flag
    }

    struct OracleNode {
        address nodeAddress;
        bool isActive;
        uint128 reputation;      // Reduced from uint256
        uint64 totalSubmissions;
        uint64 successfulSubmissions;
        uint64 lastSubmitTime;
    }

    struct PendingRate {
        uint256[] rates;
        uint256[] confidences;
        address[] submitters;
        bytes32[] eigenDABlobIds;  // Changed from string[] to bytes32[]
        uint256 timestamp;
    }

    // ============ State Variables ============

    uint256 public minOracleNodes = 1;
    uint256 public requiredSubmissions = 1;
    uint256 public consensusWindow = 300;
    uint256 public minConfidenceThreshold = 8000;
    uint256 public maxRateDeviation = 1000;

    // Core mappings - using bytes32 for pair IDs for gas efficiency
    mapping(bytes32 => RateData) public latestRates;
    mapping(bytes32 => bytes32[]) public rateHistoryBlobIds;  // Only store blob IDs
    mapping(address => OracleNode) public oracleNodes;
    mapping(bytes32 => PendingRate) private pendingRates;

    // EigenDA blob index: pairId => blobId => minimal rate info
    mapping(bytes32 => mapping(bytes32 => RateData)) public blobIndex;

    // Track blob timestamps for cleanup
    mapping(bytes32 => uint256) public blobTimestamps;

    address[] public activeOracles;
    address public fxPoolAddress;
    IFXPool public fxPool;

    // Simulated EigenDA service (in production, this would be external)
    IEigenDAServiceManager public eigenDAService;

    // ============ Events ============

    event RateSubmitted(
        bytes32 indexed pairId,
        address indexed oracle,
        uint256 rate,
        uint256 confidence,
        bytes32 eigenDABlobId,
        uint256 timestamp
    );

    event ConsensusReached(
        bytes32 indexed pairId,
        uint256 rate,
        uint256 confidence,
        uint256 submissionCount,
        bytes32 eigenDABlobId,
        uint256 timestamp
    );

    event DataStoredToEigenDA(
        bytes32 indexed pairId,
        bytes32 eigenDABlobId,
        uint256 dataSize,
        uint256 timestamp
    );

    event HistoryPruned(
        bytes32 indexed pairId,
        uint256 prunedCount,
        uint256 remainingCount
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

    constructor(address _eigenDAService) {
        // In production, pass actual EigenDA service address
        // For POC, can deploy a mock contract or leave as address(0)
        if (_eigenDAService != address(0)) {
            eigenDAService = IEigenDAServiceManager(_eigenDAService);
        }
    }

    // ============ Oracle Management ============

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

    // ============ Core Oracle Functions with EigenDA ============

    /**
     * @notice Submit rate with automatic EigenDA storage
     * @param pair Currency pair (e.g., "BTC/USDT")
     * @param rate Exchange rate (8 decimals)
     * @param confidence Confidence level (basis points)
     * @param signature ECDSA signature for verification
     */
    function submitRate(
        string memory pair,
        uint256 rate,
        uint256 confidence,
        bytes memory signature
    ) external
        onlyAuthorizedOracle
        validPair(pair)
        validConfidence(confidence)
        nonReentrant
        whenNotPaused
    {
        bytes32 pairId = keccak256(bytes(pair));

        // Verify ECDSA signature
        require(_verifySignature(pair, rate, confidence, signature), "Invalid signature");

        // Check rate deviation
        if (latestRates[pairId].isValid) {
            require(_checkRateDeviation(pairId, rate), "Rate deviation too high");
        }

        PendingRate storage pending = pendingRates[pairId];

        // Reset if new consensus window
        if (block.timestamp > pending.timestamp + consensusWindow) {
            delete pendingRates[pairId];
            pending = pendingRates[pairId];
            pending.timestamp = block.timestamp;
        }

        // Check duplicate submission
        for (uint256 i = 0; i < pending.submitters.length; i++) {
            require(pending.submitters[i] != msg.sender, "Already submitted");
        }

        // Store individual submission data to EigenDA (if service available)
        bytes32 blobId = _storeSubmissionToEigenDA(pair, rate, confidence, msg.sender);

        // Add submission
        pending.rates.push(rate);
        pending.confidences.push(confidence);
        pending.submitters.push(msg.sender);
        pending.eigenDABlobIds.push(blobId);

        // Update oracle stats
        OracleNode storage oracle = oracleNodes[msg.sender];
        oracle.totalSubmissions++;
        oracle.lastSubmitTime = uint64(block.timestamp);

        emit RateSubmitted(pairId, msg.sender, rate, confidence, blobId, block.timestamp);

        // Check consensus
        if (pending.rates.length >= requiredSubmissions) {
            _reachConsensus(pairId, pair);
        }
    }

    /**
     * @notice Store submission data to EigenDA
     * @dev In production, this would call actual EigenDA service
     */
    function _storeSubmissionToEigenDA(
        string memory pair,
        uint256 rate,
        uint256 confidence,
        address submitter
    ) internal returns (bytes32) {
        // Prepare data for storage
        bytes memory data = abi.encode(
            pair,
            rate,
            confidence,
            submitter,
            block.timestamp,
            block.number
        );

        bytes32 blobId;

        // Store to EigenDA if service is available
        if (address(eigenDAService) != address(0)) {
            try eigenDAService.storeBlob(data) returns (bytes32 id) {
                blobId = id;
            } catch {
                // Fallback: use hash as blob ID for POC
                blobId = keccak256(data);
            }
        } else {
            // POC mode: use hash as simulated blob ID
            blobId = keccak256(data);
        }

        // Track blob timestamp for retention management
        blobTimestamps[blobId] = block.timestamp;

        emit DataStoredToEigenDA(
            keccak256(bytes(pair)),
            blobId,
            data.length,
            block.timestamp
        );

        return blobId;
    }

    /**
     * @notice Calculate consensus and store to EigenDA
     */
    function _reachConsensus(bytes32 pairId, string memory pair) internal {
        PendingRate storage pending = pendingRates[pairId];
        require(pending.rates.length >= requiredSubmissions, "Not enough submissions");

        uint256 medianRate = _calculateMedian(pending.rates);
        uint256 avgConfidence = _calculateAverage(pending.confidences);

        // Create consensus data blob
        bytes memory consensusData = abi.encode(
            pair,
            medianRate,
            avgConfidence,
            pending.submitters,
            pending.eigenDABlobIds,
            pending.rates,
            pending.confidences,
            block.timestamp,
            block.number
        );

        // Store consensus to EigenDA
        bytes32 consensusBlobId;
        if (address(eigenDAService) != address(0)) {
            try eigenDAService.storeBlob(consensusData) returns (bytes32 id) {
                consensusBlobId = id;
            } catch {
                consensusBlobId = keccak256(consensusData);
            }
        } else {
            consensusBlobId = keccak256(consensusData);
        }

        // Store minimal data on-chain
        RateData memory newRate = RateData({
            rate: uint128(medianRate),
            confidence: uint64(avgConfidence),
            timestamp: uint64(block.timestamp),
            eigenDABlobId: consensusBlobId,
            isValid: true
        });

        latestRates[pairId] = newRate;

        // Store blob ID in history (with pruning)
        _addToHistory(pairId, consensusBlobId);

        // Index the blob
        blobIndex[pairId][consensusBlobId] = newRate;
        blobTimestamps[consensusBlobId] = block.timestamp;

        // Update oracle reputations
        _updateReputations(pairId, medianRate, pending);

        // Update FXPool if configured
        if (address(fxPool) != address(0)) {
            try fxPool.updateRate(pair, medianRate, avgConfidence) {} catch {}
        }

        emit ConsensusReached(
            pairId,
            medianRate,
            avgConfidence,
            pending.submitters.length,
            consensusBlobId,
            block.timestamp
        );

        // Clear pending rates
        delete pendingRates[pairId];
    }

    /**
     * @notice Add blob ID to history with automatic pruning
     */
    function _addToHistory(bytes32 pairId, bytes32 blobId) internal {
        bytes32[] storage history = rateHistoryBlobIds[pairId];

        // Add new blob ID
        history.push(blobId);

        // Prune if exceeds maximum length
        if (history.length > MAX_HISTORY_LENGTH) {
            // Remove oldest entries
            uint256 toRemove = history.length - MAX_HISTORY_LENGTH;
            for (uint256 i = 0; i < history.length - toRemove; i++) {
                history[i] = history[i + toRemove];
            }
            for (uint256 i = 0; i < toRemove; i++) {
                history.pop();
            }

            emit HistoryPruned(pairId, toRemove, history.length);
        }
    }

    /**
     * @notice Update oracle reputations based on consensus
     */
    function _updateReputations(
        bytes32 pairId,
        uint256 consensusRate,
        PendingRate storage pending
    ) internal {
        for (uint256 i = 0; i < pending.submitters.length; i++) {
            address submitter = pending.submitters[i];
            uint256 submittedRate = pending.rates[i];

            OracleNode storage oracle = oracleNodes[submitter];
            uint256 oldReputation = oracle.reputation;

            // Calculate deviation
            uint256 deviation = submittedRate > consensusRate
                ? ((submittedRate - consensusRate) * 10000) / consensusRate
                : ((consensusRate - submittedRate) * 10000) / consensusRate;

            // Update reputation based on accuracy
            if (deviation <= 100) { // Within 1%
                oracle.successfulSubmissions++;
                if (oracle.reputation < 2000) {
                    oracle.reputation += 10;
                }
            } else if (deviation <= 500) { // Within 5%
                oracle.successfulSubmissions++;
                if (oracle.reputation < 1500) {
                    oracle.reputation += 5;
                }
            } else { // More than 5% deviation
                if (oracle.reputation > 100) {
                    oracle.reputation -= 20;
                }
            }

            if (oldReputation != oracle.reputation) {
                emit ReputationUpdated(submitter, oldReputation, oracle.reputation);
            }
        }
    }

    // ============ Helper Functions ============

    function _verifySignature(
        string memory pair,
        uint256 rate,
        uint256 confidence,
        bytes memory signature
    ) internal view returns (bool) {
        bytes32 messageHash = keccak256(
            abi.encodePacked(pair, rate, confidence, block.timestamp / 60)
        );
        address signer = messageHash.toEthSignedMessageHash().recover(signature);
        return signer == msg.sender;
    }

    function _checkRateDeviation(bytes32 pairId, uint256 newRate) internal view returns (bool) {
        RateData memory latest = latestRates[pairId];
        if (!latest.isValid || latest.rate == 0) return true;

        uint256 deviation = newRate > latest.rate
            ? ((newRate - latest.rate) * 10000) / latest.rate
            : ((latest.rate - newRate) * 10000) / latest.rate;

        return deviation <= maxRateDeviation;
    }

    function _calculateMedian(uint256[] memory values) internal pure returns (uint256) {
        require(values.length > 0, "Empty array");

        // Sort array
        uint256[] memory sorted = new uint256[](values.length);
        for (uint256 i = 0; i < values.length; i++) {
            sorted[i] = values[i];
        }

        for (uint256 i = 0; i < sorted.length - 1; i++) {
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
     */
    function getLatestRate(string memory pair) external view returns (
        uint256 rate,
        uint256 confidence,
        uint256 timestamp,
        bool isValid,
        bytes32 eigenDABlobId
    ) {
        bytes32 pairId = keccak256(bytes(pair));
        RateData memory data = latestRates[pairId];
        return (
            uint256(data.rate),
            uint256(data.confidence),
            uint256(data.timestamp),
            data.isValid,
            data.eigenDABlobId
        );
    }

    /**
     * @notice Get rate data by blob ID
     */
    function getRateByBlobId(string memory pair, bytes32 blobId) external view returns (
        uint256 rate,
        uint256 confidence,
        uint256 timestamp,
        bool isValid
    ) {
        bytes32 pairId = keccak256(bytes(pair));
        RateData memory data = blobIndex[pairId][blobId];
        return (
            uint256(data.rate),
            uint256(data.confidence),
            uint256(data.timestamp),
            data.isValid
        );
    }

    /**
     * @notice Get historical blob IDs for a pair
     */
    function getHistoricalBlobIds(string memory pair) external view returns (bytes32[] memory) {
        bytes32 pairId = keccak256(bytes(pair));
        return rateHistoryBlobIds[pairId];
    }

    /**
     * @notice Get pending submissions for a pair
     */
    function getPendingSubmissions(string memory pair) external view returns (
        uint256[] memory rates,
        address[] memory submitters,
        bytes32[] memory blobIds,
        uint256 count
    ) {
        bytes32 pairId = keccak256(bytes(pair));
        PendingRate memory pending = pendingRates[pairId];
        return (pending.rates, pending.submitters, pending.eigenDABlobIds, pending.rates.length);
    }

    /**
     * @notice Get oracle information
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
            uint256(oracle.reputation),
            uint256(oracle.totalSubmissions),
            uint256(oracle.successfulSubmissions),
            uint256(oracle.lastSubmitTime)
        );
    }

    /**
     * @notice Check if rate is fresh
     */
    function isRateFresh(string memory pair, uint256 maxAge) external view returns (bool) {
        bytes32 pairId = keccak256(bytes(pair));
        RateData memory data = latestRates[pairId];
        if (!data.isValid) return false;
        return (block.timestamp - data.timestamp) <= maxAge;
    }

    /**
     * @notice Cleanup old blob IDs (manual pruning)
     */
    function pruneOldBlobs(string memory pair, uint256 keepCount) external onlyOwner {
        bytes32 pairId = keccak256(bytes(pair));
        bytes32[] storage history = rateHistoryBlobIds[pairId];

        if (history.length > keepCount) {
            uint256 toRemove = history.length - keepCount;

            // Shift elements
            for (uint256 i = 0; i < keepCount && i < history.length - toRemove; i++) {
                history[i] = history[i + toRemove];
            }

            // Remove excess
            for (uint256 i = 0; i < toRemove; i++) {
                history.pop();
            }

            emit HistoryPruned(pairId, toRemove, history.length);
        }
    }

    // ============ Admin Functions ============

    function setFXPool(address _fxPoolAddress) external onlyOwner {
        require(_fxPoolAddress != address(0), "Invalid FXPool address");
        address oldPool = fxPoolAddress;
        fxPoolAddress = _fxPoolAddress;
        fxPool = IFXPool(_fxPoolAddress);
        emit FXPoolUpdated(oldPool, _fxPoolAddress);
    }

    function setEigenDAService(address _eigenDAService) external onlyOwner {
        eigenDAService = IEigenDAServiceManager(_eigenDAService);
    }

    function setRequiredSubmissions(uint256 _required) external onlyOwner {
        require(_required >= 1 && _required <= activeOracles.length, "Invalid requirement");
        requiredSubmissions = _required;
    }

    function setConsensusWindow(uint256 _window) external onlyOwner {
        require(_window >= 60 && _window <= 3600, "Invalid window");
        consensusWindow = _window;
    }

    function setMinConfidenceThreshold(uint256 _threshold) external onlyOwner {
        require(_threshold >= 5000 && _threshold <= 10000, "Invalid threshold");
        minConfidenceThreshold = _threshold;
    }

    function setMaxRateDeviation(uint256 _deviation) external onlyOwner {
        require(_deviation >= 100 && _deviation <= 5000, "Invalid deviation");
        maxRateDeviation = _deviation;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Emergency function to invalidate a rate
     */
    function invalidateRate(string memory pair) external onlyOwner {
        bytes32 pairId = keccak256(bytes(pair));
        if (latestRates[pairId].isValid) {
            latestRates[pairId].isValid = false;
        }
    }

    /**
     * @notice Get active oracle list
     */
    function getActiveOracles() external view returns (address[] memory) {
        return activeOracles;
    }
}