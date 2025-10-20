// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title Focus
 * @dev Non-transferable token for fee discounts in FocusBond
 * @notice These tokens are earned through app usage and cannot be transferred
 */
contract Focus is ERC20, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    
    address public focusBond;
    
    modifier onlyFocusBond() {
        require(msg.sender == focusBond, "Focus: Only FocusBond can call this function");
        _;
    }
    
    constructor() ERC20("Focus", "FOCUS") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }
    
    function setFocusBond(address _focusBond) external onlyRole(DEFAULT_ADMIN_ROLE) {
        focusBond = _focusBond;
    }
    
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }
    
    function burn(address from, uint256 amount) external onlyFocusBond {
        _burn(from, amount);
    }
    
    function grantCredits(address to, uint256 amount, string calldata reason) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _mint(to, amount);
        emit CreditsGranted(to, amount, reason);
    }
    
    function redeemCredits(address from, uint256 amount, string calldata reason) external onlyFocusBond {
        _burn(from, amount);
        emit CreditsRedeemed(from, amount, reason);
    }
    
    event CreditsGranted(address indexed to, uint256 amount, string reason);
    event CreditsRedeemed(address indexed from, uint256 amount, string reason);
    
    // Override transfer functions to make token non-transferable
    function transfer(address, uint256) public pure override returns (bool) {
        revert("Focus: Token is non-transferable");
    }
    
    function transferFrom(address, address, uint256) public pure override returns (bool) {
        revert("Focus: Token is non-transferable");
    }
    
    function approve(address, uint256) public pure override returns (bool) {
        revert("Focus: Token is non-transferable");
    }
}
