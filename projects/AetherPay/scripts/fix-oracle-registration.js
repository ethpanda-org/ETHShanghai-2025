const { ethers } = require('ethers');
require('dotenv').config();

async function main() {
    console.log('\n🔧 修复Oracle节点注册问题');
    console.log('=' * 50);

    // Connect to Optimism Sepolia
    const provider = new ethers.providers.JsonRpcProvider('https://sepolia.optimism.io');

    // Owner wallet - 使用节点1的私钥（它是合约owner）
    const ownerPrivateKey = '0x61dcb63f74339a017d6e4cdca1fcc64461fd13b3aab2c840510b57845375f715';
    const ownerWallet = new ethers.Wallet(ownerPrivateKey, provider);

    console.log('👤 Owner wallet:', ownerWallet.address);

    // Contract details
    const contractAddress = '0x1D323b80710c1d0c833B920CB7Ace09c49e237d7';

    // 正确的ABI - 基于AetherOracleV2.sol
    const contractABI = [
        // addOracleNode - 正确的函数名！
        {
            "inputs": [{"name": "nodeAddress", "type": "address"}],
            "name": "addOracleNode",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        // removeOracleNode
        {
            "inputs": [{"name": "nodeAddress", "type": "address"}],
            "name": "removeOracleNode",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        // getOracleInfo
        {
            "inputs": [{"name": "nodeAddress", "type": "address"}],
            "name": "getOracleInfo",
            "outputs": [
                {"name": "isActive", "type": "bool"},
                {"name": "reputation", "type": "uint256"},
                {"name": "totalSubmissions", "type": "uint256"},
                {"name": "successfulSubmissions", "type": "uint256"},
                {"name": "lastSubmitTime", "type": "uint256"}
            ],
            "stateMutability": "view",
            "type": "function"
        },
        // getActiveOracles
        {
            "inputs": [],
            "name": "getActiveOracles",
            "outputs": [{"name": "", "type": "address[]"}],
            "stateMutability": "view",
            "type": "function"
        },
        // owner
        {
            "inputs": [],
            "name": "owner",
            "outputs": [{"name": "", "type": "address"}],
            "stateMutability": "view",
            "type": "function"
        },
        // oracleNodes mapping
        {
            "inputs": [{"name": "", "type": "address"}],
            "name": "oracleNodes",
            "outputs": [
                {"name": "nodeAddress", "type": "address"},
                {"name": "isActive", "type": "bool"},
                {"name": "reputation", "type": "uint256"},
                {"name": "totalSubmissions", "type": "uint256"},
                {"name": "successfulSubmissions", "type": "uint256"},
                {"name": "lastSubmitTime", "type": "uint256"}
            ],
            "stateMutability": "view",
            "type": "function"
        }
    ];

    const contract = new ethers.Contract(contractAddress, contractABI, ownerWallet);

    // 新的oracle地址（已经有资金）
    const newOracles = [
        '0x803e34F17d4f8edacECEB19299361A1e96FA97f7', // Node 2
        '0x99f8C4e03181022125CAB1A9929Ab44027AD276a'  // Node 3
    ];

    try {
        // 1. 检查合约owner
        console.log('\n📋 检查合约权限...');
        const owner = await contract.owner();
        console.log('   合约Owner:', owner);
        console.log('   当前钱包:', ownerWallet.address);

        if (owner.toLowerCase() !== ownerWallet.address.toLowerCase()) {
            console.error('❌ 错误: 当前钱包不是合约的Owner!');
            console.error('   需要使用Owner钱包:', owner);
            process.exit(1);
        }
        console.log('   ✅ 权限验证通过');

        // 2. 获取当前活跃的oracle列表
        console.log('\n📋 当前活跃的Oracle节点:');
        const activeOracles = await contract.getActiveOracles();
        for (const oracle of activeOracles) {
            const info = await contract.getOracleInfo(oracle);
            console.log(`   ${oracle}:`);
            console.log(`      - 活跃: ${info.isActive}`);
            console.log(`      - 信誉: ${info.reputation.toString()}`);
            console.log(`      - 提交次数: ${info.totalSubmissions.toString()}`);
        }

        // 3. 注册新的oracle节点
        console.log('\n🔧 开始注册新的Oracle节点...');

        for (const oracleAddress of newOracles) {
            console.log(`\n📝 处理节点: ${oracleAddress}`);

            // 检查是否已经注册
            const oracleInfo = await contract.getOracleInfo(oracleAddress);

            if (oracleInfo.isActive) {
                console.log('   ✅ 该节点已经注册并激活');
                console.log(`      - 信誉: ${oracleInfo.reputation.toString()}`);
                console.log(`      - 提交次数: ${oracleInfo.totalSubmissions.toString()}`);
            } else {
                console.log('   ⏳ 注册新节点...');

                try {
                    // 获取当前gas价格
                    const gasPrice = await provider.getGasPrice();
                    console.log(`   Gas价格: ${ethers.utils.formatUnits(gasPrice, 'gwei')} Gwei`);

                    // 调用addOracleNode函数
                    const tx = await contract.addOracleNode(oracleAddress, {
                        gasLimit: 300000,
                        gasPrice: gasPrice.mul(110).div(100) // 加10%确保成功
                    });

                    console.log(`   📤 交易已发送: ${tx.hash}`);
                    console.log('   ⏳ 等待确认...');

                    const receipt = await tx.wait();
                    console.log(`   ✅ 节点注册成功! 区块号: ${receipt.blockNumber}`);

                } catch (error) {
                    console.error(`   ❌ 注册失败: ${error.message}`);
                    if (error.reason) console.error(`      原因: ${error.reason}`);
                }
            }
        }

        // 4. 验证所有节点状态
        console.log('\n📊 最终验证所有节点状态:');
        console.log('=' * 50);

        const allOracles = [
            '0x5ce38CfB6698c437d76436DF6d5f30355FDE6a8c', // Node 1 (原有)
            ...newOracles
        ];

        let activeCount = 0;
        for (const oracle of allOracles) {
            const info = await contract.getOracleInfo(oracle);
            const nodeNumber = allOracles.indexOf(oracle) + 1;

            console.log(`\n节点 ${nodeNumber}: ${oracle}`);
            console.log(`   状态: ${info.isActive ? '✅ 活跃' : '❌ 未激活'}`);
            console.log(`   信誉分: ${info.reputation.toString()}/1000`);
            console.log(`   总提交: ${info.totalSubmissions.toString()} 次`);
            console.log(`   成功提交: ${info.successfulSubmissions.toString()} 次`);

            if (info.isActive) activeCount++;
        }

        console.log('\n=' * 50);
        console.log(`📊 总结: ${activeCount}/${allOracles.length} 个节点已激活`);

        if (activeCount === allOracles.length) {
            console.log('🎉 恭喜！所有Oracle节点都已成功注册并激活！');
            console.log('\n下一步:');
            console.log('1. 重启Oracle网络: ./start-oracle-network.sh');
            console.log('2. 查看日志: tail -f oracle-node*.log');
            console.log('3. 测试共识: 所有节点应该能成功提交价格数据');
        } else {
            console.log('⚠️ 部分节点未能成功激活，请检查错误信息');
        }

    } catch (error) {
        console.error('\n❌ 发生错误:', error.message);
        if (error.reason) console.error('原因:', error.reason);
        if (error.code) console.error('错误代码:', error.code);
        if (error.data) console.error('错误数据:', error.data);

        // 提供更详细的错误诊断
        if (error.message.includes('call revert exception')) {
            console.error('\n💡 可能的原因:');
            console.error('   1. 合约地址错误');
            console.error('   2. ABI与合约不匹配');
            console.error('   3. 没有足够的权限');
            console.error('   4. 合约已暂停或锁定');
        }
    }
}

// 运行主函数
main()
    .then(() => {
        console.log('\n✨ 脚本执行完成');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 脚本执行失败:', error);
        process.exit(1);
    });