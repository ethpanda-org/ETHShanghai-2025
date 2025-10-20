// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "../interfaces/IBaseToken.sol";

/**
 * @title BaseToken
 * @dev Base token implementation for all AquaFlux tokens (AqToken, PToken, CToken, SToken)
 * Implements ERC20 with burning, pausing, and access control capabilities
 */
contract BaseToken is 
    Initializable,
    ERC20Upgradeable,
    ERC20BurnableUpgradeable,
    PausableUpgradeable,
    AccessControlUpgradeable,
    IBaseToken
{
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    bytes32 private _assetId;
    string private _tokenType;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev Initializes the token
     * @param name_ The token name
     * @param symbol_ The token symbol
     * @param assetId_ The asset identifier
     * @param tokenType_ The token type (AQ, P, C, S)
     * @param registry The registry contract address (will be granted roles)
     */
    function initialize(
        string memory name_,
        string memory symbol_,
        bytes32 assetId_,
        string memory tokenType_,
        address registry
    ) public initializer {
        __ERC20_init(name_, symbol_);
        __ERC20Burnable_init();
        __Pausable_init();
        __AccessControl_init();

        _assetId = assetId_;
        _tokenType = tokenType_;

        // Grant roles to registry
        _grantRole(MINTER_ROLE, registry);
        _grantRole(BURNER_ROLE, registry);
        _grantRole(PAUSER_ROLE, registry);

        // Grant DEFAULT_ADMIN_ROLE to registry
        _grantRole(DEFAULT_ADMIN_ROLE, registry);
    }

    /**
     * @dev Returns the asset ID associated with this token
     */
    function assetId() public view override returns (bytes32) {
        return _assetId;
    }

    /**
     * @dev Returns the token type
     */
    function tokenType() public view virtual override returns (string memory) {
        return _tokenType;
    }

    /**
     * @dev Mints tokens to the specified address
     * @param to The address to mint tokens to
     * @param amount The amount of tokens to mint
     */
    function mint(address to, uint256 amount) public override onlyRole(MINTER_ROLE) {
        _mint(to, amount);
        emit TokensMinted(to, amount);
    }

    /**
     * @dev Burns tokens from the specified address
     * @param from The address to burn tokens from
     * @param amount The amount of tokens to burn
     */
    function burn(address from, uint256 amount) public override onlyRole(BURNER_ROLE) {
        _burn(from, amount);
        emit TokensBurned(from, amount);
    }

    /**
     * @dev Pauses all token transfers
     */
    function pause() public override onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /**
     * @dev Unpauses all token transfers
     */
    function unpause() public override onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    /**
     * @dev Hook that is called before any transfer of tokens (OpenZeppelin 5.x use _update)
     */
    function _update(address from, address to, uint256 value) internal virtual override(ERC20Upgradeable) {
        _requireNotPaused();
        super._update(from, to, value);
    }

    /**
     * @dev Returns the version of the implementation
     */
    function version() public pure returns (string memory) {
        return "1.0.0";
    }
} 