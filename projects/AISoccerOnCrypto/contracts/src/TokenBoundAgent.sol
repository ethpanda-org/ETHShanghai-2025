// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title TokenBoundAgent
/// @notice ERC20 token bound to a Soccer Agent, with transfer control
/// @dev Only the LaunchPad contract can mint tokens, and transfers are initially disabled
contract TokenBoundAgent is ERC20, Ownable {
    address public immutable launchPad;
    uint256 public immutable agentId;
    bool public transferEnabled;

    event TransferEnabled();

    modifier onlyLaunchPad() {
        require(msg.sender == launchPad, "Only LaunchPad can call");
        _;
    }

    /// @notice Constructor
    /// @param name_ Token name (should include agent ID)
    /// @param symbol_ Token symbol (should include agent ID)
    /// @param agentId_ The agent ID this token is bound to
    /// @param launchPad_ Address of the LaunchPad contract
    constructor(
        string memory name_,
        string memory symbol_,
        uint256 agentId_,
        address launchPad_
    ) ERC20(name_, symbol_) Ownable(launchPad_) {
        require(launchPad_ != address(0), "Invalid LaunchPad address");
        agentId = agentId_;
        launchPad = launchPad_;
        transferEnabled = false;
    }

    /// @notice Mint tokens (only LaunchPad can call)
    /// @param to Address to mint tokens to
    /// @param amount Amount of tokens to mint
    function mint(address to, uint256 amount) external onlyLaunchPad {
        _mint(to, amount);
    }

    /// @notice Burn tokens from an address (only LaunchPad can call, used for refunds)
    /// @param from Address to burn tokens from
    /// @param amount Amount of tokens to burn
    function burn(address from, uint256 amount) external onlyLaunchPad {
        _burn(from, amount);
    }

    /// @notice Enable transfers (only LaunchPad can call)
    function enableTransfer() external onlyLaunchPad {
        require(!transferEnabled, "Transfer already enabled");
        transferEnabled = true;
        emit TransferEnabled();
    }

    /// @notice Override transfer to check if transfers are enabled
    function _update(address from, address to, uint256 value) internal virtual override {
        // Allow minting (from == address(0)) and burning (to == address(0))
        // Allow transfers from LaunchPad (for liquidity provision)
        if (from != address(0) && to != address(0) && from != launchPad) {
            require(transferEnabled, "Transfers are disabled");
        }
        super._update(from, to, value);
    }
}