import { ethers } from 'ethers';

type ParamType = string;
type ParamValue = unknown;
type Param = {
    type: ParamType;
    value: ParamValue;
    index: number;
};

type EncodeParamsResult =
    | { success: true; encodedData: string; details: { paramTypes: ParamType[]; originalParams: ParamValue[]; processedParams: ParamValue[]; dataLength: number } }
    | { success: false; error: string };

type DecodeParamsResult =
    | { success: true; params: Param[]; details: { paramTypes: ParamType[]; originalData: string; dataLength: number } }
    | { success: false; error: string };

type EncodeByTypesResult =
    | { success: true; encodedData: string; details: { paramTypes: ParamType[]; originalParams: ParamValue[]; processedParams: ParamValue[]; dataLength: number } }
    | { success: false; error: string };

type DecodeByTypesResult =
    | { success: true; params: Param[]; details: { paramTypes: ParamType[]; originalData: string; dataLength: number } }
    | { success: false; error: string };

type GetFunctionSelectorResult =
    | { success: true; selector: string; functionSignature: string }
    | { success: false; error: string };

export default class EthereumParamsCodec {
    private utils: typeof ethers.utils;
    private coder: typeof ethers.utils.defaultAbiCoder;

    constructor() {
        this.utils = ethers.utils;
        this.coder = ethers.utils.defaultAbiCoder;
    }

    normalizeAddress(address: string): string {
        try {
            return this.utils.getAddress(address.toLowerCase());
        } catch {
            throw new Error(`Invalid address format: ${address}`);
        }
    }

    parseParamTypes(functionSig: string): ParamType[] {
        // Remove spaces
        functionSig = functionSig.replace(/\s+/g, '');

        const match = functionSig.match(/^[a-zA-Z_][a-zA-Z0-9_]*\((.*)\)$/);
        if (!match) {
            throw new Error('Invalid function signature format');
        }

        const paramsStr = match[1];

        // Parse parameter types
        return paramsStr ? paramsStr.split(',').map(type => type.trim()) : [];
    }

    preprocessParams(paramTypes: ParamType[], params: ParamValue[]): ParamValue[] {
        return params.map((param, index) => {
            const paramType = paramTypes[index];
            if (paramType === 'address' && typeof param === 'string') {
                return this.normalizeAddress(param);
            }
            return param;
        });
    }

    encodeParams(functionSig: string, params: ParamValue[]): EncodeParamsResult {
        try {
            const paramTypes = this.parseParamTypes(functionSig);

            if (params.length !== paramTypes.length) {
                throw new Error(`Parameter count mismatch. Expected ${paramTypes.length} parameters, but got ${params.length}`);
            }

            // Preprocess parameters
            const processedParams = this.preprocessParams(paramTypes, params);

            // Encode parameters
            const encoded = this.coder.encode(paramTypes, processedParams);

            return {
                success: true,
                encodedData: encoded,
                details: {
                    paramTypes,
                    originalParams: params,
                    processedParams,
                    dataLength: encoded.length,
                },
            };
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }

    decodeParams(functionSig: string, encodedData: string): DecodeParamsResult {
        try {
            const paramTypes = this.parseParamTypes(functionSig);

            // Ensure data is prefixed with 0x
            if (!encodedData.startsWith('0x')) {
                encodedData = '0x' + encodedData;
            }

            // Decode parameters
            const decoded = this.coder.decode(paramTypes, encodedData);

            // Format decode result
            const params = [];
            for (let i = 0; i < paramTypes.length; i++) {
                const paramType = paramTypes[i];
                let value = decoded[i];

                // Convert number types to string to avoid precision issues
                if (paramType!.includes('uint') || paramType!.includes('int')) {
                    value = value.toString();
                }

                params.push({
                    type: paramType,
                    value,
                    index: i,
                });
            }

            return {
                success: true,
                params: params as Param[],
                details: {
                    paramTypes,
                    originalData: encodedData,
                    dataLength: encodedData.length,
                },
            };
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }

    encodeByFunctionSigAndParams(functionSig: string, params: ParamValue[]): EncodeParamsResult {
        try {
            const paramTypes = this.parseParamTypes(functionSig);

            if (params.length !== paramTypes.length) {
                throw new Error(`Parameter count mismatch. Expected ${paramTypes.length} parameters, but got ${params.length}`);
            }

            // Preprocess parameters
            const processedParams = this.preprocessParams(paramTypes, params);

            const functionSelector = this.getFunctionSelector(functionSig);
            const encoded = this.coder.encode(paramTypes, processedParams);

            return {
                success: true,
                encodedData: functionSelector.success ? functionSelector.selector + encoded.slice(2) : '',
                details: {
                    paramTypes,
                    originalParams: params,
                    processedParams,
                    dataLength: encoded.length,
                },
            };
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }

    encodeByTypes(paramTypes: ParamType[], params: ParamValue[]): EncodeByTypesResult {
        try {
            if (params.length !== paramTypes.length) {
                throw new Error(`Parameter count mismatch. Expected ${paramTypes.length} parameters, but got ${params.length}`);
            }

            // Preprocess parameters
            const processedParams = this.preprocessParams(paramTypes, params);

            // Encode parameters
            const encoded = this.coder.encode(paramTypes, processedParams);

            return {
                success: true,
                encodedData: encoded,
                details: {
                    paramTypes,
                    originalParams: params,
                    processedParams,
                    dataLength: encoded.length,
                },
            };
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }

    decodeByTypes(paramTypes: ParamType[], encodedData: string): DecodeByTypesResult {
        try {
            // Ensure data is prefixed with 0x
            if (!encodedData.startsWith('0x')) {
                encodedData = '0x' + encodedData;
            }

            // Decode parameters
            const decoded = this.coder.decode(paramTypes, encodedData);

            // Format decode result
            const params = [];
            for (let i = 0; i < paramTypes.length; i++) {
                const paramType = paramTypes[i];
                let value = decoded[i];

                // Convert number types to string
                if (paramType!.includes('uint') || paramType!.includes('int')) {
                    value = value.toString();
                }

                params.push({
                    type: paramType,
                    value,
                    index: i,
                });
            }

            return {
                success: true,
                params: params as Param[],
                details: {
                    paramTypes,
                    originalData: encodedData,
                    dataLength: encodedData.length,
                },
            };
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }

    getFunctionSelector(functionSig: string): GetFunctionSelectorResult {
        try {
            const signature = functionSig.replace(/\s+/g, '');
            const hash = this.utils.keccak256(this.utils.toUtf8Bytes(signature));
            const selector = hash.slice(0, 10); // Take the first 4 bytes

            return {
                success: true,
                selector,
                functionSignature: signature,
            };
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }
}
