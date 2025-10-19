package utils

import (
	"bytes"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"math/big"
	"regexp"
	"strconv"
	"strings"
	"timelock-backend/internal/types"

	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/common"
)

// ParseCalldataNoSelector 解析calldata(不含函数选择器), 返回参数列表
func ParseCalldataNoSelector(functionSig string, calldata []byte) ([]types.CalldataParam, error) {
	// 1. 解析并验证函数签名
	funcName, paramTypes, err := parseAndValidateFunctionSig(functionSig)
	if err != nil {
		return nil, err
	}

	// 2. 验证参数类型
	if err := validateParameterTypes(paramTypes); err != nil {
		return nil, fmt.Errorf("function signature parameter types invalid: %w", err)
	}

	// 3. 构造 ABI 输入字段
	inputs, err := buildInputsFromTypes(paramTypes)
	if err != nil {
		return nil, fmt.Errorf("build ABI input field failed: %w", err)
	}

	// 4. 构造并解析 ABI
	abiJSON := fmt.Sprintf(`[{"type":"function","name":"%s","inputs":[%s],"outputs":[]}]`,
		funcName, inputs)

	parsedABI, err := abi.JSON(bytes.NewReader([]byte(abiJSON)))
	if err != nil {
		return nil, fmt.Errorf("ABI parse failed, maybe parameter type format error: %w", err)
	}

	// 5. 获取方法
	method, exist := parsedABI.Methods[funcName]
	if !exist {
		return nil, fmt.Errorf("method '%s' not found in ABI, please check function signature format", funcName)
	}

	// 6. 验证calldata长度
	if err := validateCalldataLength(calldata, method, len(paramTypes)); err != nil {
		return nil, err
	}

	// 7. 解码calldata
	vals, err := method.Inputs.Unpack(calldata)
	if err != nil {
		return nil, fmt.Errorf("calldata decode failed: data format does not match function parameters (%w)", err)
	}

	// 8. 验证解码结果
	if len(vals) != len(paramTypes) {
		return nil, fmt.Errorf("decoded parameter count does not match: expected %d parameters, actual decoded %d parameters",
			len(paramTypes), len(vals))
	}

	// 9. 格式化结果
	results := make([]types.CalldataParam, len(vals))
	for i, v := range vals {
		results[i] = types.CalldataParam{
			Name:  fmt.Sprintf("param[%d]", i),
			Type:  paramTypes[i],
			Value: formatValue(v),
		}
	}

	return results, nil
}

// parseAndValidateFunctionSig 解析并验证函数签名
func parseAndValidateFunctionSig(sig string) (string, []string, error) {
	sig = strings.TrimSpace(sig)

	// 检查基本格式: 必须包含括号
	if !strings.Contains(sig, "(") || !strings.Contains(sig, ")") {
		return "", nil, fmt.Errorf("function signature format error: missing parentheses, correct format like 'transfer(address,uint256)'")
	}

	// 查找括号位置
	openParen := strings.Index(sig, "(")
	closeParen := strings.LastIndex(sig, ")")

	// 验证括号位置
	if openParen == -1 || closeParen == -1 {
		return "", nil, fmt.Errorf("function signature format error: parentheses do not match")
	}
	if openParen >= closeParen {
		return "", nil, fmt.Errorf("function signature format error: left parenthesis must be before right parenthesis")
	}
	if openParen == 0 {
		return "", nil, fmt.Errorf("function signature format error: missing function name")
	}
	if closeParen != len(sig)-1 {
		return "", nil, fmt.Errorf("function signature format error: right parenthesis cannot have other characters after it")
	}

	// 提取函数名
	funcName := strings.TrimSpace(sig[:openParen])
	if funcName == "" {
		return "", nil, fmt.Errorf("function name cannot be empty")
	}

	// 验证函数名格式 (只能包含字母、数字、下划线，且不能以数字开头)
	funcNamePattern := regexp.MustCompile(`^[a-zA-Z_][a-zA-Z0-9_]*$`)
	if !funcNamePattern.MatchString(funcName) {
		return "", nil, fmt.Errorf("function name format error: '%s', can only contain letters, numbers, and underscores, and cannot start with a number", funcName)
	}

	// 提取参数部分
	paramStr := strings.TrimSpace(sig[openParen+1 : closeParen])

	// 如果参数为空，返回空的参数列表
	if paramStr == "" {
		return funcName, []string{}, nil
	}

	// 分割参数
	paramTypes := strings.Split(paramStr, ",")

	// 清理参数类型中的空格
	for i, param := range paramTypes {
		paramTypes[i] = strings.TrimSpace(param)
		if paramTypes[i] == "" {
			return "", nil, fmt.Errorf("parameter type cannot be empty, please check if the comma is used correctly")
		}
	}

	return funcName, paramTypes, nil
}

// validateParameterTypes 验证参数类型格式
func validateParameterTypes(paramTypes []string) error {
	validTypes := map[string]bool{
		// 基本类型
		"address": true, "bool": true, "string": true, "bytes": true,
		// 动态数组
		"address[]": true, "bool[]": true, "string[]": true, "bytes[]": true,
	}

	// 数字类型的正则表达式
	uintPattern := regexp.MustCompile(`^uint(8|16|24|32|40|48|56|64|72|80|88|96|104|112|120|128|136|144|152|160|168|176|184|192|200|208|216|224|232|240|248|256)?$`)
	intPattern := regexp.MustCompile(`^int(8|16|24|32|40|48|56|64|72|80|88|96|104|112|120|128|136|144|152|160|168|176|184|192|200|208|216|224|232|240|248|256)?$`)
	bytesPattern := regexp.MustCompile(`^bytes([1-9]|[12][0-9]|3[0-2])$`)

	// 数组类型的正则表达式
	uintArrayPattern := regexp.MustCompile(`^uint(8|16|24|32|40|48|56|64|72|80|88|96|104|112|120|128|136|144|152|160|168|176|184|192|200|208|216|224|232|240|248|256)?\[\]$`)
	intArrayPattern := regexp.MustCompile(`^int(8|16|24|32|40|48|56|64|72|80|88|96|104|112|120|128|136|144|152|160|168|176|184|192|200|208|216|224|232|240|248|256)?\[\]$`)
	bytesArrayPattern := regexp.MustCompile(`^bytes([1-9]|[12][0-9]|3[0-2])\[\]$`)

	// 固定长度数组的正则表达式
	fixedArrayPattern := regexp.MustCompile(`^(address|bool|string|bytes|uint\d*|int\d*|bytes\d+)\[(\d+)\]$`)

	for i, paramType := range paramTypes {
		// 检查是否为预定义的有效类型
		if validTypes[paramType] {
			continue
		}

		// 检查数字类型
		if uintPattern.MatchString(paramType) || intPattern.MatchString(paramType) {
			continue
		}

		// 检查固定长度bytes类型
		if bytesPattern.MatchString(paramType) {
			continue
		}

		// 检查动态数组类型
		if uintArrayPattern.MatchString(paramType) || intArrayPattern.MatchString(paramType) ||
			bytesArrayPattern.MatchString(paramType) {
			continue
		}

		// 检查固定长度数组类型
		if matches := fixedArrayPattern.FindStringSubmatch(paramType); matches != nil {
			arraySize, err := strconv.Atoi(matches[2])
			if err != nil || arraySize <= 0 || arraySize > 1024 {
				return fmt.Errorf("array length %d is invalid: '%s', array length must be a positive integer between 1 and 1024", i+1, paramType)
			}
			continue
		}

		// 如果都不匹配，返回错误
		return fmt.Errorf("parameter %d type is invalid: '%s', please use a valid Solidity type", i+1, paramType)
	}

	return nil
}

// buildInputsFromTypes 从参数类型构造ABI输入字段
func buildInputsFromTypes(paramTypes []string) (string, error) {
	if len(paramTypes) == 0 {
		return "", nil
	}

	inputs := make([]map[string]string, len(paramTypes))
	for i, paramType := range paramTypes {
		inputs[i] = map[string]string{
			"name": fmt.Sprintf("arg%d", i),
			"type": paramType,
		}
	}

	bz, err := json.Marshal(inputs)
	if err != nil {
		return "", fmt.Errorf("serialize input parameters failed: %w", err)
	}

	// 去掉外层的 []
	result := string(bz)
	if len(result) >= 2 {
		result = result[1 : len(result)-1]
	}

	return result, nil
}

// validateCalldataLength 验证calldata长度
func validateCalldataLength(calldata []byte, method abi.Method, expectedParamCount int) error {
	if len(calldata) == 0 {
		if expectedParamCount > 0 {
			return fmt.Errorf("calldata is empty, but the function needs %d parameters", expectedParamCount)
		}
		return nil
	}

	// 对于动态类型，很难精确计算所需的最小长度，但可以做一些基本检查
	// 每个基本类型至少需要32字节
	minLength := 0
	for _, input := range method.Inputs {
		if input.Type.T == abi.SliceTy || input.Type.T == abi.StringTy || input.Type.T == abi.BytesTy {
			minLength += 32 // 动态类型至少需要32字节存储偏移量
		} else if input.Type.T == abi.ArrayTy {
			if input.Type.Size > 0 {
				minLength += 32 * input.Type.Size // 固定长度数组
			} else {
				minLength += 32 // 动态数组的偏移量
			}
		} else {
			minLength += 32 // 基本类型通常是32字节
		}
	}

	if len(calldata) < minLength {
		return fmt.Errorf("calldata length is not enough: current %d bytes, at least need %d bytes to store %d parameters",
			len(calldata), minLength, expectedParamCount)
	}

	// 检查calldata长度是否是32的倍数（ABI编码的基本要求）
	if len(calldata)%32 != 0 {
		return fmt.Errorf("calldata length is incorrect: %d bytes, ABI encoded data length must be a multiple of 32", len(calldata))
	}

	return nil
}

// formatValue 格式化参数值为字符串，便于在通知中显示
func formatValue(v interface{}) string {
	if v == nil {
		return "<nil>"
	}

	switch val := v.(type) {
	case common.Address:
		return val.Hex()
	case []byte:
		if len(val) == 0 {
			return "0x"
		}
		return "0x" + hex.EncodeToString(val)
	case string:
		return fmt.Sprintf(`"%s"`, val) // 字符串用引号包围
	case bool:
		if val {
			return "true"
		}
		return "false"
	// 数组类型
	case []interface{}:
		if len(val) == 0 {
			return "[]"
		}
		results := make([]string, len(val))
		for i, item := range val {
			results[i] = formatValue(item)
		}
		return "[" + strings.Join(results, ", ") + "]"
	// 地址数组
	case []common.Address:
		if len(val) == 0 {
			return "[]"
		}
		results := make([]string, len(val))
		for i, addr := range val {
			results[i] = addr.Hex()
		}
		return "[" + strings.Join(results, ", ") + "]"
	// 字节数组的数组
	case [][]byte:
		if len(val) == 0 {
			return "[]"
		}
		results := make([]string, len(val))
		for i, bytes := range val {
			if len(bytes) == 0 {
				results[i] = "0x"
			} else {
				results[i] = "0x" + hex.EncodeToString(bytes)
			}
		}
		return "[" + strings.Join(results, ", ") + "]"
	// 字符串数组
	case []string:
		if len(val) == 0 {
			return "[]"
		}
		results := make([]string, len(val))
		for i, str := range val {
			results[i] = fmt.Sprintf(`"%s"`, str)
		}
		return "[" + strings.Join(results, ", ") + "]"
	// 布尔数组
	case []bool:
		if len(val) == 0 {
			return "[]"
		}
		results := make([]string, len(val))
		for i, b := range val {
			if b {
				results[i] = "true"
			} else {
				results[i] = "false"
			}
		}
		return "[" + strings.Join(results, ", ") + "]"
	default:
		// 处理各种数字类型和其他类型
		return fmt.Sprintf("%v", val)
	}
}

func WeiToEth(weiStr string, nativeToken string) (string, error) {
	wei := new(big.Int)
	if _, ok := wei.SetString(weiStr, 10); !ok {
		return "", fmt.Errorf("invalid wei")
	}

	// 10^18
	decimals := new(big.Int).Exp(big.NewInt(10), big.NewInt(18), nil)

	// 商 + 余数
	ethInt := new(big.Int)
	remainder := new(big.Int)
	ethInt.DivMod(wei, decimals, remainder)

	// 余数补 0 后取 6 位小数
	remainder6 := new(big.Int).Mul(remainder, big.NewInt(1_000_000))
	remainder6.Div(remainder6, decimals)

	return fmt.Sprintf("%s.%06d %s", ethInt.String(), remainder6.Int64(), nativeToken), nil
}
