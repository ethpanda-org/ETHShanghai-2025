const { time } = require("@nomicfoundation/hardhat-network-helpers");
const { ethers } = require("hardhat");

/**
 * Helper functions for timelock testing
 */

const DELAYS = {
    EMERGENCY: 12 * 60 * 60,        // 12 hours
    WITHDRAWAL: 24 * 60 * 60,       // 1 day  
    BULK_WITHDRAWAL: 3 * 24 * 60 * 60, // 3 days
    REDEMPTION: 2 * 24 * 60 * 60,   // 2 days
    UPGRADE: 7 * 24 * 60 * 60       // 7 days
};

/**
 * Execute a function through timelock with automatic delay detection
 * @param {Contract} timelock - The timelock contract
 * @param {Signer} proposer - Account with PROPOSER_ROLE
 * @param {Signer} executor - Account with EXECUTOR_ROLE (can be anyone if public)
 * @param {string} targetAddress - Target contract address
 * @param {string} calldata - Encoded function call data
 * @param {number} customDelay - Optional custom delay (if not provided, will use automatic detection)
 * @returns {Promise<TransactionResponse>} - The execution transaction
 */
async function executeViaTimelock(timelock, proposer, executor, targetAddress, calldata, customDelay = null) {
    const salt = ethers.randomBytes(32);
    const predecessor = ethers.ZeroHash;
    
    // Schedule the operation
    await timelock.connect(proposer).scheduleWithAutomaticDelay(
        targetAddress,
        0,
        calldata,
        predecessor,
        salt
    );
    
    // If custom delay is provided, use it; otherwise, detect delay from function selector  
    let delay = customDelay;
    if (!delay) {
        const selector = calldata.slice(0, 10); // First 4 bytes + 0x prefix
        delay = await timelock.getOperationDelay(selector);
        if (delay === ethers.MaxUint256) {
            throw new Error(`Function selector ${selector} not configured in timelock`);
        }
    }
    
    // Fast forward time past the delay
    await time.increase(Number(delay) + 1);
    
    // Execute the operation
    return await timelock.connect(executor).execute(
        targetAddress,
        0,
        calldata,
        predecessor,  
        salt
    );
}

/**
 * Execute multiple functions through timelock as a batch
 * @param {Contract} timelock - The timelock contract
 * @param {Signer} proposer - Account with PROPOSER_ROLE
 * @param {Signer} executor - Account with EXECUTOR_ROLE
 * @param {Array<string>} targetAddresses - Array of target contract addresses
 * @param {Array<string>} calldataArray - Array of encoded function call data
 * @returns {Promise<TransactionResponse>} - The batch execution transaction
 */
async function executeBatchViaTimelock(timelock, proposer, executor, targetAddresses, calldataArray) {
    const salt = ethers.randomBytes(32);
    const predecessor = ethers.ZeroHash;
    const values = new Array(targetAddresses.length).fill(0);
    
    // Schedule the batch operation
    await timelock.connect(proposer).scheduleBatchWithAutomaticDelay(
        targetAddresses,
        values,
        calldataArray,
        predecessor,
        salt
    );
    
    // Find the maximum delay among all operations
    let maxDelay = 0;
    for (const calldata of calldataArray) {
        const selector = calldata.slice(0, 10);
        const delay = await timelock.getOperationDelay(selector);
        if (delay > maxDelay) {
            maxDelay = delay;
        }
    }
    
    // Fast forward time past the maximum delay
    await time.increase(Number(maxDelay) + 1);
    
    // Execute the batch operation
    return await timelock.connect(executor).executeBatch(
        targetAddresses,
        values,
        calldataArray,
        predecessor,
        salt
    );
}

/**
 * Helper to execute withdrawProtocolFees through timelock
 */
async function withdrawProtocolFeesViaTimelock(timelock, proposer, executor, aquaFluxCore, assetId, recipient) {
    const calldata = aquaFluxCore.interface.encodeFunctionData("withdrawProtocolFees", [
        assetId,
        recipient
    ]);
    
    return await executeViaTimelock(
        timelock,
        proposer,
        executor,
        await aquaFluxCore.getAddress(),
        calldata,
        DELAYS.WITHDRAWAL
    );
}

/**
 * Helper to execute withdrawAllProtocolFees through timelock
 */
async function withdrawAllProtocolFeesViaTimelock(timelock, proposer, executor, aquaFluxCore, assetIds, recipient) {
    const calldata = aquaFluxCore.interface.encodeFunctionData("withdrawAllProtocolFees", [
        assetIds,
        recipient
    ]);
    
    return await executeViaTimelock(
        timelock,
        proposer,
        executor,
        await aquaFluxCore.getAddress(),
        calldata,
        DELAYS.BULK_WITHDRAWAL
    );
}

/**
 * Helper to execute withdrawForRedemption through timelock
 */
async function withdrawForRedemptionViaTimelock(timelock, proposer, executor, aquaFluxCore, assetId, amount) {
    const calldata = aquaFluxCore.interface.encodeFunctionData("withdrawForRedemption", [
        assetId,
        amount
    ]);
    
    return await executeViaTimelock(
        timelock,
        proposer,
        executor,
        await aquaFluxCore.getAddress(),
        calldata,
        DELAYS.REDEMPTION
    );
}

/**
 * Helper to execute setDistributionConfig through timelock (replaces injectRedemptionRevenue)
 */
async function setDistributionConfigViaTimelock(timelock, proposer, executor, aquaFluxCore, assetId, tokenAddress, distributionAddress, amount) {
    const calldata = aquaFluxCore.interface.encodeFunctionData("setDistributionConfig", [
        assetId,
        tokenAddress,
        distributionAddress,
        amount
    ]);
    
    return await executeViaTimelock(
        timelock,
        proposer,
        executor,
        await aquaFluxCore.getAddress(),
        calldata,
        DELAYS.WITHDRAWAL
    );
}

/**
 * Grant direct timelock role for testing (alternative approach)
 * This bypasses timelock delays for faster testing
 */
async function grantTimelockRoleForTesting(aquaFluxCore, admin, testAccount) {
    const TIMELOCK_ROLE = await aquaFluxCore.TIMELOCK_ROLE();
    await aquaFluxCore.connect(admin).grantRole(TIMELOCK_ROLE, testAccount.address);
}

/**
 * Execute a function call that's expected to fail through timelock
 * This allows testing error conditions while respecting timelock requirements
 */
async function executeViaTimelockExpectingFailure(timelock, proposer, executor, targetAddress, calldata, expectedError, customDelay = null) {
    const salt = ethers.randomBytes(32);
    const predecessor = ethers.ZeroHash;
    
    // Schedule the operation
    await timelock.connect(proposer).scheduleWithAutomaticDelay(
        targetAddress,
        0,
        calldata,
        predecessor,
        salt
    );
    
    // If custom delay is provided, use it; otherwise, detect delay from function selector  
    let delay = customDelay;
    if (!delay) {
        const selector = calldata.slice(0, 10); // First 4 bytes + 0x prefix
        delay = await timelock.getOperationDelay(selector);
        if (delay === ethers.MaxUint256) {
            throw new Error(`Function selector ${selector} not configured in timelock`);
        }
    }
    
    // Fast forward time past the delay
    await time.increase(Number(delay) + 1);
    
    // Execute the operation expecting it to fail
    if (expectedError) {
        return await expect(timelock.connect(executor).execute(
            targetAddress,
            0,
            calldata,
            predecessor,  
            salt
        )).to.be.revertedWith(expectedError);
    } else {
        return await expect(timelock.connect(executor).execute(
            targetAddress,
            0,
            calldata,
            predecessor,  
            salt
        )).to.be.reverted;
    }
}

/**
 * Set up timelock with roles for testing
 */
async function setupTimelockForTesting(timelock, admin, proposer, executor) {
    const PROPOSER_ROLE = await timelock.PROPOSER_ROLE();
    const EXECUTOR_ROLE = await timelock.EXECUTOR_ROLE();
    const EMERGENCY_ROLE = await timelock.EMERGENCY_ROLE();
    
    // Grant roles if not already granted
    if (!await timelock.hasRole(PROPOSER_ROLE, proposer.address)) {
        await timelock.connect(admin).grantRole(PROPOSER_ROLE, proposer.address);
    }
    if (!await timelock.hasRole(EXECUTOR_ROLE, executor.address)) {
        await timelock.connect(admin).grantRole(EXECUTOR_ROLE, executor.address);
    }
    
    // Grant emergency role for testing
    if (!await timelock.hasRole(EMERGENCY_ROLE, admin.address)) {
        await timelock.connect(admin).grantRole(EMERGENCY_ROLE, admin.address);
    }
    
    return { PROPOSER_ROLE, EXECUTOR_ROLE, EMERGENCY_ROLE };
}

module.exports = {
    DELAYS,
    executeViaTimelock,
    executeBatchViaTimelock,
    executeViaTimelockExpectingFailure,
    withdrawProtocolFeesViaTimelock,
    withdrawAllProtocolFeesViaTimelock,
    withdrawForRedemptionViaTimelock,
    setDistributionConfigViaTimelock,
    grantTimelockRoleForTesting,
    setupTimelockForTesting
};