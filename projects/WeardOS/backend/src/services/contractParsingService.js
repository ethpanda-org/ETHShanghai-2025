const axios = require('axios');
const logger = require('../utils/logger');

class ContractParsingService {
    constructor() {
        this.holeskyApiUrl = 'https://api-holesky.etherscan.io/api';
        this.apiKey = process.env.ETHERSCAN_API_KEY || 'your_etherscan_api_key_here';
        logger.info('合约解析服务初始化完成');
    }

    /**
     * 获取Holesky测试网合约ABI
     * @param {string} contractAddress - 合约地址
     * @returns {Promise<Object>} ABI信息
     */
    async getHoleskyContractABI(contractAddress) {
        try {
            logger.info(`获取Holesky合约ABI: ${contractAddress}`);
            
            const response = await axios.get(this.holeskyApiUrl, {
                params: {
                    module: 'contract',
                    action: 'getabi',
                    address: contractAddress,
                    apikey: this.apiKey
                },
                timeout: 10000
            });

            if (response.data.status === '1' && response.data.result) {
                const abi = JSON.parse(response.data.result);
                return {
                    success: true,
                    abi: abi,
                    message: 'ABI获取成功'
                };
            } else {
                return {
                    success: false,
                    abi: null,
                    message: response.data.result || '合约未验证或ABI不可用'
                };
            }
        } catch (error) {
            logger.error(`获取Holesky合约ABI失败: ${error.message}`);
            return {
                success: false,
                abi: null,
                message: error.message
            };
        }
    }

    /**
     * 获取Holesky测试网合约源码
     * @param {string} contractAddress - 合约地址
     * @returns {Promise<Object>} 源码信息
     */
    async getHoleskyContractSource(contractAddress) {
        try {
            logger.info(`获取Holesky合约源码: ${contractAddress}`);
            
            const response = await axios.get(this.holeskyApiUrl, {
                params: {
                    module: 'contract',
                    action: 'getsourcecode',
                    address: contractAddress,
                    apikey: this.apiKey
                },
                timeout: 15000
            });

            if (response.data.status === '1' && response.data.result && response.data.result[0]) {
                const result = response.data.result[0];
                
                if (result.SourceCode && result.SourceCode !== '') {
                    return {
                        success: true,
                        sourceCode: result.SourceCode,
                        contractName: result.ContractName,
                        compilerVersion: result.CompilerVersion,
                        licenseType: result.LicenseType,
                        message: '源码获取成功'
                    };
                } else {
                    return {
                        success: false,
                        sourceCode: null,
                        message: '合约源码未验证'
                    };
                }
            } else {
                return {
                    success: false,
                    sourceCode: null,
                    message: '无法获取合约源码'
                };
            }
        } catch (error) {
            logger.error(`获取Holesky合约源码失败: ${error.message}`);
            return {
                success: false,
                sourceCode: null,
                message: error.message
            };
        }
    }

    /**
     * 解析合约函数签名
     * @param {Array} abi - 合约ABI
     * @returns {Object} 函数签名信息
     */
    parseContractFunctions(abi) {
        try {
            if (!abi || !Array.isArray(abi)) {
                return {
                    functions: [],
                    events: [],
                    constructor: null
                };
            }

            const functions = abi.filter(item => item.type === 'function').map(func => ({
                name: func.name,
                inputs: func.inputs || [],
                outputs: func.outputs || [],
                stateMutability: func.stateMutability,
                payable: func.payable || false
            }));

            const events = abi.filter(item => item.type === 'event').map(event => ({
                name: event.name,
                inputs: event.inputs || [],
                anonymous: event.anonymous || false
            }));

            const constructor = abi.find(item => item.type === 'constructor') || null;

            return {
                functions,
                events,
                constructor,
                totalFunctions: functions.length,
                totalEvents: events.length
            };
        } catch (error) {
            logger.error(`解析合约函数失败: ${error.message}`);
            return {
                functions: [],
                events: [],
                constructor: null,
                error: error.message
            };
        }
    }

    /**
     * 分析合约类型
     * @param {Array} abi - 合约ABI
     * @param {string} sourceCode - 源码
     * @returns {string} 合约类型
     */
    analyzeContractType(abi, sourceCode) {
        try {
            if (!abi || !Array.isArray(abi)) {
                return 'Unknown';
            }

            const functions = abi.filter(item => item.type === 'function').map(item => item.name);
            
            // ERC-20代币合约检测
            const erc20Functions = ['transfer', 'transferFrom', 'approve', 'balanceOf', 'totalSupply'];
            if (erc20Functions.every(func => functions.includes(func))) {
                return 'ERC20';
            }
            
            // ERC-721 NFT合约检测
            const erc721Functions = ['ownerOf', 'safeTransferFrom', 'transferFrom', 'approve'];
            if (erc721Functions.some(func => functions.includes(func))) {
                return 'ERC721';
            }
            
            // 代理合约检测
            if (functions.includes('implementation') || functions.includes('upgradeTo')) {
                return 'Proxy';
            }
            
            // 多签钱包检测
            if (functions.includes('submitTransaction') || functions.includes('confirmTransaction')) {
                return 'MultiSig';
            }

            // 基于源码的额外检测
            if (sourceCode) {
                if (sourceCode.includes('ERC20') || sourceCode.includes('IERC20')) {
                    return 'ERC20';
                }
                if (sourceCode.includes('ERC721') || sourceCode.includes('IERC721')) {
                    return 'ERC721';
                }
                if (sourceCode.includes('Ownable')) {
                    return 'Ownable';
                }
            }

            return 'Contract';
        } catch (error) {
            logger.error(`分析合约类型失败: ${error.message}`);
            return 'Unknown';
        }
    }
}

module.exports = new ContractParsingService();