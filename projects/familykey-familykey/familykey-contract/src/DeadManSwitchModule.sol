// Dead Man's Switch Safe Module (single-Owner MVP)
pragma solidity ^0.8.20;

import {ISafe} from "./interfaces/ISafe.sol";

contract DeadManSwitchModule {
    address public immutable safe;
    address public immutable beneficiary;
    uint256 public immutable heartbeatInterval;
    uint256 public immutable challengePeriod;

    uint256 public lastCheckIn;
    uint256 public claimReadyAt;

    address internal constant SENTINEL = address(0x1);

    event CheckIn(uint256 timestamp);
    event ClaimStarted(uint256 claimReadyAt);
    event ClaimCancelled(uint256 timestamp);
    event ClaimFinalized(address oldOwner, address newOwner);

    modifier onlyOwner() {
        require(ISafe(safe).isOwner(msg.sender), "NOT_Owner");
        _;
    }

    modifier onlyBeneficiary() {
        require(msg.sender == beneficiary, "NOT_BENEFICIARY");
        _;
    }

    constructor(
        address safe_,
        address beneficiary_,
        uint256 interval_,
        uint256 challengePeriod_
    ) {
        require(safe_ != address(0), "SAFE_ZERO");
        require(beneficiary_ != address(0), "BENE_ZERO");
        require(interval_ > 0, "INTERVAL_ZERO");
        safe = safe_;
        beneficiary = beneficiary_;
        heartbeatInterval = interval_;
        challengePeriod = challengePeriod_;
        lastCheckIn = block.timestamp;
    }

    function checkIn() external onlyOwner {
        lastCheckIn = block.timestamp;
        claimReadyAt = 0;
        emit CheckIn(lastCheckIn);
    }

    function startClaim() external onlyBeneficiary {
        require(block.timestamp > lastCheckIn + heartbeatInterval, "NOT_EXPIRED");
        claimReadyAt = block.timestamp + challengePeriod;
        emit ClaimStarted(claimReadyAt);
    }


    function finalizeClaim() external onlyBeneficiary {
        require(claimReadyAt != 0 && block.timestamp >= claimReadyAt, "NOT_READY");
        address[] memory Owners = ISafe(safe).getOwners();
        require(Owners.length > 0, "NO_Owner");
        address oldOwner = Owners[0];
        bytes memory data = abi.encodeWithSignature(
            "swapOwner(address,address,address)",
            SENTINEL,
            oldOwner,
            beneficiary
        );
        bool ok = ISafe(safe).execTransactionFromModule(safe, 0, data, 0);
        require(ok, "EXEC_FAIL");
        claimReadyAt = 0;
        emit ClaimFinalized(oldOwner, beneficiary);
    }

    function status()
        external
        view
        returns (
            address safe_,
            address Owner_,
            address beneficiary_,
            uint256 lastCheckIn_,
            uint256 heartbeatInterval_,
            uint256 claimReadyAt_
        )
    {
        address[] memory Owners = ISafe(safe).getOwners();
        address Owner = Owners.length > 0 ? Owners[0] : address(0);
        return (safe, Owner, beneficiary, lastCheckIn, heartbeatInterval, claimReadyAt);
    }
}

