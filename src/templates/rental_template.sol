// SPDX-License-Identifier: MIT
pragma solidity {{SOLIDITY_VERSION}};

// OpenZeppelin v4.x imports
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title {{CONTRACT_NAME}}
 * @dev EchokitBot device rental smart contract
 */
contract {{CONTRACT_NAME}} is ReentrancyGuard, Ownable {
    
    struct Device {
        uint256 id;
        address owner;
        bool isAvailable;
        uint256 hourlyRate; // Hourly rate in wei
        uint256 deposit;    // Device deposit in wei
        string description;
    }

    struct Rental {
        uint256 deviceId;
        address renter;
        uint256 startTime;
        uint256 endTime;
        bool active;
    }

    uint256 public deviceCount = 0;

    mapping(uint256 => Device) public devices;
    mapping(address => uint256[]) public ownerDevices;
    mapping(address => Rental[]) public rentals;

    // Events
    event DeviceRegistered(uint256 indexed deviceId, address indexed owner);
    event RentalBooked(uint256 indexed deviceId, address indexed renter, uint256 startTime, uint256 endTime);
    event RentalCompleted(uint256 indexed deviceId, address indexed renter, uint256 amountPaid);
    event DepositWithdrawn(address indexed renter, uint256 amount);

    // Modifiers
    modifier validDevice(uint256 _deviceId) {
        require(devices[_deviceId].owner != address(0), "Device does not exist");
        _;
    }

    modifier onlyDeviceOwner(uint256 _deviceId) {
        require(devices[_deviceId].owner == msg.sender, "Not device owner");
        _;
    }

    /**
     * @dev Register a new device for rental
     * @param _hourlyRate Hourly rental rate in wei
     * @param _deposit Security deposit required in wei
     * @param _description Device description
     */
    function registerDevice(
        uint256 _hourlyRate,
        uint256 _deposit,
        string calldata _description
    ) external {
        require(_hourlyRate > 0, "Hourly rate must be greater than zero");
        require(bytes(_description).length > 0, "Description cannot be empty");

        deviceCount++;
        devices[deviceCount] = Device({
            id: deviceCount,
            owner: msg.sender,
            isAvailable: true,
            hourlyRate: _hourlyRate,
            deposit: _deposit,
            description: _description
        });
        
        ownerDevices[msg.sender].push(deviceCount);
        emit DeviceRegistered(deviceCount, msg.sender);
    }

    /**
     * @dev Book a device for rental
     * @param _deviceId ID of the device to rent
     * @param _startTime Rental start time (timestamp)
     * @param _endTime Rental end time (timestamp)
     */
    function bookDevice(
        uint256 _deviceId,
        uint256 _startTime,
        uint256 _endTime
    ) external payable nonReentrant validDevice(_deviceId) {
        Device storage device = devices[_deviceId];
        require(device.isAvailable, "Device not available");
        require(_endTime > _startTime, "Invalid time range");
        require(_startTime >= block.timestamp, "Start time must be in the future");

        uint256 durationHours = (_endTime - _startTime) / 1 hours;
        require(durationHours > 0, "Rental duration must be at least one hour");

        uint256 totalCost = durationHours * device.hourlyRate;
        require(msg.value >= totalCost + device.deposit, "Insufficient payment");

        // Set device as unavailable
        device.isAvailable = false;

        // Record rental information
        rentals[msg.sender].push(Rental({
            deviceId: _deviceId,
            renter: msg.sender,
            startTime: _startTime,
            endTime: _endTime,
            active: true
        }));

        emit RentalBooked(_deviceId, msg.sender, _startTime, _endTime);
    }

    /**
     * @dev Complete rental and release deposit
     * @param _deviceId ID of the rented device
     * @param _renter Address of the renter
     */
    function completeRental(
        uint256 _deviceId,
        address _renter
    ) external validDevice(_deviceId) {
        Device storage device = devices[_deviceId];
        require(
            msg.sender == device.owner || msg.sender == _renter,
            "Not authorized"
        );

        Rental[] storage renterRentals = rentals[_renter];
        bool rentalFound = false;
        uint256 rentalIndex;

        // Find active rental
        for (uint256 i = 0; i < renterRentals.length; i++) {
            if (renterRentals[i].deviceId == _deviceId && renterRentals[i].active) {
                rentalFound = true;
                rentalIndex = i;
                break;
            }
        }
        require(rentalFound, "Active rental not found");

        Rental storage rental = renterRentals[rentalIndex];
        require(block.timestamp >= rental.endTime, "Rental period not ended");

        // Device becomes available again
        device.isAvailable = true;

        // Calculate payment amount
        uint256 durationHours = (rental.endTime - rental.startTime) / 1 hours;
        uint256 amountDue = durationHours * device.hourlyRate;

        // Return deposit to renter
        (bool success, ) = payable(_renter).call{value: device.deposit}("");
        require(success, "Deposit refund failed");

        // Pay rental fee to device owner
        (bool ownerPayment, ) = payable(device.owner).call{value: amountDue}("");
        require(ownerPayment, "Owner payment failed");

        // Mark rental as completed
        rental.active = false;

        emit RentalCompleted(_deviceId, _renter, amountDue);
    }

    /**
     * @dev Get device information
     * @param _deviceId ID of the device
     * @return Device information
     */
    function getDevice(uint256 _deviceId) external view validDevice(_deviceId) returns (Device memory) {
        return devices[_deviceId];
    }

    /**
     * @dev Get user's rental history
     * @param _user Address of the user
     * @return Array of user's rentals
     */
    function getUserRentals(address _user) external view returns (Rental[] memory) {
        return rentals[_user];
    }

    /**
     * @dev Get devices owned by an address
     * @param _owner Address of the owner
     * @return Array of device IDs
     */
    function getOwnerDevices(address _owner) external view returns (uint256[] memory) {
        return ownerDevices[_owner];
    }

    /**
     * @dev Emergency withdrawal function (owner only)
     */
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Withdrawal failed");
    }

    /**
     * @dev Get contract balance
     * @return Contract balance in wei
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
}