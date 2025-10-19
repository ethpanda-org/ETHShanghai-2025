package utils

import (
	"encoding/json"
	"fmt"
	"strings"
	"timelock-backend/internal/types"
	"timelock-backend/pkg/logger"
)

// ABIItem represents a single ABI item (function, event, etc.)
type ABIItem struct {
	Type            string     `json:"type"`
	Name            string     `json:"name,omitempty"`
	Inputs          []ABIInput `json:"inputs,omitempty"`
	Outputs         []ABIInput `json:"outputs,omitempty"`
	StateMutability string     `json:"stateMutability,omitempty"`
	Anonymous       bool       `json:"anonymous,omitempty"`
}

// ABIInput represents an ABI input parameter
type ABIInput struct {
	Name         string     `json:"name"`
	Type         string     `json:"type"`
	Indexed      bool       `json:"indexed,omitempty"`
	Components   []ABIInput `json:"components,omitempty"`
	InternalType string     `json:"internalType,omitempty"`
}

// ValidateABI validates ABI format for basic compliance
func ValidateABI(abiContent string) (*types.ABIValidationResult, error) {
	result := &types.ABIValidationResult{
		IsValid:  false,
		Warnings: []string{},
	}

	// 1. Check if it's valid JSON
	var abiItems []ABIItem
	if err := json.Unmarshal([]byte(abiContent), &abiItems); err != nil {
		logger.Error("ValidateABI Error: %v", err)
		result.ErrorMessage = fmt.Sprintf("Invalid JSON format: %v", err)
		return result, nil
	}

	// 2. Basic structure validation
	if len(abiItems) == 0 {
		logger.Error("ValidateABI Error: %v", fmt.Errorf("ABI cannot be empty"))
		result.ErrorMessage = "ABI cannot be empty"
		return result, nil
	}

	// 3. Validate each ABI item
	var functionCount, eventCount int
	var hasConstructor bool

	for _, item := range abiItems {
		// Validate item type
		validTypes := []string{"function", "constructor", "event", "fallback", "receive", "error"}
		isValidType := false
		for _, validType := range validTypes {
			if item.Type == validType {
				isValidType = true
				break
			}
		}

		if !isValidType {
			logger.Error("ValidateABI Error: %v", fmt.Errorf("Invalid ABI item type: %s", item.Type))
			result.ErrorMessage = fmt.Sprintf("Invalid ABI item type: %s", item.Type)
			return result, nil
		}

		// Count different types
		switch item.Type {
		case "function":
			functionCount++
		case "constructor":
			if hasConstructor {
				logger.Error("ValidateABI Error: %v", fmt.Errorf("Multiple constructors found in ABI"))
				result.ErrorMessage = "Multiple constructors found in ABI"
				return result, nil
			}
			hasConstructor = true
		case "event":
			eventCount++
		}

		// Validate function/event name
		if (item.Type == "function" || item.Type == "event") && item.Name == "" {
			logger.Error("ValidateABI Error: %v", fmt.Errorf("%s must have a name", item.Type))
			result.ErrorMessage = fmt.Sprintf("%s must have a name", item.Type)
			return result, nil
		}

		// Validate inputs and outputs
		if err := validateInputs(item.Inputs); err != nil {
			result.ErrorMessage = fmt.Sprintf("Invalid inputs for %s '%s': %v", item.Type, item.Name, err)
			return result, nil
		}

		if item.Type == "function" {
			if err := validateInputs(item.Outputs); err != nil {
				result.ErrorMessage = fmt.Sprintf("Invalid outputs for function '%s': %v", item.Name, err)
				return result, nil
			}
		}
	}

	// Set final result
	result.IsValid = true
	result.FunctionCount = functionCount
	result.EventCount = eventCount

	return result, nil
}

// validateInputs validates ABI inputs/outputs
func validateInputs(inputs []ABIInput) error {
	validTypes := []string{
		"address", "bool", "string", "bytes",
		"uint8", "uint16", "uint32", "uint64", "uint128", "uint256",
		"int8", "int16", "int32", "int64", "int128", "int256",
		"bytes1", "bytes2", "bytes4", "bytes8", "bytes16", "bytes32",
	}

	for _, input := range inputs {
		if input.Type == "" {
			return fmt.Errorf("input type cannot be empty")
		}

		// Check for array types
		baseType := input.Type
		if strings.Contains(input.Type, "[") {
			baseType = strings.Split(input.Type, "[")[0]
		}

		// Check for basic types
		isValidType := false
		for _, validType := range validTypes {
			if baseType == validType {
				isValidType = true
				break
			}
		}

		// Check for dynamic types (uint, int, bytes)
		if !isValidType {
			if strings.HasPrefix(baseType, "uint") || strings.HasPrefix(baseType, "int") {
				isValidType = true
			} else if strings.HasPrefix(baseType, "bytes") && len(baseType) > 5 {
				isValidType = true
			} else if baseType == "tuple" && len(input.Components) > 0 {
				// Recursively validate tuple components
				if err := validateInputs(input.Components); err != nil {
					return fmt.Errorf("invalid tuple component: %v", err)
				}
				isValidType = true
			}
		}

		if !isValidType {
			return fmt.Errorf("invalid type: %s", input.Type)
		}
	}

	return nil
}

// IsABISecure performs basic validation check
func IsABISecure(abiContent string) (bool, []string, error) {
	result, err := ValidateABI(abiContent)
	if err != nil {
		return false, nil, err
	}

	if !result.IsValid {
		return false, []string{result.ErrorMessage}, nil
	}

	// ABI is considered secure if it passes basic validation
	return true, []string{}, nil
}
