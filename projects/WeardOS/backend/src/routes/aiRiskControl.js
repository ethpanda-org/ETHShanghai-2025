const express = require('express');
const router = express.Router();
const aiRiskControlService = require('../services/aiRiskControlService');
const logger = require('../utils/logger');

// 🧠 AI驱动的风险控制分析
router.post('/analyze', async (req, res) => {
    try {
        const { contractAddress, options = {} } = req.body;
        
        if (!contractAddress) {
            return res.status(400).json({ error: '合约地址不能为空' });
        }

        logger.info(`🚀 开始AI风险控制分析: ${contractAddress}`);
        
        // 调用正确的方法名
        const result = await aiRiskControlService.analyzeWithControl(contractAddress, options);
        
        logger.info(`✅ AI风险控制分析完成: ${contractAddress}`);
        res.json({
            success: true,
            data: result,
            message: 'AI分析完成'
        });
    } catch (error) {
        logger.error('❌ AI风险控制分析失败:', error);
        res.status(500).json({ 
            success: false,
            error: '分析失败', 
            message: error.message 
        });
    }
});

// 📊 获取监控统计
router.get('/stats', async (req, res) => {
    try {
        logger.info('获取监控统计数据');
        
        const stats = await aiRiskControlService.getMonitoringStats();
        
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        logger.error('获取监控统计失败:', error);
        res.status(500).json({ 
            success: false,
            error: '获取统计失败', 
            message: error.message 
        });
    }
});

// 🎯 获取实时风险数据
router.get('/realtime/:contractAddress', async (req, res) => {
    try {
        const { contractAddress } = req.params;
        
        logger.info(`获取实时风险数据: ${contractAddress}`);
        
        const activeControl = aiRiskControlService.activeControls.get(contractAddress);
        
        if (!activeControl) {
            return res.json({
                success: false,
                message: '该合约未启用监控'
            });
        }
        
        // 模拟实时数据更新
        const realtimeData = {
            ...activeControl,
            currentRiskScore: Math.floor(Math.random() * 100),
            lastUpdate: new Date().toISOString(),
            transactionCount: Math.floor(Math.random() * 50) + 10,
            alertLevel: activeControl.analysis.riskLevel
        };
        
        res.json({
            success: true,
            data: realtimeData
        });
    } catch (error) {
        logger.error('获取实时数据失败:', error);
        res.status(500).json({ 
            success: false,
            error: '获取实时数据失败', 
            message: error.message 
        });
    }
});

// 🛑 紧急停止控制
router.post('/emergency-stop/:contractAddress', async (req, res) => {
    try {
        const { contractAddress } = req.params;
        
        logger.info(`🚨 执行紧急停止: ${contractAddress}`);
        
        // 执行紧急停止
        const result = await aiRiskControlService.executeAction(contractAddress, 'immediate_pause');
        
        res.json({
            success: true,
            data: result,
            message: '紧急停止执行成功'
        });
    } catch (error) {
        logger.error('紧急停止失败:', error);
        res.status(500).json({ 
            success: false,
            error: '紧急停止失败', 
            message: error.message 
        });
    }
});

// 🔄 更新控制策略
router.put('/strategy/:contractAddress', async (req, res) => {
    try {
        const { contractAddress } = req.params;
        const { strategy } = req.body;
        
        logger.info(`更新控制策略: ${contractAddress}`);
        
        const activeControl = aiRiskControlService.activeControls.get(contractAddress);
        if (activeControl) {
            activeControl.controlStrategy = { ...activeControl.controlStrategy, ...strategy };
            aiRiskControlService.activeControls.set(contractAddress, activeControl);
        }
        
        res.json({
            success: true,
            message: '控制策略更新成功'
        });
    } catch (error) {
        logger.error('更新控制策略失败:', error);
        res.status(500).json({ 
            success: false,
            error: '更新失败', 
            message: error.message 
        });
    }
});

// 🧪 测试AI功能
router.post('/test', async (req, res) => {
    try {
        const { testType, contractAddress } = req.body;
        
        logger.info(`🧪 执行AI功能测试: ${testType}`);
        
        let testResult = {};
        
        switch (testType) {
            case 'code_audit':
                testResult = await aiRiskControlService.testCodeAudit(contractAddress);
                break;
            case 'real_time_monitoring':
                testResult = await aiRiskControlService.testRealTimeMonitoring(contractAddress);
                break;
            case 'auto_response':
                testResult = await aiRiskControlService.testAutoResponse(contractAddress);
                break;
            default:
                testResult = { message: '未知测试类型' };
        }
        
        res.json({
            success: true,
            data: testResult,
            message: `${testType} 测试完成`
        });
    } catch (error) {
        logger.error('AI功能测试失败:', error);
        res.status(500).json({ 
            success: false,
            error: '测试失败', 
            message: error.message 
        });
    }
});

module.exports = router;