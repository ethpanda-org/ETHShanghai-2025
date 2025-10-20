// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/IBlockETFCore.sol";
import "../interfaces/IPriceOracle.sol";
import "../interfaces/IRebalanceCallback.sol";

/**
 * @title MockBlockETFCore
 * @notice Mock implementation of BlockETFCore for testing
 */
contract MockBlockETFCore is ERC20, Ownable, IBlockETFCore {
    IPriceOracle public priceOracle;
    AssetInfo[] private assets;
    FeeInfo private feeInfo;
    uint256 private targetTotalValueUSD;
    bool private _paused;
    bool private _needsRebalance; // For testing
    uint256 private _mockTotalValueBefore; // Value before rebalance
    uint256 private _mockTotalValueAfter; // Value after rebalance
    bool private _useMockTotalValue; // Flag to use mock value
    bool private _flashRebalanceCalled; // Track if flashRebalance was called
    int256[] private _mockRebalanceAmounts; // Mock amounts for rebalance callback
    bool private _useMockAmounts; // Flag to use mock amounts
    bool private _skipVerification; // Flag to skip verification for testing

    constructor(address _priceOracle) ERC20("Mock Block ETF", "METF") Ownable(msg.sender) {
        priceOracle = IPriceOracle(_priceOracle);
    }

    function initialize(address[] calldata _assets, uint32[] calldata _weights, uint256 _targetTotalValueUSD)
        external
        override
        onlyOwner
    {
        require(_assets.length == _weights.length, "Length mismatch");

        // Clear existing assets
        delete assets;

        // Calculate initial amounts and transfer from caller
        uint256[] memory initialAmounts = new uint256[](_assets.length);

        for (uint256 i = 0; i < _assets.length; i++) {
            // Calculate value for this asset based on weight
            uint256 assetValueUSD = (_targetTotalValueUSD * _weights[i]) / 10000;
            uint256 assetPrice = priceOracle.getPrice(_assets[i]);

            // Calculate required amount of tokens
            uint256 assetAmount = (assetValueUSD * 1e18) / assetPrice;
            initialAmounts[i] = assetAmount;

            // Transfer tokens from caller and update reserves
            IERC20(_assets[i]).transferFrom(msg.sender, address(this), assetAmount);

            assets.push(AssetInfo({token: _assets[i], weight: _weights[i], reserve: uint224(assetAmount)}));
        }

        targetTotalValueUSD = _targetTotalValueUSD;

        // Mint initial shares to this contract based on target value
        uint256 initialShares = _targetTotalValueUSD;
        _mint(address(this), initialShares);

        emit Initialized(_assets, _weights, initialAmounts, _targetTotalValueUSD, _targetTotalValueUSD);
    }

    function mint(address to) external override returns (uint256 shares) {
        // Calculate shares based on assets received
        uint256[] memory amounts = new uint256[](assets.length);
        uint256[] memory balances = new uint256[](assets.length);

        // Check how much of each asset we received
        for (uint256 i = 0; i < assets.length; i++) {
            uint256 currentBalance = IERC20(assets[i].token).balanceOf(address(this));
            uint256 received = currentBalance - uint256(assets[i].reserve);
            amounts[i] = received;
            balances[i] = currentBalance;
        }

        // Calculate shares using the same logic as calculateMintShares
        shares = this.calculateMintShares(amounts);

        // Update reserves
        for (uint256 i = 0; i < assets.length; i++) {
            assets[i].reserve = uint224(balances[i]);
        }

        // Mint shares to recipient
        _mint(to, shares);

        emit Mint(to, shares, amounts);
    }

    function mintExactShares(uint256 shares, address to) external override returns (uint256[] memory amounts) {
        amounts = this.calculateRequiredAmounts(shares);

        // Transfer required assets from caller
        for (uint256 i = 0; i < assets.length; i++) {
            if (amounts[i] > 0) {
                IERC20(assets[i].token).transferFrom(msg.sender, address(this), amounts[i]);
                assets[i].reserve += uint224(amounts[i]);
            }
        }

        // Mint ETF shares
        _mint(to, shares);

        emit Mint(to, shares, amounts);
    }

    function burn(uint256 shares, address to) external override returns (uint256[] memory amounts) {
        amounts = this.calculateBurnAmounts(shares);

        // Burn shares first
        _burn(msg.sender, shares);

        // Transfer assets to user
        for (uint256 i = 0; i < assets.length; i++) {
            if (amounts[i] > 0) {
                IERC20(assets[i].token).transfer(to, amounts[i]);
                assets[i].reserve -= uint224(amounts[i]);
            }
        }

        emit Burn(msg.sender, shares, amounts);
    }

    function calculateRequiredAmounts(uint256 shares) external view override returns (uint256[] memory amounts) {
        amounts = new uint256[](assets.length);

        if (totalSupply() == 0) {
            // First mint: use target value to calculate amounts
            for (uint256 i = 0; i < assets.length; i++) {
                uint256 assetValueUSD = (targetTotalValueUSD * assets[i].weight) / 10000;
                uint256 assetPrice = priceOracle.getPrice(assets[i].token);
                // Calculate token amount needed: (USD value / token price) * shares / target_total_shares
                amounts[i] = (assetValueUSD * 1e18 * shares) / (assetPrice * targetTotalValueUSD);
            }
        } else {
            // Subsequent mints: proportional to existing reserves
            for (uint256 i = 0; i < assets.length; i++) {
                amounts[i] = (uint256(assets[i].reserve) * shares) / totalSupply();
            }
        }
    }

    function calculateBurnAmounts(uint256 shares) external view override returns (uint256[] memory amounts) {
        amounts = new uint256[](assets.length);

        for (uint256 i = 0; i < assets.length; i++) {
            amounts[i] = (uint256(assets[i].reserve) * shares) / totalSupply();
        }
    }

    function calculateMintShares(uint256[] calldata amounts) external view override returns (uint256) {
        if (totalSupply() == 0) {
            return targetTotalValueUSD; // Initial shares equal to target value
        }

        // Calculate based on proportional value
        uint256 totalValueAdded = 0;
        for (uint256 i = 0; i < assets.length; i++) {
            uint256 assetPrice = priceOracle.getPrice(assets[i].token);
            totalValueAdded += amounts[i] * assetPrice / 1e18;
        }

        uint256 currentTotalValue = getTotalValue();
        return (totalValueAdded * totalSupply()) / currentTotalValue;
    }

    function getAssets() external view override returns (AssetInfo[] memory) {
        return assets;
    }

    function getFeeInfo() external view override returns (FeeInfo memory) {
        return feeInfo;
    }

    function getTotalValue() public view override returns (uint256 totalValue) {
        // If mock value is set, return different values before/after flashRebalance
        if (_useMockTotalValue) {
            if (_flashRebalanceCalled) {
                return _mockTotalValueAfter;
            } else {
                return _mockTotalValueBefore;
            }
        }

        // Otherwise calculate from reserves
        for (uint256 i = 0; i < assets.length; i++) {
            uint256 assetPrice = priceOracle.getPrice(assets[i].token);
            totalValue += (uint256(assets[i].reserve) * assetPrice) / 1e18;
        }
    }

    function getShareValue() external view override returns (uint256) {
        if (totalSupply() == 0) return 0;
        return getTotalValue() * 1e18 / totalSupply();
    }

    function getAnnualManagementFee() external view override returns (uint256) {
        return feeInfo.managementFeeRate;
    }

    function isPaused() external view override returns (bool) {
        return _paused;
    }

    // Admin functions - simplified implementations
    function setFees(uint32 withdrawFee, uint256 annualManagementFeeBps) external override onlyOwner {
        feeInfo.withdrawFee = withdrawFee;
        feeInfo.managementFeeRate = uint128(annualManagementFeeBps);
        emit FeeUpdated(withdrawFee, annualManagementFeeBps);
    }

    function collectManagementFee() external override onlyOwner returns (uint256) {
        emit ManagementFeeCollected(owner(), 0, 0);
        return 0;
    }

    function setPriceOracle(address oracle) external override onlyOwner {
        priceOracle = IPriceOracle(oracle);
        emit PriceOracleUpdated(oracle);
    }

    function setRebalancer(address rebalancer) external override onlyOwner {
        emit RebalancerUpdated(rebalancer);
    }

    function setRebalanceThreshold(uint256 threshold) external override onlyOwner {
        emit RebalanceThresholdUpdated(threshold);
    }

    function adjustWeights(uint32[] calldata newWeights) external override onlyOwner {
        require(newWeights.length == assets.length, "Length mismatch");

        address[] memory assetTokens = new address[](assets.length);
        for (uint256 i = 0; i < assets.length; i++) {
            assets[i].weight = newWeights[i];
            assetTokens[i] = assets[i].token;
        }

        emit WeightsAdjusted(assetTokens, newWeights);
    }

    function executeRebalance() external override onlyOwner {
        uint256[] memory oldWeights = new uint256[](assets.length);
        uint256[] memory newWeights = new uint256[](assets.length);

        for (uint256 i = 0; i < assets.length; i++) {
            oldWeights[i] = assets[i].weight;
            newWeights[i] = assets[i].weight;
        }

        emit Rebalanced(oldWeights, newWeights);
    }

    function flashRebalance(address receiver, bytes calldata data) external override onlyOwner {
        // Prepare mock rebalance data
        address[] memory assetAddresses = new address[](assets.length);
        int256[] memory amounts;

        for (uint256 i = 0; i < assets.length; i++) {
            assetAddresses[i] = assets[i].token;
        }

        // Use mock amounts if set, otherwise use zeros
        if (_useMockAmounts && _mockRebalanceAmounts.length == assets.length) {
            amounts = new int256[](assets.length);
            for (uint256 i = 0; i < assets.length; i++) {
                amounts[i] = _mockRebalanceAmounts[i];
            }
        } else {
            // Default: no rebalancing needed
            amounts = new int256[](assets.length);
            for (uint256 i = 0; i < assets.length; i++) {
                amounts[i] = 0;
            }
        }

        // Transfer assets to receiver before callback (flash loan behavior)
        // Positive amounts = assets to sell, negative amounts = assets to buy
        for (uint256 i = 0; i < assets.length; i++) {
            if (amounts[i] > 0) {
                // Send assets to receiver for selling
                uint256 amount = uint256(amounts[i]);
                IERC20(assets[i].token).transfer(receiver, amount);
                assets[i].reserve -= uint224(amount);
            }
        }

        // Mark that flashRebalance was called (for getTotalValue mock)
        _flashRebalanceCalled = true;

        // Call the rebalance callback
        IRebalanceCallback(receiver).rebalanceCallback(assetAddresses, amounts, data);

        // After callback, receiver should have returned all assets
        // Update reserves from actual balances
        for (uint256 i = 0; i < assets.length; i++) {
            uint256 currentBalance = IERC20(assets[i].token).balanceOf(address(this));
            assets[i].reserve = uint224(currentBalance);
        }
    }

    /// @notice Helper function for testing - set mock rebalance amounts
    function setMockRebalanceAmounts(int256[] memory amounts) external {
        require(amounts.length == assets.length, "Length mismatch");
        delete _mockRebalanceAmounts;
        for (uint256 i = 0; i < amounts.length; i++) {
            _mockRebalanceAmounts.push(amounts[i]);
        }
        _useMockAmounts = true;
    }

    /// @notice Helper function for testing - clear mock rebalance amounts
    function clearMockRebalanceAmounts() external {
        delete _mockRebalanceAmounts;
        _useMockAmounts = false;
    }

    function getRebalanceInfo()
        external
        view
        override
        returns (uint256[] memory currentWeights, uint256[] memory targetWeights, bool needsRebalance)
    {
        currentWeights = new uint256[](assets.length);
        targetWeights = new uint256[](assets.length);

        for (uint256 i = 0; i < assets.length; i++) {
            currentWeights[i] = assets[i].weight;
            targetWeights[i] = assets[i].weight;
        }

        needsRebalance = _needsRebalance;
    }

    /// @notice Helper function for testing - set rebalance need
    function setNeedsRebalance(bool needs) external {
        _needsRebalance = needs;
    }

    /// @notice Helper function for testing - set mock total value (before and after)
    function setMockTotalValue(uint256 valueBefore, uint256 valueAfter) external {
        _mockTotalValueBefore = valueBefore;
        _mockTotalValueAfter = valueAfter;
        _useMockTotalValue = true;
        _flashRebalanceCalled = false; // Reset flag
    }

    /// @notice Helper function for testing - set mock value after rebalance
    function setTotalValueAfter(uint256 valueAfter) external {
        if (!_useMockTotalValue) {
            _mockTotalValueBefore = getTotalValue();
            _useMockTotalValue = true;
        }
        _mockTotalValueAfter = valueAfter;
        _flashRebalanceCalled = false; // Reset flag
    }

    /// @notice Helper function for testing - clear mock total value
    function clearMockTotalValue() external {
        _useMockTotalValue = false;
        _flashRebalanceCalled = false;
        _mockTotalValueBefore = 0;
        _mockTotalValueAfter = 0;
    }

    /// @notice Helper function for testing - skip verification
    function setSkipVerification(bool skip) external {
        _skipVerification = skip;
    }

    function pause() external override onlyOwner {
        _paused = true;
        emit Paused();
    }

    function unpause() external override onlyOwner {
        _paused = false;
        emit Unpaused();
    }
}
