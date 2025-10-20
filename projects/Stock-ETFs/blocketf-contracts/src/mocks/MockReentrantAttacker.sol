// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IETFRouterV1.sol";
import "../interfaces/IBlockETFCore.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title MockReentrantAttacker
 * @notice Mock contract for testing reentrancy protection
 * @dev Attempts various reentrancy attack patterns
 */
contract MockReentrantAttacker {
    IETFRouterV1 public router;
    IERC20 public usdt;
    IBlockETFCore public etfCore;

    bool public attacking = false;
    uint256 public attackCount = 0;

    constructor(address _router, address _usdt, address _etfCore) {
        router = IETFRouterV1(_router);
        usdt = IERC20(_usdt);
        etfCore = IBlockETFCore(_etfCore);
    }

    // Direct reentrancy attack
    function attack() external {
        attacking = true;
        attackCount = 0;

        // Approve and call mintWithUSDT
        usdt.approve(address(router), type(uint256).max);
        router.mintWithUSDT(1000e18, 0, block.timestamp + 300);

        attacking = false;
    }

    // Indirect reentrancy via callback
    function attackIndirect() external {
        attacking = true;
        attackCount = 0;

        usdt.approve(address(router), type(uint256).max);
        router.mintExactShares(1e18, 2000e18, block.timestamp + 300);

        attacking = false;
    }

    // Cross-function reentrancy
    function attackCrossFunction() external {
        attacking = true;
        attackCount = 0;

        usdt.approve(address(router), type(uint256).max);
        router.mintWithUSDT(1000e18, 0, block.timestamp + 300);

        attacking = false;
    }

    // Attack via swap callback
    function attackViaSwapCallback() external {
        attacking = true;
        attackCount = 0;

        usdt.approve(address(router), type(uint256).max);
        router.mintWithUSDT(1000e18, 0, block.timestamp + 300);

        attacking = false;
    }

    // Attack during burn
    function attackDuringBurn(uint256 shares) external {
        attacking = true;
        attackCount = 0;

        IERC20(address(etfCore)).approve(address(router), type(uint256).max);
        router.burnToUSDT(shares, 0, block.timestamp + 300);

        attacking = false;
    }

    // Fallback and receive to attempt reentrancy
    receive() external payable {
        if (attacking && attackCount < 2) {
            attackCount++;
            // Try to reenter
            try router.mintWithUSDT(100e18, 0, block.timestamp + 300) {
                // Reentrancy succeeded (should not happen)
            } catch {
                // Reentrancy blocked (expected)
            }
        }
    }

    fallback() external payable {
        if (attacking && attackCount < 2) {
            attackCount++;
            // Try to reenter with different function
            try router.mintExactShares(0.1e18, 200e18, block.timestamp + 300) {
                // Reentrancy succeeded (should not happen)
            } catch {
                // Reentrancy blocked (expected)
            }
        }
    }

    // Token callback hooks (used by some ERC20s and DEXs)
    function tokensReceived(address, address, uint256) external {
        if (attacking && attackCount < 2) {
            attackCount++;
            // Try to reenter
            try router.burnToUSDT(0.5e18, 0, block.timestamp + 300) {
                // Reentrancy succeeded (should not happen)
            } catch {
                // Reentrancy blocked (expected)
            }
        }
    }

    // Uniswap V3 swap callback
    function uniswapV3SwapCallback(int256, int256, bytes calldata) external {
        if (attacking && attackCount < 2) {
            attackCount++;
            // Try to reenter during swap
            try router.mintWithUSDT(100e18, 0, block.timestamp + 300) {
                // Reentrancy succeeded (should not happen)
            } catch {
                // Reentrancy blocked (expected)
            }
        }
    }

    // PancakeSwap callback
    function pancakeV3SwapCallback(int256, int256, bytes calldata) external {
        if (attacking && attackCount < 2) {
            attackCount++;
            // Try to reenter during swap
            try router.mintExactShares(0.1e18, 200e18, block.timestamp + 300) {
                // Reentrancy succeeded (should not happen)
            } catch {
                // Reentrancy blocked (expected)
            }
        }
    }
}
