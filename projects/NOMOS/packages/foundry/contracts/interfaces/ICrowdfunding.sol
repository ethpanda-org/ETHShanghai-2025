// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ICrowdfunding {
    struct RentalProject {
        uint256 id;
        address payable creator;
        string description;
        uint256 depositPerPerson;
        uint256 participantGoal;
        uint256 currentParticipants;
        uint256 deadline;
        uint256 currentDeposits;
        uint256 allowence;
        uint256 alreadyWithdrawAmount;
        bool completed;
        bool isSuccessful;
    }

    function projects(uint256 _projectId)
        external
        view
        returns (
            uint256 id,
            address payable creator,
            string memory description,
            uint256 depositPerPerson,
            uint256 participantGoal,
            uint256 currentParticipants,
            uint256 deadline,
            uint256 currentDeposits,
            uint256 allowence,
            uint256 alreadyWithdrawAmount,
            bool completed,
            bool isSuccessful
        );

    function getProjectInfo(uint256 _projectId)
        external
        view
        returns (
            uint256 id,
            address payable creator,
            string memory description,
            uint256 depositPerPerson,
            uint256 participantGoal,
            uint256 currentParticipants,
            uint256 deadline,
            uint256 currentDeposits,
            uint256 allowence,
            uint256 alreadyWithdrawAmount,
            bool completed,
            bool isSuccessful
        );

    function checkIsParticipant(address _user, uint256 _projectId) external view returns (bool);
    function getParticipantDeposit(address _user, uint256 _projectId) external view returns (uint256);
    function increaseAllowence(uint256 _projectId, uint256 _amount) external;
    function setProjectFailed(uint256 _projectId) external;
}
