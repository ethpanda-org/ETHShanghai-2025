const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const AnalysisResult = require('../models/AnalysisResult');

async function restoreData(backupFilePath) {
    try {
        // 检查备份文件是否存在
        if (!fs.existsSync(backupFilePath)) {
            throw new Error(`备份文件不存在: ${backupFilePath}`);
        }
        
        // 连接数据库
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');
        
        // 读取备份数据
        const backupData = JSON.parse(fs.readFileSync(backupFilePath, 'utf8'));
        console.log(`读取到 ${backupData.length} 条备份记录`);
        
        // 清空现有数据（可选）
        const clearExisting = process.argv.includes('--clear');
        if (clearExisting) {
            await AnalysisResult.deleteMany({});
            console.log('已清空现有数据');
        }
        
        // 恢复数据
        if (backupData.length > 0) {
            await AnalysisResult.insertMany(backupData);
            console.log(`成功恢复 ${backupData.length} 条记录`);
        }
        
        // 关闭连接
        await mongoose.connection.close();
        console.log('数据恢复完成');
    } catch (error) {
        console.error('恢复失败:', error);
        process.exit(1);
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    const backupFile = process.argv[2];
    if (!backupFile) {
        console.error('请提供备份文件路径');
        console.error('用法: node restoreData.js <备份文件路径> [--clear]');
        process.exit(1);
    }
    
    restoreData(backupFile);
}

module.exports = { restoreData };