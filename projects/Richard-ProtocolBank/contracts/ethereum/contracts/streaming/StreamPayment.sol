// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/IStreamPayment.sol";

/**
 * @title StreamPayment
 * @dev Protocol Bank streaming payment implementation
 * Enables continuous token streaming from sender to recipient over time
 */
contract StreamPayment is IStreamPayment, ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // Stream counter for generating unique IDs
    uint256 private _streamIdCounter;

    // Mapping from stream ID to Stream struct
    mapping(uint256 => Stream) private _streams;

    // Mapping from sender address to their stream IDs
    mapping(address => uint256[]) private _streamsBySender;

    // Mapping from recipient address to their stream IDs
    mapping(address => uint256[]) private _streamsByRecipient;

    // Platform fee in basis points (e.g., 50 = 0.5%)
    uint256 public platformFeeBps = 0;

    // Platform fee recipient
    address public feeRecipient;

    // Minimum stream duration (to prevent spam)
    uint256 public constant MIN_DURATION = 60; // 1 minute

    constructor() Ownable(msg.sender) {
        feeRecipient = msg.sender;
    }

    /**
     * @dev Create a new streaming payment
     */
    function createStream(
        address recipient,
        address token,
        uint256 totalAmount,
        uint256 duration,
        string memory streamName
    ) external override nonReentrant returns (uint256 streamId) {
        require(recipient != address(0), "Invalid recipient");
        require(recipient != msg.sender, "Cannot stream to self");
        require(token != address(0), "Invalid token");
        require(totalAmount > 0, "Amount must be positive");
        require(duration >= MIN_DURATION, "Duration too short");

        // Calculate rate per second
        uint256 ratePerSecond = totalAmount / duration;
        require(ratePerSecond > 0, "Rate too low");

        // Transfer tokens from sender to contract
        IERC20(token).safeTransferFrom(msg.sender, address(this), totalAmount);

        // Generate new stream ID
        streamId = _streamIdCounter++;

        // Create stream
        uint256 startTime = block.timestamp;
        uint256 endTime = startTime + duration;

        _streams[streamId] = Stream({
            sender: msg.sender,
            recipient: recipient,
            token: token,
            totalAmount: totalAmount,
            amountStreamed: 0,
            amountWithdrawn: 0,
            ratePerSecond: ratePerSecond,
            startTime: startTime,
            endTime: endTime,
            lastWithdrawTime: startTime,
            status: StreamStatus.ACTIVE,
            streamName: streamName
        });

        // Add to sender and recipient mappings
        _streamsBySender[msg.sender].push(streamId);
        _streamsByRecipient[recipient].push(streamId);

        emit StreamCreated(
            streamId,
            msg.sender,
            recipient,
            token,
            totalAmount,
            ratePerSecond,
            startTime,
            endTime,
            streamName
        );

        return streamId;
    }

    /**
     * @dev Withdraw available funds from a stream
     */
    function withdrawFromStream(uint256 streamId) external override nonReentrant {
        Stream storage stream = _streams[streamId];
        require(stream.sender != address(0), "Stream does not exist");
        require(msg.sender == stream.recipient, "Only recipient can withdraw");
        require(
            stream.status == StreamStatus.ACTIVE || stream.status == StreamStatus.COMPLETED,
            "Stream not active"
        );

        uint256 availableBalance = _calculateAvailableBalance(stream);
        require(availableBalance > 0, "No funds available");

        // Update stream state
        stream.amountWithdrawn += availableBalance;
        stream.lastWithdrawTime = block.timestamp;

        // Check if stream is completed
        if (block.timestamp >= stream.endTime && stream.amountWithdrawn >= stream.totalAmount) {
            stream.status = StreamStatus.COMPLETED;
            emit StreamCompleted(streamId, block.timestamp);
        }

        // Transfer tokens to recipient
        IERC20(stream.token).safeTransfer(stream.recipient, availableBalance);

        emit StreamWithdrawn(streamId, stream.recipient, availableBalance, block.timestamp);
    }

    /**
     * @dev Pause an active stream
     */
    function pauseStream(uint256 streamId) external override {
        Stream storage stream = _streams[streamId];
        require(stream.sender != address(0), "Stream does not exist");
        require(msg.sender == stream.sender, "Only sender can pause");
        require(stream.status == StreamStatus.ACTIVE, "Stream not active");

        // Update streamed amount before pausing
        uint256 streamedSoFar = _calculateStreamedAmount(stream);
        stream.amountStreamed = streamedSoFar;
        stream.status = StreamStatus.PAUSED;

        emit StreamPaused(streamId, block.timestamp);
    }

    /**
     * @dev Resume a paused stream
     */
    function resumeStream(uint256 streamId) external override {
        Stream storage stream = _streams[streamId];
        require(stream.sender != address(0), "Stream does not exist");
        require(msg.sender == stream.sender, "Only sender can resume");
        require(stream.status == StreamStatus.PAUSED, "Stream not paused");

        // Extend end time by the paused duration
        uint256 pausedDuration = block.timestamp - stream.lastWithdrawTime;
        stream.endTime += pausedDuration;
        stream.status = StreamStatus.ACTIVE;

        emit StreamResumed(streamId, block.timestamp);
    }

    /**
     * @dev Cancel a stream and refund remaining balance
     */
    function cancelStream(uint256 streamId) external override nonReentrant {
        Stream storage stream = _streams[streamId];
        require(stream.sender != address(0), "Stream does not exist");
        require(msg.sender == stream.sender || msg.sender == stream.recipient, "Not authorized");
        require(
            stream.status == StreamStatus.ACTIVE || stream.status == StreamStatus.PAUSED,
            "Stream not active or paused"
        );

        // Calculate amounts
        uint256 streamedAmount = _calculateStreamedAmount(stream);
        uint256 recipientAmount = streamedAmount - stream.amountWithdrawn;
        uint256 refundAmount = stream.totalAmount - streamedAmount;

        // Update stream state
        stream.status = StreamStatus.CANCELLED;
        stream.amountStreamed = streamedAmount;

        // Transfer remaining funds to recipient if any
        if (recipientAmount > 0) {
            IERC20(stream.token).safeTransfer(stream.recipient, recipientAmount);
            stream.amountWithdrawn += recipientAmount;
        }

        // Refund unstreamed amount to sender
        if (refundAmount > 0) {
            IERC20(stream.token).safeTransfer(stream.sender, refundAmount);
        }

        emit StreamCancelled(streamId, refundAmount, block.timestamp);
    }

    /**
     * @dev Get stream information
     */
    function getStream(uint256 streamId) external view override returns (Stream memory) {
        require(_streams[streamId].sender != address(0), "Stream does not exist");
        return _streams[streamId];
    }

    /**
     * @dev Calculate available balance for withdrawal
     */
    function balanceOf(uint256 streamId) external view override returns (uint256) {
        Stream storage stream = _streams[streamId];
        require(stream.sender != address(0), "Stream does not exist");
        return _calculateAvailableBalance(stream);
    }

    /**
     * @dev Get all stream IDs for a sender
     */
    function getStreamsBySender(address sender) external view override returns (uint256[] memory) {
        return _streamsBySender[sender];
    }

    /**
     * @dev Get all stream IDs for a recipient
     */
    function getStreamsByRecipient(address recipient) external view override returns (uint256[] memory) {
        return _streamsByRecipient[recipient];
    }

    /**
     * @dev Calculate total streamed amount up to current time
     */
    function _calculateStreamedAmount(Stream storage stream) private view returns (uint256) {
        if (stream.status == StreamStatus.PAUSED) {
            return stream.amountStreamed;
        }

        if (block.timestamp >= stream.endTime) {
            return stream.totalAmount;
        }

        uint256 elapsedTime = block.timestamp - stream.startTime;
        uint256 streamedAmount = elapsedTime * stream.ratePerSecond;

        return streamedAmount > stream.totalAmount ? stream.totalAmount : streamedAmount;
    }

    /**
     * @dev Calculate available balance for withdrawal
     */
    function _calculateAvailableBalance(Stream storage stream) private view returns (uint256) {
        uint256 streamedAmount = _calculateStreamedAmount(stream);
        return streamedAmount - stream.amountWithdrawn;
    }

    /**
     * @dev Set platform fee (only owner)
     */
    function setPlatformFee(uint256 feeBps) external onlyOwner {
        require(feeBps <= 1000, "Fee too high"); // Max 10%
        platformFeeBps = feeBps;
    }

    /**
     * @dev Set fee recipient (only owner)
     */
    function setFeeRecipient(address newRecipient) external onlyOwner {
        require(newRecipient != address(0), "Invalid recipient");
        feeRecipient = newRecipient;
    }

    /**
     * @dev Get total number of streams created
     */
    function getTotalStreams() external view returns (uint256) {
        return _streamIdCounter;
    }
}

