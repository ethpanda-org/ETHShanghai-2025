// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.17 <0.9.0;
import "./Roles.sol";
import "@openzeppelin/contracts/access/Ownable.sol";


/**
*  Roles:
*  (1)admin is an administrator for operations;
*/
contract AdminRoles is Ownable{
    
    using Roles for Roles.Role;

    Roles.Role internal _admin;

    /// @dev events
    event AdminAdded(address indexed _agent);
    event AdminRemoved(address indexed _agent);

    constructor() Ownable(msg.sender){

    }

    /// @dev modifiers
    modifier onlyAdmin() {
        require(isAdmin(msg.sender), "AdminRoles: caller does not have the Admin role");
        _;
    }


    function addAdmin(address _agent) public onlyOwner {
        require(_agent != address(0), "invalid argument - zero address");
        _admin.add(_agent);
        emit AdminAdded(_agent);
    }

    function removeAdmin(address _agent) public onlyOwner {
        require(_agent != address(0), "invalid argument - zero address");
        _admin.remove(_agent);
        emit AdminRemoved(_agent);
    }

    function isAdmin(address _agent) public view returns (bool) {
        return _admin.has(_agent);
    }
}