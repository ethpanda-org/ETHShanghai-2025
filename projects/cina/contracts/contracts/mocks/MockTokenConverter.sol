// SPDX-License-Identifier: MIT

pragma solidity ^0.8.26;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { ITokenConverter } from "../helpers/interfaces/ITokenConverter.sol";

/**
 * @title MockTokenConverter
 * @notice Mock implementation of ITokenConverter for testing purposes
 * @dev This is a simplified converter that doesn't perform real swaps
 */
contract MockTokenConverter is ITokenConverter {
  using SafeERC20 for IERC20;

  /*************
   * Constants *
   *************/

  /// @dev The address of WETH token on Ethereum mainnet
  address internal constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;

  /*************
   * Variables *
   *************/

  /// @inheritdoc ITokenConverter
  address public immutable registry;

  /// @notice Mock conversion rate (18 decimals, 1.0 = no change)
  uint256 public mockRate = 1e18;

  /***************
   * Constructor *
   ***************/

  constructor() {
    // For testing, registry can be address(this)
    registry = address(this);
  }

  /****************************
   * Admin Functions          *
   ****************************/

  /// @notice Set mock conversion rate
  /// @param _rate The new rate (18 decimals)
  function setMockRate(uint256 _rate) external {
    mockRate = _rate;
  }

  /*************************
   * Public View Functions *
   *************************/

  /// @inheritdoc ITokenConverter
  function getTokenPair(uint256 /*route*/) external pure returns (address tokenIn, address tokenOut) {
    // Mock implementation: return zero addresses
    return (address(0), address(0));
  }

  /// @inheritdoc ITokenConverter
  function queryConvert(uint256 /*encoding*/, uint256 amountIn) external view returns (uint256 amountOut) {
    // Mock implementation: apply simple rate conversion
    return (amountIn * mockRate) / 1e18;
  }

  /****************************
   * Public Mutated Functions *
   ****************************/

  /// @inheritdoc ITokenConverter
  function convert(
    uint256 encoding,
    uint256 amountIn,
    address recipient
  ) external payable returns (uint256 amountOut) {
    // Extract basic info from encoding
    uint256 poolType = (encoding >> 248) & 0xff;

    // For mock, just calculate output amount
    amountOut = (amountIn * mockRate) / 1e18;

    // In a real implementation, this would:
    // 1. Decode the encoding to get pool type and parameters
    // 2. Execute the swap through the appropriate DEX
    // 3. Return the actual output amount

    // For testing, we just return the mock calculated amount
    // The actual token transfers would be handled by the calling contract

    return amountOut;
  }

  /// @inheritdoc ITokenConverter
  function withdrawFund(address token, address recipient) external {
    if (token == address(0)) {
      // Withdraw ETH
      uint256 balance = address(this).balance;
      if (balance > 0) {
        (bool success, ) = recipient.call{value: balance}("");
        require(success, "ETH transfer failed");
      }
    } else {
      // Withdraw ERC20
      uint256 balance = IERC20(token).balanceOf(address(this));
      if (balance > 0) {
        IERC20(token).safeTransfer(recipient, balance);
      }
    }
  }

  /// @notice Allow contract to receive ETH
  receive() external payable {}
}
