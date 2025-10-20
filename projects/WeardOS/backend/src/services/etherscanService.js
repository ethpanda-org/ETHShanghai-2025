const axios = require('axios');
const logger = require('../utils/logger');

/**
 * Etherscan API 服务
 * 用于验证合约源码和获取合约信息
 */
class EtherscanService {
    constructor() {
        this.apiKey = process.env.ETHERSCAN_API_KEY || 'your_etherscan_api_key_here';
        this.baseUrl = 'https://api.etherscan.io/api';
        this.requestDelay = 200; // API请求间隔，避免频率限制
    }

    /**
     * 检查合约源码是否已验证
     * @param {string} contractAddress - 合约地址
     * @returns {Promise<Object>} 验证结果
     */
    async checkSourceVerification(contractAddress) {
        try {
            const response = await this.makeRequest({
                module: 'contract',
                action: 'getsourcecode',
                address: contractAddress
            });

            if (response.status === '1' && response.result && response.result.length > 0) {
                const contractInfo = response.result[0];
                
                return {
                    isVerified: contractInfo.SourceCode !== '',
                    contractName: contractInfo.ContractName,
                    compilerVersion: contractInfo.CompilerVersion,
                    optimizationUsed: contractInfo.OptimizationUsed === '1',
                    sourceCode: contractInfo.SourceCode,
                    abi: contractInfo.ABI,
                    constructorArguments: contractInfo.ConstructorArguments,
                    library: contractInfo.Library,
                    licenseType: contractInfo.LicenseType,
                    proxy: contractInfo.Proxy === '1',
                    implementation: contractInfo.Implementation
                };
            }

            return {
                isVerified: false,
                error: 'Contract not found or not verified'
            };

        } catch (error) {
            logger.error('Etherscan源码验证检查失败:', error);
            return {
                isVerified: false,
                error: error.message
            };
        }
    }

    /**
     * 获取合约创建信息
     * @param {string} contractAddress - 合约地址
     * @returns {Promise<Object>} 创建信息
     */
    async getContractCreation(contractAddress) {
        try {
            const response = await this.makeRequest({
                module: 'contract',
                action: 'getcontractcreation',
                contractaddresses: contractAddress
            });

            if (response.status === '1' && response.result && response.result.length > 0) {
                const creationInfo = response.result[0];
                
                return {
                    contractAddress: creationInfo.contractAddress,
                    contractCreator: creationInfo.contractCreator,
                    txHash: creationInfo.txHash
                };
            }

            return null;

        } catch (error) {
            logger.error('获取合约创建信息失败:', error);
            return null;
        }
    }

    /**
     * 获取合约ABI
     * @param {string} contractAddress - 合约地址
     * @returns {Promise<Array>} ABI数组
     */
    async getContractABI(contractAddress) {
        try {
            const response = await this.makeRequest({
                module: 'contract',
                action: 'getabi',
                address: contractAddress
            });

            if (response.status === '1') {
                return JSON.parse(response.result);
            }

            return null;

        } catch (error) {
            logger.error('获取合约ABI失败:', error);
            return null;
        }
    }

    /**
     * 获取合约交易历史
     * @param {string} contractAddress - 合约地址
     * @param {number} page - 页码
     * @param {number} offset - 每页数量
     * @returns {Promise<Array>} 交易列表
     */
    async getContractTransactions(contractAddress, page = 1, offset = 100) {
        try {
            const response = await this.makeRequest({
                module: 'account',
                action: 'txlist',
                address: contractAddress,
                startblock: 0,
                endblock: 99999999,
                page: page,
                offset: offset,
                sort: 'desc'
            });

            if (response.status === '1' && response.result) {
                return response.result.map(tx => ({
                    hash: tx.hash,
                    blockNumber: parseInt(tx.blockNumber),
                    timeStamp: parseInt(tx.timeStamp),
                    from: tx.from,
                    to: tx.to,
                    value: tx.value,
                    gas: tx.gas,
                    gasPrice: tx.gasPrice,
                    gasUsed: tx.gasUsed,
                    isError: tx.isError === '1',
                    txreceipt_status: tx.txreceipt_status,
                    input: tx.input,
                    contractAddress: tx.contractAddress,
                    cumulativeGasUsed: tx.cumulativeGasUsed,
                    confirmations: tx.confirmations
                }));
            }

            return [];

        } catch (error) {
            logger.error('获取合约交易历史失败:', error);
            return [];
        }
    }

    /**
     * 获取合约内部交易
     * @param {string} contractAddress - 合约地址
     * @returns {Promise<Array>} 内部交易列表
     */
    async getInternalTransactions(contractAddress) {
        try {
            const response = await this.makeRequest({
                module: 'account',
                action: 'txlistinternal',
                address: contractAddress,
                startblock: 0,
                endblock: 99999999,
                page: 1,
                offset: 100,
                sort: 'desc'
            });

            if (response.status === '1' && response.result) {
                return response.result;
            }

            return [];

        } catch (error) {
            logger.error('获取合约内部交易失败:', error);
            return [];
        }
    }

    /**
     * 发送API请求
     * @param {Object} params - 请求参数
     * @returns {Promise<Object>} API响应
     */
    async makeRequest(params) {
        // 添加API密钥
        const requestParams = {
            ...params,
            apikey: this.apiKey
        };

        // 添加请求延迟，避免频率限制
        await this.delay(this.requestDelay);

        const response = await axios.get(this.baseUrl, {
            params: requestParams,
            timeout: 10000
        });

        if (response.data.status === '0' && response.data.message === 'NOTOK') {
            throw new Error(response.data.result || 'API request failed');
        }

        return response.data;
    }

    /**
     * 延迟函数
     * @param {number} ms - 延迟毫秒数
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 模拟验证检查（用于测试环境）
     * @param {string} contractAddress - 合约地址
     * @returns {Object} 模拟验证结果
     */
    mockVerificationCheck(contractAddress) {
        // 模拟一些已知的验证合约
        const verifiedContracts = [
            'EXAMPLE_VERIFIED_CONTRACT_1',
            'EXAMPLE_VERIFIED_CONTRACT_2'
        ];

        const isVerified = verifiedContracts.includes(contractAddress.toLowerCase()) || 
                          Math.random() > 0.3; // 70%概率模拟为已验证

        return {
            isVerified,
            contractName: isVerified ? 'MockContract' : '',
            compilerVersion: isVerified ? 'v0.8.19+commit.7dd6d404' : '',
            optimizationUsed: isVerified ? true : false,
            sourceCode: isVerified ? 'pragma solidity ^0.8.0;\n\ncontract MockContract {\n    // Mock source code\n}' : '',
            licenseType: isVerified ? 'MIT' : '',
            proxy: false,
            implementation: ''
        };
    }
}

module.exports = new EtherscanService();