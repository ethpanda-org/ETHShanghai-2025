const express = require('express');
const router = express.Router();
const enhancedAIAnalysisService = require('../services/enhancedAIAnalysisService');
const chainDataService = require('../services/chainDataService');
const logger = require('../utils/logger');
const { body, param, query, validationResult } = require('express-validator');

/**
 * 验证以太坊地址格式
 */
const validateEthereumAddress = (address) => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
};

/**
 * 智能合约地址分析 - 核心功能
 * POST /api/contract-analysis/analyze
 */
router.post('/analyze', [
    body('address')
        .notEmpty()
        .withMessage('合约地址不能为空')
        .custom((value) => {
            if (!validateEthereumAddress(value)) {
                throw new Error('无效的以太坊地址格式');
            }
            return true;
        }),
    body('network')
        .optional()
        .isIn(['holesky', 'mainnet'])
        .withMessage('网络必须是 holesky 或 mainnet'),
    body('userRequest')
        .optional()
        .isLength({ max: 500 })
        .withMessage('用户需求描述不能超过500字符')
], async (req, res) => {
    try {
        // 验证请求参数
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: '请求参数验证失败',
                details: errors.array()
            });
        }

        const { address, network = 'holesky', userRequest = '' } = req.body;

        logger.info(`收到合约分析请求: ${address} (网络: ${network})`);

        // 调用增强AI分析服务
        const analysisResult = await enhancedAIAnalysisService.analyzeContractByAddress(
            address,
            network,
            userRequest
        );

        res.json({
            success: true,
            data: analysisResult,
            message: '合约分析完成'
        });

    } catch (error) {
        logger.error('合约分析失败:', error);
        res.status(500).json({
            success: false,
            error: '合约分析失败',
            message: error.message
        });
    }
});

/**
 * 批量合约分析
 * POST /api/contract-analysis/batch-analyze
 */
router.post('/batch-analyze', [
    body('addresses')
        .isArray({ min: 1, max: 10 })
        .withMessage('地址列表必须是数组，且包含1-10个地址'),
    body('addresses.*')
        .custom((value) => {
            if (!validateEthereumAddress(value)) {
                throw new Error('包含无效的以太坊地址格式');
            }
            return true;
        }),
    body('network')
        .optional()
        .isIn(['holesky', 'mainnet'])
        .withMessage('网络必须是 holesky 或 mainnet')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: '请求参数验证失败',
                details: errors.array()
            });
        }

        const { addresses, network = 'holesky' } = req.body;

        logger.info(`收到批量合约分析请求: ${addresses.length}个地址 (网络: ${network})`);

        const results = await enhancedAIAnalysisService.batchAnalyzeAddresses(addresses, network);

        res.json({
            success: true,
            data: results,
            message: `批量分析完成，共处理${addresses.length}个地址`
        });

    } catch (error) {
        logger.error('批量合约分析失败:', error);
        res.status(500).json({
            success: false,
            error: '批量合约分析失败',
            message: error.message
        });
    }
});

/**
 * 获取链上基础数据（不包含AI分析）
 * GET /api/contract-analysis/chain-data/:address
 */
router.get('/chain-data/:address', [
    param('address')
        .custom((value) => {
            if (!validateEthereumAddress(value)) {
                throw new Error('无效的以太坊地址格式');
            }
            return true;
        }),
    query('network')
        .optional()
        .isIn(['holesky', 'mainnet'])
        .withMessage('网络必须是 holesky 或 mainnet')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: '请求参数验证失败',
                details: errors.array()
            });
        }

        const { address } = req.params;
        const { network = 'holesky' } = req.query;

        logger.info(`获取链上数据: ${address} (网络: ${network})`);

        const chainData = await chainDataService.getCompleteContractData(address, network);

        res.json({
            success: true,
            data: chainData,
            message: '链上数据获取成功'
        });

    } catch (error) {
        logger.error('获取链上数据失败:', error);
        res.status(500).json({
            success: false,
            error: '获取链上数据失败',
            message: error.message
        });
    }
});

/**
 * 获取账户基础信息
 * GET /api/contract-analysis/account-info/:address
 */
router.get('/account-info/:address', [
    param('address')
        .custom((value) => {
            if (!validateEthereumAddress(value)) {
                throw new Error('无效的以太坊地址格式');
            }
            return true;
        }),
    query('network')
        .optional()
        .isIn(['holesky', 'mainnet'])
        .withMessage('网络必须是 holesky 或 mainnet')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: '请求参数验证失败',
                details: errors.array()
            });
        }

        const { address } = req.params;
        const { network = 'holesky' } = req.query;

        logger.info(`获取账户信息: ${address} (网络: ${network})`);

        const accountInfo = await chainDataService.getAccountInfo(address, network);

        res.json({
            success: true,
            data: accountInfo,
            message: '账户信息获取成功'
        });

    } catch (error) {
        logger.error('获取账户信息失败:', error);
        res.status(500).json({
            success: false,
            error: '获取账户信息失败',
            message: error.message
        });
    }
});

/**
 * 获取交易详情
 * GET /api/contract-analysis/transaction/:txHash
 */
router.get('/transaction/:txHash', [
    param('txHash')
        .matches(/^0x[a-fA-F0-9]{64}$/)
        .withMessage('无效的交易哈希格式'),
    query('network')
        .optional()
        .isIn(['holesky', 'mainnet'])
        .withMessage('网络必须是 holesky 或 mainnet')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: '请求参数验证失败',
                details: errors.array()
            });
        }

        const { txHash } = req.params;
        const { network = 'holesky' } = req.query;

        logger.info(`获取交易详情: ${txHash} (网络: ${network})`);

        const transactionDetails = await chainDataService.getTransactionDetails(txHash, network);

        if (!transactionDetails) {
            return res.status(404).json({
                success: false,
                error: '交易不存在',
                message: `未找到交易: ${txHash}`
            });
        }

        res.json({
            success: true,
            data: transactionDetails,
            message: '交易详情获取成功'
        });

    } catch (error) {
        logger.error('获取交易详情失败:', error);
        res.status(500).json({
            success: false,
            error: '获取交易详情失败',
            message: error.message
        });
    }
});

/**
 * 快速风险检查 - 轻量级分析
 * GET /api/contract-analysis/quick-check/:address
 */
router.get('/quick-check/:address', [
    param('address')
        .custom((value) => {
            if (!validateEthereumAddress(value)) {
                throw new Error('无效的以太坊地址格式');
            }
            return true;
        }),
    query('network')
        .optional()
        .isIn(['holesky', 'mainnet'])
        .withMessage('网络必须是 holesky 或 mainnet')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: '请求参数验证失败',
                details: errors.array()
            });
        }

        const { address } = req.params;
        const { network = 'holesky' } = req.query;

        logger.info(`快速风险检查: ${address} (网络: ${network})`);

        // 只获取基础链上数据，不进行AI分析
        const chainData = await chainDataService.getCompleteContractData(address, network);

        // 简单的风险评估
        let riskLevel = 'LOW';
        const riskFactors = [];

        if (!chainData.isContract) {
            riskLevel = 'LOW';
        } else {
            if (!chainData.verified) {
                riskFactors.push('合约未验证');
                riskLevel = 'MEDIUM';
            }
            
            if (chainData.bytecodeLength > 20000) {
                riskFactors.push('合约复杂度较高');
                if (riskLevel === 'LOW') riskLevel = 'MEDIUM';
            }
            
            if (!chainData.analysis?.isActive) {
                riskFactors.push('合约活跃度低');
            }
            
            if (chainData.contractType === 'Proxy') {
                riskFactors.push('代理合约');
                riskLevel = 'HIGH';
            }
        }

        const quickCheck = {
            address,
            network,
            isContract: chainData.isContract,
            contractType: chainData.contractType,
            verified: chainData.verified,
            riskLevel,
            riskFactors,
            basicInfo: {
                balance: chainData.balance,
                txCount: chainData.txCount,
                isActive: chainData.analysis?.isActive || false
            },
            timestamp: new Date().toISOString()
        };

        res.json({
            success: true,
            data: quickCheck,
            message: '快速风险检查完成'
        });

    } catch (error) {
        logger.error('快速风险检查失败:', error);
        res.status(500).json({
            success: false,
            error: '快速风险检查失败',
            message: error.message
        });
    }
});

/**
 * 健康检查
 * GET /api/contract-analysis/health
 */
router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: '合约分析服务运行正常',
        timestamp: new Date().toISOString(),
        services: {
            rpcService: '正常',
            chainDataService: '正常',
            enhancedAIAnalysisService: '正常'
        }
    });
});

module.exports = router;