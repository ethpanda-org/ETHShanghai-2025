const rpcService = require('./rpcService');
const etherscanService = require('./etherscanService');
const contractParsingService = require('./contractParsingService');
const logger = require('../utils/logger');

class ChainDataService {
    constructor() {
        this.rpcService = rpcService;
        this.etherscanService = etherscanService;
        this.contractParsingService = contractParsingService;
        
        logger.info('链上数据服务初始化完成');
    }

    /**
     * 获取完整的合约分析数据
     * @param {string} contractAddress - 合约地址
     * @param {string} network - 网络 ('holesky' | 'mainnet')
     * @returns {Promise<Object>} 完整的合约数据
     */
    async getCompleteContractData(contractAddress, network = 'holesky') {
        try {
            logger.info(`开始获取合约完整数据: ${contractAddress} (网络: ${network})`);
            
            // 切换到指定网络
            this.rpcService.switchNetwork(network);
            
            // 并行获取基础链上数据
            const [
                bytecode,
                balance,
                txCount,
                isContractResult,
                networkInfo,
                gasPrice
            ] = await Promise.allSettled([
                this.rpcService.getContractBytecode(contractAddress),
                this.rpcService.getBalance(contractAddress),
                this.rpcService.getTransactionCount(contractAddress),
                this.rpcService.isContract(contractAddress),
                this.rpcService.getNetworkInfo(),
                this.rpcService.getGasPrice()
            ]);

            // 处理基础数据结果
            const chainData = {
                address: contractAddress,
                network: network,
                networkInfo: networkInfo.status === 'fulfilled' ? networkInfo.value : null,
                isContract: isContractResult.status === 'fulfilled' ? isContractResult.value : false,
                bytecode: bytecode.status === 'fulfilled' ? bytecode.value : null,
                bytecodeLength: bytecode.status === 'fulfilled' && bytecode.value ? bytecode.value.length : 0,
                balance: balance.status === 'fulfilled' ? balance.value : '0',
                txCount: txCount.status === 'fulfilled' ? txCount.value : 0,
                gasPrice: gasPrice.status === 'fulfilled' ? gasPrice.value : null,
                timestamp: new Date().toISOString()
            };

            // 如果不是合约地址，返回基础数据
            if (!chainData.isContract) {
                logger.info(`地址 ${contractAddress} 不是合约地址，返回基础账户数据`);
                return {
                    ...chainData,
                    contractType: 'EOA', // Externally Owned Account
                    verified: false,
                    abi: null,
                    sourceCode: null,
                    contractInfo: null
                };
            }

            // 获取合约验证信息和ABI
            let contractInfo = null;
            let abi = null;
            let sourceCode = null;
            let verified = false;

            try {
                if (network === 'holesky') {
                    // 使用Holesky测试网API
                    const [abiResult, sourceResult] = await Promise.allSettled([
                        this.contractParsingService.getHoleskyContractABI(contractAddress),
                        this.contractParsingService.getHoleskyContractSource(contractAddress)
                    ]);

                    if (abiResult.status === 'fulfilled' && abiResult.value.success) {
                        abi = abiResult.value.abi;
                        verified = true;
                    }

                    if (sourceResult.status === 'fulfilled' && sourceResult.value.success) {
                        sourceCode = sourceResult.value.sourceCode;
                        contractInfo = {
                            contractName: sourceResult.value.contractName,
                            compilerVersion: sourceResult.value.compilerVersion,
                            licenseType: sourceResult.value.licenseType
                        };
                    }
                } else {
                    // 使用主网Etherscan API
                    const [abiResult, sourceResult] = await Promise.allSettled([
                        this.etherscanService.getContractABI(contractAddress),
                        this.etherscanService.checkSourceVerification(contractAddress)
                    ]);

                    if (abiResult.status === 'fulfilled' && abiResult.value) {
                        abi = abiResult.value;
                        verified = true;
                    }

                    if (sourceResult.status === 'fulfilled' && sourceResult.value) {
                        sourceCode = sourceResult.value.sourceCode;
                        contractInfo = {
                            contractName: sourceResult.value.contractName,
                            compilerVersion: sourceResult.value.compilerVersion,
                            isVerified: sourceResult.value.isVerified,
                            licenseType: sourceResult.value.licenseType
                        };
                        verified = sourceResult.value.isVerified;
                    }
                }
            } catch (error) {
                logger.warn(`获取合约验证信息失败: ${error.message}`);
            }

            // 尝试获取最近的交易和事件日志
            let recentTransactions = [];
            let eventLogs = [];

            try {
                // 获取最近的事件日志（最近100个区块）
                const latestBlock = await this.rpcService.getLatestBlock();
                const fromBlock = Math.max(0, latestBlock.number - 100);
                
                eventLogs = await this.rpcService.getContractLogs(contractAddress, {
                    fromBlock: fromBlock,
                    toBlock: 'latest'
                });
            } catch (error) {
                logger.warn(`获取事件日志失败: ${error.message}`);
            }

            // 分析合约类型
            const contractType = this.analyzeContractType(bytecode.value, abi, sourceCode);

            // 构建完整的合约数据
            const completeData = {
                ...chainData,
                contractType,
                verified,
                abi,
                sourceCode,
                contractInfo,
                eventLogs: eventLogs.slice(0, 10), // 限制返回最近10个事件
                recentTransactions,
                analysis: {
                    hasEvents: eventLogs.length > 0,
                    eventCount: eventLogs.length,
                    isActive: eventLogs.length > 0 || chainData.txCount > 0,
                    lastActivity: eventLogs.length > 0 ? new Date().toISOString() : null
                }
            };

            logger.info(`合约数据获取完成: ${contractAddress}, 验证状态: ${verified}, 类型: ${contractType}`);
            return completeData;

        } catch (error) {
            logger.error('获取合约完整数据失败:', error);
            throw error;
        }
    }

    /**
     * 分析合约类型
     * @param {string} bytecode - 合约字节码
     * @param {Array} abi - 合约ABI
     * @param {string} sourceCode - 源码
     * @returns {string} 合约类型
     */
    analyzeContractType(bytecode, abi, sourceCode) {
        if (!bytecode || bytecode === '0x') {
            return 'EOA';
        }

        // 基于ABI分析
        if (abi && Array.isArray(abi)) {
            const functions = abi.filter(item => item.type === 'function').map(item => item.name);
            
            // ERC-20代币合约
            const erc20Functions = ['transfer', 'transferFrom', 'approve', 'balanceOf', 'totalSupply'];
            if (erc20Functions.every(func => functions.includes(func))) {
                return 'ERC20';
            }
            
            // ERC-721 NFT合约
            const erc721Functions = ['ownerOf', 'safeTransferFrom', 'transferFrom', 'approve', 'getApproved'];
            if (erc721Functions.some(func => functions.includes(func))) {
                return 'ERC721';
            }
            
            // 代理合约
            if (functions.includes('implementation') || functions.includes('upgradeTo')) {
                return 'Proxy';
            }
            
            // 多签钱包
            if (functions.includes('submitTransaction') || functions.includes('confirmTransaction')) {
                return 'MultiSig';
            }
        }

        // 基于源码分析
        if (sourceCode) {
            if (sourceCode.includes('ERC20') || sourceCode.includes('IERC20')) {
                return 'ERC20';
            }
            if (sourceCode.includes('ERC721') || sourceCode.includes('IERC721')) {
                return 'ERC721';
            }
            if (sourceCode.includes('proxy') || sourceCode.includes('Proxy')) {
                return 'Proxy';
            }
        }

        // 基于字节码长度判断
        if (bytecode.length < 100) {
            return 'Simple';
        } else if (bytecode.length > 10000) {
            return 'Complex';
        }

        return 'Contract';
    }

    /**
     * 获取账户的基础信息
     * @param {string} address - 账户地址
     * @param {string} network - 网络
     * @returns {Promise<Object>} 账户信息
     */
    async getAccountInfo(address, network = 'holesky') {
        try {
            logger.info(`获取账户信息: ${address} (网络: ${network})`);
            
            this.rpcService.switchNetwork(network);
            
            const [balance, txCount, isContract] = await Promise.all([
                this.rpcService.getBalance(address),
                this.rpcService.getTransactionCount(address),
                this.rpcService.isContract(address)
            ]);

            return {
                address,
                network,
                balance,
                txCount,
                isContract,
                accountType: isContract ? 'Contract' : 'EOA',
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            logger.error('获取账户信息失败:', error);
            throw error;
        }
    }

    /**
     * 获取交易详细信息
     * @param {string} txHash - 交易哈希
     * @param {string} network - 网络
     * @returns {Promise<Object>} 交易信息
     */
    async getTransactionDetails(txHash, network = 'holesky') {
        try {
            logger.info(`获取交易详情: ${txHash} (网络: ${network})`);
            
            this.rpcService.switchNetwork(network);
            
            const [transaction, receipt] = await Promise.all([
                this.rpcService.getTransaction(txHash),
                this.rpcService.getTransactionReceipt(txHash)
            ]);

            if (!transaction) {
                return null;
            }

            return {
                transaction,
                receipt,
                network,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            logger.error('获取交易详情失败:', error);
            throw error;
        }
    }

    /**
     * 批量获取多个地址的基础信息
     * @param {Array<string>} addresses - 地址列表
     * @param {string} network - 网络
     * @returns {Promise<Array>} 地址信息列表
     */
    async getBatchAccountInfo(addresses, network = 'holesky') {
        try {
            logger.info(`批量获取账户信息: ${addresses.length}个地址 (网络: ${network})`);
            
            this.rpcService.switchNetwork(network);
            
            const results = await Promise.allSettled(
                addresses.map(address => this.getAccountInfo(address, network))
            );

            return results.map((result, index) => ({
                address: addresses[index],
                success: result.status === 'fulfilled',
                data: result.status === 'fulfilled' ? result.value : null,
                error: result.status === 'rejected' ? result.reason.message : null
            }));
        } catch (error) {
            logger.error('批量获取账户信息失败:', error);
            throw error;
        }
    }
}

module.exports = new ChainDataService();