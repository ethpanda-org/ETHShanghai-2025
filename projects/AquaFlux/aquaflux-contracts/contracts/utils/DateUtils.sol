// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title DateUtils
 * @dev Library for date formatting utilities
 * Provides functions to convert timestamps to human-readable date formats
 */
library DateUtils {
    
    /**
     * @dev Formats a timestamp to date string in format DDMMMYYYY (e.g., 31AUG2025)
     * @param timestamp The timestamp to format
     * @return The formatted date string
     */
    function formatToDateString(uint256 timestamp) internal pure returns (string memory) {
        // Calculate date components from timestamp
        uint256 secondsInDay = 86400;
        uint256 daysFromEpoch = timestamp / secondsInDay;
        
        // Approximate calculation for year (assumes average 365.25 days per year)
        uint256 year = 1970 + (daysFromEpoch * 400) / 146097; // More accurate leap year calculation
        
        // Adjust year if needed
        uint256 yearStart = _yearToTimestamp(year);
        if (yearStart > timestamp) {
            year--;
            yearStart = _yearToTimestamp(year);
        }
        
        // Calculate day of year
        uint256 dayOfYear = (timestamp - yearStart) / secondsInDay + 1;
        
        // Get month and day
        (uint256 month, uint256 day) = _getDayAndMonth(year, dayOfYear);
        
        // Month names array
        string[12] memory monthNames = [
            "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
            "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"
        ];
        
        // Format day (pad with 0 if needed)
        string memory dayStr = day < 10 ? 
            string(abi.encodePacked("0", _toString(day))) : 
            _toString(day);
            
        return string(abi.encodePacked(
            dayStr,
            monthNames[month - 1],
            _toString(year)
        ));
    }
    
    /**
     * @dev Formats asset name with type and maturity date
     * @param tokenType The token type (P, C, S, AQ)
     * @param assetName The asset name
     * @param maturityTimestamp The maturity timestamp
     * @return The formatted token name in format Type-AssetName-Date
     */
    function formatAssetTokenName(
        string memory tokenType,
        string memory assetName,
        uint256 maturityTimestamp
    ) internal pure returns (string memory) {
        string memory formattedDate = formatToDateString(maturityTimestamp);
        return string(abi.encodePacked(
            tokenType,
            "-",
            assetName,
            "-",
            formattedDate
        ));
    }
    
    /**
     * @dev Helper function to get timestamp for start of year
     */
    function _yearToTimestamp(uint256 year) private pure returns (uint256) {
        uint256 leapYears = 0;
        
        // Count leap years since 1970
        for (uint256 y = 1972; y < year; y += 4) {
            if (_isLeapYear(y)) {
                leapYears++;
            }
        }
        
        uint256 regularYears = year - 1970 - leapYears;
        return (regularYears * 365 + leapYears * 366) * 86400;
    }
    
    /**
     * @dev Helper function to check if year is leap year
     */
    function _isLeapYear(uint256 year) private pure returns (bool) {
        return (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0);
    }
    
    /**
     * @dev Helper function to get day and month from day of year
     */
    function _getDayAndMonth(uint256 year, uint256 dayOfYear) private pure returns (uint256 month, uint256 day) {
        uint256[12] memory daysInMonth;
        
        if (_isLeapYear(year)) {
            daysInMonth = [uint256(31), 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        } else {
            daysInMonth = [uint256(31), 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        }
        
        uint256 currentDay = dayOfYear;
        for (uint256 i = 0; i < 12; i++) {
            if (currentDay <= daysInMonth[i]) {
                return (i + 1, currentDay);
            }
            currentDay -= daysInMonth[i];
        }
        
        // Should not reach here with valid input
        return (12, 31);
    }
    
    /**
     * @dev Helper function to convert uint to string
     */
    function _toString(uint256 value) private pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}
