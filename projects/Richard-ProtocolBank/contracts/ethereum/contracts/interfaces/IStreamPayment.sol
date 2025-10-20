// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IStreamPayment
 * @dev Interface for Protocol Bank streaming payment system
 */
interface IStreamPayment {
    /**
     * @dev Stream status enumeration
     */
    enum StreamStatus {
        ACTIVE,      // Stream is active and funds are flowing
        PAUSED,      // Stream is temporarily paused
        COMPLETED,   // Stream has completed successfully
        CANCELLED    // Stream was cancelled before completion
    }

    /**
     * @dev Stream information structure
     */
    struct Stream {
        address sender;           // Address that created the stream
        address recipient;        // Address receiving the stream
        address token;            // ERC20 token address
        uint256 totalAmount;      // Total amount to be streamed
        uint256 amountStreamed;   // Amount already streamed
        uint256 amountWithdrawn;  // Amount withdrawn by recipient
        uint256 ratePerSecond;    // Token flow rate per second
        uint256 startTime;        // Stream start timestamp
        uint256 endTime;          // Stream end timestamp
        uint256 lastWithdrawTime; // Last withdrawal timestamp
        StreamStatus status;      // Current stream status
        string streamName;        // Human-readable stream name
    }

    /**
     * @dev Emitted when a new stream is created
     */
    event StreamCreated(
        uint256 indexed streamId,
        address indexed sender,
        address indexed recipient,
        address token,
        uint256 totalAmount,
        uint256 ratePerSecond,
        uint256 startTime,
        uint256 endTime,
        string streamName
    );

    /**
     * @dev Emitted when funds are withdrawn from a stream
     */
    event StreamWithdrawn(
        uint256 indexed streamId,
        address indexed recipient,
        uint256 amount,
        uint256 timestamp
    );

    /**
     * @dev Emitted when a stream is paused
     */
    event StreamPaused(
        uint256 indexed streamId,
        uint256 timestamp
    );

    /**
     * @dev Emitted when a stream is resumed
     */
    event StreamResumed(
        uint256 indexed streamId,
        uint256 timestamp
    );

    /**
     * @dev Emitted when a stream is cancelled
     */
    event StreamCancelled(
        uint256 indexed streamId,
        uint256 refundedAmount,
        uint256 timestamp
    );

    /**
     * @dev Emitted when a stream is completed
     */
    event StreamCompleted(
        uint256 indexed streamId,
        uint256 timestamp
    );

    /**
     * @dev Create a new streaming payment
     * @param recipient Address to receive the stream
     * @param token ERC20 token address
     * @param totalAmount Total amount to stream
     * @param duration Stream duration in seconds
     * @param streamName Human-readable name for the stream
     * @return streamId The ID of the created stream
     */
    function createStream(
        address recipient,
        address token,
        uint256 totalAmount,
        uint256 duration,
        string memory streamName
    ) external returns (uint256 streamId);

    /**
     * @dev Withdraw available funds from a stream
     * @param streamId The ID of the stream
     */
    function withdrawFromStream(uint256 streamId) external;

    /**
     * @dev Pause an active stream
     * @param streamId The ID of the stream
     */
    function pauseStream(uint256 streamId) external;

    /**
     * @dev Resume a paused stream
     * @param streamId The ID of the stream
     */
    function resumeStream(uint256 streamId) external;

    /**
     * @dev Cancel a stream and refund remaining balance
     * @param streamId The ID of the stream
     */
    function cancelStream(uint256 streamId) external;

    /**
     * @dev Get stream information
     * @param streamId The ID of the stream
     * @return Stream struct with all stream details
     */
    function getStream(uint256 streamId) external view returns (Stream memory);

    /**
     * @dev Calculate available balance for withdrawal
     * @param streamId The ID of the stream
     * @return Available amount that can be withdrawn
     */
    function balanceOf(uint256 streamId) external view returns (uint256);

    /**
     * @dev Get all stream IDs for a sender
     * @param sender Address of the sender
     * @return Array of stream IDs
     */
    function getStreamsBySender(address sender) external view returns (uint256[] memory);

    /**
     * @dev Get all stream IDs for a recipient
     * @param recipient Address of the recipient
     * @return Array of stream IDs
     */
    function getStreamsByRecipient(address recipient) external view returns (uint256[] memory);
}

