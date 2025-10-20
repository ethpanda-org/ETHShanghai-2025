const fs = require('fs');
const path = require('path');
const toml = require('@iarna/toml');
const { main } = require('./src/main');

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function entry() {
    // 获取 config.toml 在主机上的绝对路径，兼容Windows和Unix系统
    const configPath = path.join(path.dirname(__filename), 'config.toml');
    let config;
    
    try {
        // 读取 config.toml
        const configContent = fs.readFileSync(configPath, 'utf8');
        config = toml.parse(configContent);
        
        // 确保 task 对象存在
        if (!config.task) {
            config.task = {};
        }
        
        // 设置任务状态为 Running
        config.task.status = 'Running';
        fs.writeFileSync(configPath, toml.stringify(config));
        
        // 调用主函数
        await main();
        
        // 等待1秒
        await sleep(1000);
        
    } catch (error) {
        // 尝试更新任务状态为 Error
        try {
            if (config) {
                config.task.status = 'Error';
                fs.writeFileSync(configPath, toml.stringify(config));
            }
        } catch (err) {
            // 忽略写入错误
        }
        
        if (error.code === 'ENOENT') {
            console.error('Error: config.toml not found.');
        } else if (error.name === 'TomlDecodeError') {
            console.error(`Error: config.toml is malformed: ${error.message}`);
        } else {
            console.error('Error:', error);
        }
        return;
    }
    
    // 更新任务状态为 Idle
    try {
        config.task.status = 'Idle';
        fs.writeFileSync(configPath, toml.stringify(config));
    } catch (err) {
        // 忽略写入错误
    }
}

if (require.main === module) {
    entry();
}

module.exports = { entry };