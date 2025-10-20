/*
 * Copyright 2025 Circle Internet Group, Inc. All rights reserved.

 * SPDX-License-Identifier: GPL-3.0-or-later

 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.

 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.

 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
pragma solidity ^0.8.24;

import {IEntryPoint} from "@account-abstraction-v8/contracts/interfaces/IEntryPoint.sol";
import {IWETH} from "@uniswap/swap-router-contracts/contracts/interfaces/IWETH.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";
import {BasePaymaster} from "./BasePaymaster.sol";
import {FeeLib} from "../utils/FeeLib.sol";
import {PriceOracleHelper, IOracle} from "../utils/PriceOracleHelper.sol";
import {ISwapRouter} from "../interfaces/ISwapRouter.sol";
import {Denylistable} from "../utils/Denylistable.sol";
import {Rescuable} from "../utils/Rescuable.sol";

uint256 constant PAYMASTER_TOKEN_ADDRESS_OFFSET = 20 + 32 + 1; // 20 bytes for token address, 32 bytes for paymaster gas limit, 1 byte gap for future use
uint256 constant PAYMASTER_PERMIT_AMOUNT_OFFSET = PAYMASTER_TOKEN_ADDRESS_OFFSET + 20;
uint256 constant PAYMASTER_PERMIT_SIGNATURE_OFFSET = PAYMASTER_PERMIT_AMOUNT_OFFSET + 32;

/**
 * @notice A token paymaster that allows compatible SCAs to pay for gas using ERC-20 tokens.
 */
contract BaseTokenPaymaster is BasePaymaster, PriceOracleHelper, Denylistable, Rescuable {
    using SafeERC20 for IERC20;

    /**
     * @notice The ERC20 token this paymaster accepts as payment. This token should also support permit.
     */
    IERC20 public immutable token;

    /**
     * @notice The native token wrapper used by the swap router.
     */
    IWETH public immutable wrappedNativeToken;

    /**
     * @dev This has been replaced by a uint32 version of additionalGasCharge for storage efficiency.
     */
    uint256 internal _deprecatedAdditionalGasCharge;

    /**
     * @notice Address of the privileged pauser role.
     */
    address public pauser;

    /**
     * @notice Address of the privileged swapper role.
     */
    address public swapper;

    /**
     * @notice The contract to execute swaps against.
     */
    ISwapRouter public swapRouter;

    /**
     * @notice Address of the privileged fee controller role.
     */
    address public feeController;

    /**
     * @notice Additional gas to charge per UserOp (based on gas of postOp).
     */
    uint32 public additionalGasCharge;

    /**
     * @notice The fee spread applied to the token price, in basis points.
     */
    uint32 public feeSpread;

    /**
     * @notice Emitted when a UserOp is succesfully sponsored.
     * @param token the token paid by the sender.
     * @param sender the sender address.
     * @param userOpHash the hash of the UserOp.
     * @param nativeTokenPrice The price of 1 ether = 1e18 wei, denominated in token.
     * @param actualTokenNeeded the final transaction cost to the SCA, denominated in token.
     * @param feeTokenAmount the additional fee charged to the SCA, denominated in token.
     */
    event UserOperationSponsored(
        IERC20 indexed token,
        address indexed sender,
        bytes32 userOpHash,
        uint256 nativeTokenPrice,
        uint256 actualTokenNeeded,
        uint256 feeTokenAmount
    );
    /**
     * @notice Emitted when the pauser has been changed.
     * @param oldPauser the old pauser.
     * @param newPauser the new pauser.
     */
    event PauserChanged(address indexed oldPauser, address indexed newPauser);

    /**
     * @notice Emitted when the swapper has been changed.
     * @param oldSwapper the old swapper.
     * @param newSwapper the new swapper.
     */
    event SwapperChanged(address indexed oldSwapper, address indexed newSwapper);

    /**
     * @notice Emitted when token has been swapped for native token.
     * @param token the input token.
     * @param amountIn the amount of token sent.
     * @param amountOut the amount of native token received.
     */
    event TokenSwappedForNative(IERC20 indexed token, uint256 amountIn, uint256 amountOut);

    /**
     * @notice Emitted when the swap router contract has been changed.
     * @param oldSwapRouter the old swap router.
     * @param newSwapRouter the new swap router.
     */
    event SwapRouterChanged(ISwapRouter oldSwapRouter, ISwapRouter newSwapRouter);

    /**
     * @notice Emitted when the additional gas charge has been changed.
     * @param oldAdditionalGasCharge the old additional gas charge.
     * @param newAdditionalGasCharge the new additional gas charge.
     */
    event AdditionalGasChargeChanged(uint32 oldAdditionalGasCharge, uint32 newAdditionalGasCharge);

    /**
     * @notice Emitted when the fee controller has been changed.
     * @param oldFeeController the old fee controller.
     * @param newFeeController the new fee controller.
     */
    event FeeControllerChanged(address indexed oldFeeController, address indexed newFeeController);

    /**
     * @notice Emitted when the fee spread has been changed.
     * @param oldFeeSpread the old fee spread.
     * @param newFeeSpread the new fee spread.
     */
    event FeeSpreadChanged(uint32 oldFeeSpread, uint32 newFeeSpread);

    /**
     * @notice Reverts when the pauser is expected, but an unauthorized caller is used.
     * @param account the unauthorized caller.
     */
    error UnauthorizedPauser(address account);

    /**
     * @notice Reverts when the swapper is expected, but an unauthorized caller is used.
     * @param account the unauthorized caller.
     */
    error UnauthorizedSwapper(address account);

    /**
     * @notice Reverts when the fee controller is expected, but an unauthorized caller is used.
     * @param account the unauthorized caller.
     */
    error UnauthorizedFeeController(address account);

    /**
     * @notice Reverts when the slippage is set too high.
     * @param bips the unsupported slippage bips.
     */
    error InvalidSlippageBips(uint256 bips);

    /**
     * @notice Reverts when the paymasterAndData specifies an unsupported token.
     * @param token the unsupported token.
     */
    error UnsupportedToken(address token);

    /**
     * @notice Reverts when the paymasterAndData is malformed.
     */
    error MalformedPaymasterData();

    /**
     * @notice Reverts when the UserOp does not specify enough gas to execute the postOp
     * @param actual the given postOpGasLimit.
     * @param expected the minimum postOpGasLimit expected.
     */
    error PostOpGasLimitTooLow(uint256 actual, uint256 expected);

    /**
     * @notice Reverts if an invalid address is set.
     */
    error InvalidAddress();

    modifier onlyPauser() {
        if (pauser != _msgSender()) {
            revert UnauthorizedPauser(_msgSender());
        }
        _;
    }

    modifier onlySwapper() {
        if (swapper != _msgSender()) {
            revert UnauthorizedSwapper(_msgSender());
        }
        _;
    }

    modifier onlyFeeController() {
        if (feeController != _msgSender()) {
            revert UnauthorizedFeeController(_msgSender());
        }
        _;
    }

    function _authorizeUpdateDenylister() internal virtual override onlyOwner {}

    function _authorizeUpdateRescuer() internal virtual override onlyOwner {}

    function _authorizeUpdateOracle() internal virtual override onlyOwner {}

    function _authorizeUserOpSender(address sender) internal virtual notDenylisted(sender) {}

    function _checkNotZeroAddress(address addr) internal virtual {
        if (addr == address(0)) {
            revert InvalidAddress();
        }
    }

    // for immutable values in implementations
    constructor(IEntryPoint _newEntryPoint, IERC20Metadata _token, IWETH _wrappedNativeToken)
        BasePaymaster(_newEntryPoint)
        PriceOracleHelper(_token.decimals())
    {
        token = IERC20(_token);
        wrappedNativeToken = _wrappedNativeToken;
        // lock the implementation contract so it can only be called from proxies
        _disableInitializers();
    }

    /// @dev for initializing freshly deployed proxy contracts
    function initializeAll(
        address _owner,
        uint256 _additionalGasCharge,
        IOracle _oracle,
        ISwapRouter _swapRouter,
        uint32 _feeSpread
    ) public {
        initialize(_owner, _additionalGasCharge, _oracle, _swapRouter);
        initializeV2(_owner, _feeSpread);
    }

    /// @dev for migrating a freshly deployed proxy contract to V1
    function initialize(address _owner, uint256 _additionalGasCharge, IOracle _oracle, ISwapRouter _swapRouter)
        public
        reinitializer(2)
    {
        __BasePaymaster_init(_owner);
        __PriceOracleHelper_init(_oracle);
        _deprecatedAdditionalGasCharge = _additionalGasCharge;
        pauser = _owner;
        swapper = _owner;
        denylister = _owner;
        rescuer = _owner;
        swapRouter = _swapRouter;
    }

    /// @dev for migrating from V1 to V2
    function initializeV2(address _feeController, uint32 _feeSpread) public reinitializer(3) {
        _checkNotZeroAddress(_feeController);
        feeController = _feeController;
        additionalGasCharge = SafeCast.toUint32(_deprecatedAdditionalGasCharge);
        feeSpread = _feeSpread;
        _deprecatedAdditionalGasCharge = 0;
    }

    /**
     * @notice A helper function for parsing permit data from paymasterAndData.
     */
    function parsePermitData(bytes calldata paymasterAndData)
        public
        pure
        returns (address tokenAddress, uint256 permitAmount, bytes calldata permitSignature)
    {
        return (
            address(bytes20(paymasterAndData[PAYMASTER_TOKEN_ADDRESS_OFFSET:PAYMASTER_PERMIT_AMOUNT_OFFSET])),
            uint256(bytes32(paymasterAndData[PAYMASTER_PERMIT_AMOUNT_OFFSET:PAYMASTER_PERMIT_SIGNATURE_OFFSET])),
            paymasterAndData[PAYMASTER_PERMIT_SIGNATURE_OFFSET:]
        );
    }

    /**
     * @notice triggers paused state that prevents usage of the paymaster.
     */
    function pause() public onlyPauser whenNotPaused {
        _pause();
    }

    /**
     * @notice resumes usability of the paymaster after being paused.
     */
    function unpause() public onlyPauser whenPaused {
        _unpause();
    }

    /**
     * @notice Swaps token for native token and deposits the received amount into the EntryPoint contract.
     * Only callable by the swapper role.
     * @param amountIn the amount of token to swap.
     * @param slippageBips the amount of acceptable slippage, in basis points (e.g 1 bip = 0.01%).
     * @param poolFee the pool fee to use for swaps, in hundredths of a basis point.
     */
    function swapForNative(uint256 amountIn, uint256 slippageBips, uint24 poolFee)
        external
        onlySwapper
        returns (uint256 amountOut)
    {
        if (slippageBips > FeeLib.BIPS_DENOMINATOR) {
            revert InvalidSlippageBips(slippageBips);
        }
        uint256 nativePrice = fetchPrice();
        uint256 amountOutMinimum = FeeLib.calculateNativeAmountOut(amountIn, slippageBips, nativePrice);

        token.safeIncreaseAllowance(address(swapRouter), amountIn);
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
            tokenIn: address(token),
            tokenOut: address(wrappedNativeToken),
            fee: poolFee,
            recipient: address(this),
            amountIn: amountIn,
            amountOutMinimum: amountOutMinimum,
            sqrtPriceLimitX96: 0
        });

        amountOut = swapRouter.exactInputSingle(params);
        emit TokenSwappedForNative(token, amountIn, amountOut);

        wrappedNativeToken.withdraw(amountOut);
        entryPoint.depositTo{value: amountOut}(address(this));
    }

    /**
     * @notice Updates the privileged pauser address.
     * Only callable by the owner.
     * @param newPauser the new pauser address.
     */
    function updatePauser(address newPauser) external onlyOwner {
        _checkNotZeroAddress(newPauser);

        address oldPauser = pauser;
        pauser = newPauser;
        emit PauserChanged(oldPauser, newPauser);
    }

    /**
     * @notice Updates the privileged swapper address.
     * Only callable by the owner.
     * @param newSwapper the new swapper address.
     */
    function updateSwapper(address newSwapper) external onlyOwner {
        _checkNotZeroAddress(newSwapper);

        address oldSwapper = swapper;
        swapper = newSwapper;
        emit SwapperChanged(oldSwapper, newSwapper);
    }

    /**
     * @notice Updates the privileged fee controller address.
     * Only callable by the owner.
     * @param newFeeController the new fee controller address.
     */
    function updateFeeController(address newFeeController) external onlyOwner {
        _checkNotZeroAddress(newFeeController);

        address oldFeeController = feeController;
        feeController = newFeeController;
        emit FeeControllerChanged(oldFeeController, newFeeController);
    }

    /**
     * @notice Updates the swap router contract.
     * Only callable by the owner.
     * @param newSwapRouter the new swap router contract.
     */
    function updateSwapRouter(ISwapRouter newSwapRouter) external onlyOwner {
        _checkNotZeroAddress(address(newSwapRouter));

        ISwapRouter oldSwapRouter = swapRouter;
        swapRouter = newSwapRouter;
        emit SwapRouterChanged(oldSwapRouter, newSwapRouter);
    }

    /**
     * @notice Updates the additional gas charge.
     * Only callable by the owner.
     * @param newAdditionalGasCharge the new additional gas charge.
     */
    function updateAdditionalGasCharge(uint32 newAdditionalGasCharge) external onlyOwner {
        uint32 oldAdditionalGasCharge = additionalGasCharge;
        additionalGasCharge = newAdditionalGasCharge;
        emit AdditionalGasChargeChanged(oldAdditionalGasCharge, newAdditionalGasCharge);
    }

    /**
     * @notice Updates the fee spread.
     * Only callable by the fee controller.
     * @param newFeeSpread the new fee spread.
     */
    function updateFeeSpread(uint32 newFeeSpread) external onlyFeeController {
        uint32 oldFeeSpread = feeSpread;
        feeSpread = newFeeSpread;
        emit FeeSpreadChanged(oldFeeSpread, newFeeSpread);
    }

    /**
     * @notice Implement receive function to allow WETH to be unwrapped to this contract.
     */
    receive() external payable {}
}
