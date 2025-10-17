# Configurable Rebalance Verification Thresholds

## Overview

This document describes the configurable thresholds feature for rebalance verification in BlockETFCore.sol. This enhancement allows the contract owner to adjust verification parameters without redeploying the contract.

## Motivation

Different market conditions require different tolerance levels:
- **High Volatility**: Need higher slippage tolerance to execute rebalances
- **Low Volatility**: Can use stricter thresholds for better protection
- **Different Assets**: Some asset pairs have naturally higher slippage
- **Governance**: Owner can optimize parameters based on real-world performance

## Configurable Parameters

### 1. Max Slippage (maxSlippageBps)
- **Purpose**: Maximum acceptable slippage on sell operations
- **Default**: 200 bps (2%)
- **Range**: 0 - 1000 bps (0% - 10%)
- **Usage**: Sell verification checks actual slippage against this threshold

### 2. Max Buy Excess (maxBuyExcessBps)
- **Purpose**: Maximum excess amount allowed when buying assets
- **Default**: 500 bps (5%)
- **Range**: 0 - 1000 bps (0% - 10%)
- **Usage**: Prevents buying too much (manipulation protection)

### 3. Max Total Value Loss (maxTotalValueLossBps)
- **Purpose**: Maximum total portfolio value loss during rebalance
- **Default**: 500 bps (5%)
- **Range**: 0 - 1000 bps (0% - 10%)
- **Usage**: Global protection against excessive value loss

### 4. Weight Improvement Tolerance (weightImprovementToleranceBps)
- **Purpose**: Tolerance for weight distribution improvement
- **Default**: 200 bps (2%)
- **Range**: 0 - 500 bps (0% - 5%)
- **Usage**: Allows slight weight deviation degradation for gas efficiency

### 5. Unchanged Asset Tolerance (unchangedAssetToleranceBps)
- **Purpose**: Tolerance for assets that shouldn't change
- **Default**: 1 bps (0.01%)
- **Range**: 0 - 100 bps (0% - 1%)
- **Usage**: Detects unexpected balance changes in non-rebalanced assets

## Implementation

### State Variables

```solidity
uint256 public maxSlippageBps;
uint256 public maxBuyExcessBps;
uint256 public maxTotalValueLossBps;
uint256 public weightImprovementToleranceBps;
uint256 public unchangedAssetToleranceBps;
```

### Setter Function

```solidity
function setRebalanceVerificationThresholds(
    uint256 _maxSlippageBps,
    uint256 _maxBuyExcessBps,
    uint256 _maxTotalValueLossBps,
    uint256 _weightImprovementToleranceBps,
    uint256 _unchangedAssetToleranceBps
) external onlyOwner
```

**Validations**:
- Only owner can call
- Each parameter has maximum allowed value
- Reverts with `ThresholdTooLarge` if exceeded

### Event

```solidity
event RebalanceVerificationThresholdsUpdated(
    uint256 maxSlippageBps,
    uint256 maxBuyExcessBps,
    uint256 maxTotalValueLossBps,
    uint256 weightImprovementToleranceBps,
    uint256 unchangedAssetToleranceBps
);
```

## Safety Limits

Each threshold has a maximum allowed value to prevent dangerous configurations:

| Parameter | Max Allowed | Reason |
|-----------|-------------|--------|
| maxSlippageBps | 1000 (10%) | Higher slippage = severe value loss risk |
| maxBuyExcessBps | 1000 (10%) | Higher excess = manipulation risk |
| maxTotalValueLossBps | 1000 (10%) | Portfolio should not lose >10% in one rebalance |
| weightImprovementToleranceBps | 500 (5%) | Weight should improve meaningfully |
| unchangedAssetToleranceBps | 100 (1%) | Unchanged assets shouldn't vary much |

## Usage Examples

### Example 1: Relax Slippage for High Volatility

```solidity
// During high volatility, increase slippage tolerance from 2% to 5%
etf.setRebalanceVerificationThresholds(
    500,  // maxSlippageBps: 5% (was 2%)
    500,  // maxBuyExcessBps: keep at 5%
    500,  // maxTotalValueLossBps: keep at 5%
    200,  // weightImprovementToleranceBps: keep at 2%
    1     // unchangedAssetToleranceBps: keep at 0.01%
);
```

### Example 2: Stricter Controls for Stable Markets

```solidity
// In stable markets, use stricter thresholds
etf.setRebalanceVerificationThresholds(
    100,  // maxSlippageBps: 1% (stricter)
    300,  // maxBuyExcessBps: 3% (stricter)
    300,  // maxTotalValueLossBps: 3% (stricter)
    100,  // weightImprovementToleranceBps: 1% (stricter)
    1     // unchangedAssetToleranceBps: keep at 0.01%
);
```

### Example 3: Maximum Safety

```solidity
// Maximum allowed safety limits
etf.setRebalanceVerificationThresholds(
    1000,  // maxSlippageBps: 10% (max)
    1000,  // maxBuyExcessBps: 10% (max)
    1000,  // maxTotalValueLossBps: 10% (max)
    500,   // weightImprovementToleranceBps: 5% (max)
    100    // unchangedAssetToleranceBps: 1% (max)
);
```

### Example 4: Zero Tolerance (Very Strict)

```solidity
// Strictest possible configuration (may cause rebalances to fail)
etf.setRebalanceVerificationThresholds(
    0,  // maxSlippageBps: no slippage allowed
    0,  // maxBuyExcessBps: exact amounts only
    0,  // maxTotalValueLossBps: no value loss
    0,  // weightImprovementToleranceBps: must improve
    0   // unchangedAssetToleranceBps: no change allowed
);
```

## Testing

14 comprehensive tests verify the feature:

### Default Values
- ✅ All parameters initialize with correct defaults

### Setter Functionality
- ✅ Owner can update all thresholds
- ✅ Non-owner cannot update (reverts)
- ✅ Event is emitted on update

### Validation
- ✅ Reverts if maxSlippageBps > 1000
- ✅ Reverts if maxBuyExcessBps > 1000
- ✅ Reverts if maxTotalValueLossBps > 1000
- ✅ Reverts if weightImprovementToleranceBps > 500
- ✅ Reverts if unchangedAssetToleranceBps > 100

### Boundary Cases
- ✅ Can set all to maximum allowed values
- ✅ Can set all to zero (strictest)

### Multiple Updates
- ✅ Can update multiple times
- ✅ Parameters are independent

### Gas Efficiency
- ✅ Gas usage is reasonable (<100k)

## Benefits

### 1. **Flexibility**
- Adapt to market conditions without redeployment
- Fine-tune based on real-world performance
- Different strategies for different assets

### 2. **Safety**
- Hard-coded maximum limits prevent dangerous configurations
- Owner-only access prevents unauthorized changes
- Events provide transparency and auditability

### 3. **Cost Efficiency**
- No contract redeployment needed
- Single transaction to update all parameters
- Gas-efficient implementation

### 4. **Governance**
- Owner can optimize parameters based on data
- Community feedback can be incorporated
- Progressive tightening as system matures

## Best Practices

### Recommendation 1: Start Conservative
```solidity
// Initial deployment: conservative defaults
maxSlippageBps = 200;              // 2%
maxBuyExcessBps = 500;             // 5%
maxTotalValueLossBps = 500;        // 5%
weightImprovementToleranceBps = 200; // 2%
unchangedAssetToleranceBps = 1;    // 0.01%
```

### Recommendation 2: Monitor and Adjust
- Track rebalance success/failure rates
- Monitor actual slippage observed
- Adjust thresholds based on data

### Recommendation 3: Document Changes
- Log reason for each threshold change
- Track performance before/after adjustment
- Maintain historical records

### Recommendation 4: Gradual Changes
- Don't make large threshold changes suddenly
- Test with small adjustments first
- Monitor impact before further changes

## Migration Notes

### For Existing Deployments
- Constructor initializes all thresholds with defaults
- Behavior identical to pre-configurability version
- No action needed unless customization desired

### Storage Layout
New state variables added:
```solidity
uint256 public maxSlippageBps;                    // Slot X
uint256 public maxBuyExcessBps;                   // Slot X+1
uint256 public maxTotalValueLossBps;              // Slot X+2
uint256 public weightImprovementToleranceBps;     // Slot X+3
uint256 public unchangedAssetToleranceBps;        // Slot X+4
```

Total: 5 new storage slots

## Gas Costs

| Operation | Gas Cost |
|-----------|----------|
| Read threshold (view) | ~2,100 per slot |
| Update all thresholds | ~38,000 |
| Event emission | ~2,000 |

## Security Considerations

### What Could Go Wrong?

1. **Setting Thresholds Too High**
   - **Risk**: Rebalances could lose significant value
   - **Mitigation**: Hard-coded maximum limits (10% max)

2. **Setting Thresholds Too Low**
   - **Risk**: All rebalances might fail
   - **Mitigation**: Can always increase if needed

3. **Unauthorized Changes**
   - **Risk**: Malicious threshold modifications
   - **Mitigation**: onlyOwner modifier

### What's Protected?

✅ **Maximum limits prevent extreme values**
✅ **Owner-only access control**
✅ **Events provide audit trail**
✅ **Independent parameter validation**
✅ **No reentrancy concerns (pure state change)**

## Future Enhancements

Potential improvements:

1. **Time-lock for changes**: Require delay before taking effect
2. **Two-step configuration**: Propose → Confirm pattern
3. **Per-asset thresholds**: Different slippage for different assets
4. **Automatic adjustment**: Algorithmic threshold optimization
5. **Emergency override**: Pause rebalancing if thresholds breached repeatedly

## Conclusion

The configurable thresholds feature provides:
- ✅ **Flexibility** to adapt to market conditions
- ✅ **Safety** with hard-coded maximum limits
- ✅ **Simplicity** with single-function updates
- ✅ **Transparency** through events
- ✅ **Testing** with 14 comprehensive tests

This enhancement maintains backward compatibility while adding powerful governance capabilities for optimal rebalance verification.