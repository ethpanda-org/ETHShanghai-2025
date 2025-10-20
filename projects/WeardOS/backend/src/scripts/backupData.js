const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const AnalysisResult = require('../models/AnalysisResult');

async function backupData() {
    try {
        // 连接数据库
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');
        
        // 获取所有数据
        const allData = await AnalysisResult.find({}).lean();
        
        // 创建备份文件名
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFileName = `backup-${timestamp}.json`;
        const backupPath = path.join(__dirname, '../../backups', backupFileName);
        
        // 确保备份目录存在
        const backupDir = path.dirname(backupPath);
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }
        
        // 写入备份文件
        fs.writeFileSync(backupPath, JSON.stringify(allData, null, 2));
        
        console.log(`数据备份完成: ${backupPath}`);
        console.log(`备份了 ${allData.length} 条记录`);
        
        // 关闭连接
        await mongoose.connection.close();
    } catch (error) {
        console.error('备份失败:', error);
        process.exit(1);
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    backupData();
}

module.exports = { backupData };