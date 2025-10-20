const { ethers } = require('ethers');
const logger = require('../utils/logger');

class RPCService {
    constructor() {
        // Holesky测试网RPC端点
        this.holeskyRpcUrl = process.env.HOLESKY_RPC_URL || 'https://holesky.infura.io/v3/your_infura_key_here';
        this.mainnetRpcUrl = process.env.MAINNET_RPC_URL || 'https://mainnet.infura.io/v3/your_infura_key_here';
        
        // 初始化provider
        this.holeskyProvider = new ethers.JsonRpcProvider(this.holeskyRpcUrl);
        this.mainnetProvider = new ethers.JsonRpcProvider(this.mainnetRpcUrl);
        
        // 默认使用Holesky测试网
        this.currentProvider = this.holeskyProvider;
        this.currentNetwork = 'holesky';
        
        logger.info('RPC服务初始化完成');
    }

    /**
     * 切换网络
     * @param {string} network - 网络名称 ('holesky' | 'mainnet')
     */
    switchNetwork(network) {
        if (network === 'holesky') {
            this.currentProvider = this.holeskyProvider;
            this.currentNetwork = 'holesky';
        } else if (network === 'mainnet') {
            this.currentProvider = this.mainnetProvider;
            this.currentNetwork = 'mainnet';
        } else {
            throw new Error(`不支持的网络: ${network}`);
        }
        logger.info(`已切换到网络: ${network}`);
    }

    /**
     * 获取合约字节码
     * @param {string} contractAddress - 合约地址
     * @returns {Promise<string>} 字节码
     */
    async getContractBytecode(contractAddress) {
        try {
            logger.info(`获取合约字节码: ${contractAddress} (网络: ${this.currentNetwork})`);
            const bytecode = await this.currentProvider.getCode(contractAddress);
            
            if (bytecode === '0x') {
                logger.warn(`地址 ${contractAddress} 不是合约地址或合约已被销毁`);
                return null;
            }
            
            logger.info(`成功获取字节码，长度: ${bytecode.length}`);
            return bytecode;
        } catch (error) {
            logger.error('获取合约字节码失败:', error);
            throw error;
        }
    }

    /**
     * 获取账户余额
     * @param {string} address - 账户地址
     * @returns {Promise<string>} 余额（ETH）
     */
    async getBalance(address) {
        try {
            logger.info(`获取账户余额: ${address} (网络: ${this.currentNetwork})`);
            const balance = await this.currentProvider.getBalance(address);
            const balanceInEth = ethers.formatEther(balance);
            
            logger.info(`账户余额: ${balanceInEth} ETH`);
            return balanceInEth;
        } catch (error) {
            logger.error('获取账户余额失败:', error);
            throw error;
        }
    }

    /**
     * 获取交易数量
     * @param {string} address - 账户地址
     * @returns {Promise<number>} 交易数量
     */
    async getTransactionCount(address) {
        try {
            logger.info(`获取交易数量: ${address} (网络: ${this.currentNetwork})`);
            const txCount = await this.currentProvider.getTransactionCount(address);
            
            logger.info(`交易数量: ${txCount}`);
            return txCount;
        } catch (error) {
            logger.error('获取交易数量失败:', error);
            throw error;
        }
    }

    /**
     * 获取最新区块信息
     * @returns {Promise<Object>} 区块信息
     */
    async getLatestBlock() {
        try {
            logger.info(`获取最新区块信息 (网络: ${this.currentNetwork})`);
            const block = await this.currentProvider.getBlock('latest');
            
            const blockInfo = {
                number: block.number,
                hash: block.hash,
                timestamp: block.timestamp,
                gasLimit: block.gasLimit.toString(),
                gasUsed: block.gasUsed.toString(),
                transactionCount: block.transactions.length
            };
            
            logger.info(`最新区块: #${blockInfo.number}`);
            return blockInfo;
        } catch (error) {
            logger.error('获取最新区块信息失败:', error);
            throw error;
        }
    }

    /**
     * 获取交易详情
     * @param {string} txHash - 交易哈希
     * @returns {Promise<Object>} 交易详情
     */
    async getTransaction(txHash) {
        try {
            logger.info(`获取交易详情: ${txHash} (网络: ${this.currentNetwork})`);
            const tx = await this.currentProvider.getTransaction(txHash);
            
            if (!tx) {
                logger.warn(`交易不存在: ${txHash}`);
                return null;
            }
            
            const txInfo = {
                hash: tx.hash,
                from: tx.from,
                to: tx.to,
                value: ethers.formatEther(tx.value),
                gasLimit: tx.gasLimit.toString(),
                gasPrice: tx.gasPrice ? ethers.formatUnits(tx.gasPrice, 'gwei') : null,
                nonce: tx.nonce,
                blockNumber: tx.blockNumber,
                blockHash: tx.blockHash
            };
            
            logger.info(`交易详情获取成功: ${txHash}`);
            return txInfo;
        } catch (error) {
            logger.error('获取交易详情失败:', error);
            throw error;
        }
    }

    /**
     * 获取交易收据
     * @param {string} txHash - 交易哈希
     * @returns {Promise<Object>} 交易收据
     */
    async getTransactionReceipt(txHash) {
        try {
            logger.info(`获取交易收据: ${txHash} (网络: ${this.currentNetwork})`);
            const receipt = await this.currentProvider.getTransactionReceipt(txHash);
            
            if (!receipt) {
                logger.warn(`交易收据不存在: ${txHash}`);
                return null;
            }
            
            const receiptInfo = {
                transactionHash: receipt.hash,
                blockNumber: receipt.blockNumber,
                blockHash: receipt.blockHash,
                gasUsed: receipt.gasUsed.toString(),
                status: receipt.status,
                logs: receipt.logs.map(log => ({
                    address: log.address,
                    topics: log.topics,
                    data: log.data
                }))
            };
            
            logger.info(`交易收据获取成功: ${txHash}`);
            return receiptInfo;
        } catch (error) {
            logger.error('获取交易收据失败:', error);
            throw error;
        }
    }

    /**
     * 获取合约事件日志
     * @param {string} contractAddress - 合约地址
     * @param {Object} filter - 过滤条件
     * @returns {Promise<Array>} 事件日志
     */
    async getContractLogs(contractAddress, filter = {}) {
        try {
            logger.info(`获取合约事件日志: ${contractAddress} (网络: ${this.currentNetwork})`);
            
            const logFilter = {
                address: contractAddress,
                fromBlock: filter.fromBlock || 'earliest',
                toBlock: filter.toBlock || 'latest',
                topics: filter.topics || []
            };
            
            const logs = await this.currentProvider.getLogs(logFilter);
            
            const processedLogs = logs.map(log => ({
                address: log.address,
                topics: log.topics,
                data: log.data,
                blockNumber: log.blockNumber,
                transactionHash: log.transactionHash,
                logIndex: log.index
            }));
            
            logger.info(`获取到 ${processedLogs.length} 条事件日志`);
            return processedLogs;
        } catch (error) {
            logger.error('获取合约事件日志失败:', error);
            throw error;
        }
    }

    /**
     * 检查地址是否为合约
     * @param {string} address - 地址
     * @returns {Promise<boolean>} 是否为合约
     */
    async isContract(address) {
        try {
            const bytecode = await this.getContractBytecode(address);
            return bytecode !== null && bytecode !== '0x';
        } catch (error) {
            logger.error('检查合约地址失败:', error);
            return false;
        }
    }

    /**
     * 获取网络信息
     * @returns {Promise<Object>} 网络信息
     */
    async getNetworkInfo() {
        try {
            const network = await this.currentProvider.getNetwork();
            return {
                name: network.name,
                chainId: network.chainId.toString(),
                ensAddress: network.ensAddress
            };
        } catch (error) {
            logger.error('获取网络信息失败:', error);
            throw error;
        }
    }

    /**
     * 获取当前Gas价格
     * @returns {Promise<string>} Gas价格（Gwei）
     */
    async getGasPrice() {
        try {
            const gasPrice = await this.currentProvider.getFeeData();
            return {
                gasPrice: gasPrice.gasPrice ? ethers.formatUnits(gasPrice.gasPrice, 'gwei') : null,
                maxFeePerGas: gasPrice.maxFeePerGas ? ethers.formatUnits(gasPrice.maxFeePerGas, 'gwei') : null,
                maxPriorityFeePerGas: gasPrice.maxPriorityFeePerGas ? ethers.formatUnits(gasPrice.maxPriorityFeePerGas, 'gwei') : null
            };
        } catch (error) {
            logger.error('获取Gas价格失败:', error);
            throw error;
        }
    }
}

module.exports = new RPCService();