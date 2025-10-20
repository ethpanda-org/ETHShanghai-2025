import { network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

// 地址存储文件路径
const ADDRESSES_FILE = path.join(__dirname, "addresses.json");

// 地址存储结构
interface DeploymentAddresses {
    [network: string]: {
        [contractName: string]: {
            address: string;
            deployedAt: string; // ISO timestamp
            txHash?: string;
        };
    };
}

/**
 * 获取当前网络名称
 */
export function getNetworkName(): string {
    return network.name;
}

/**
 * 加载所有已保存的地址
 */
export function loadAddresses(): DeploymentAddresses {
    if (!fs.existsSync(ADDRESSES_FILE)) {
        return {};
    }

    try {
        const content = fs.readFileSync(ADDRESSES_FILE, "utf-8");
        return JSON.parse(content);
    } catch (error) {
        console.warn("⚠️  Failed to load addresses.json, returning empty object");
        return {};
    }
}

/**
 * 保存合约地址
 * @param contractName 合约名称
 * @param address 合约地址
 * @param txHash 可选的交易哈希
 */
export function saveAddress(
    contractName: string,
    address: string,
    txHash?: string
): void {
    const addresses = loadAddresses();
    const networkName = getNetworkName();

    // 初始化网络对象（如果不存在）
    if (!addresses[networkName]) {
        addresses[networkName] = {};
    }

    // 保存地址信息
    addresses[networkName][contractName] = {
        address,
        deployedAt: new Date().toISOString(),
        ...(txHash && { txHash }),
    };

    // 写入文件（格式化输出）
    fs.writeFileSync(
        ADDRESSES_FILE,
        JSON.stringify(addresses, null, 2),
        "utf-8"
    );

    console.log(`📝 Saved ${contractName} address: ${address}`);
}

/**
 * 读取指定合约的地址
 * @param contractName 合约名称
 * @returns 合约地址，如果不存在返回 undefined
 */
export function loadAddress(contractName: string): string | undefined {
    const addresses = loadAddresses();
    const networkName = getNetworkName();

    return addresses[networkName]?.[contractName]?.address;
}

/**
 * 读取指定合约的地址（如果不存在则抛出错误）
 * @param contractName 合约名称
 * @returns 合约地址
 */
export function requireAddress(contractName: string): string {
    const address = loadAddress(contractName);

    if (!address) {
        throw new Error(
            `❌ Address for ${contractName} not found on network ${getNetworkName()}.\n` +
            `   Please deploy ${contractName} first.`
        );
    }

    return address;
}

/**
 * 显示当前网络的所有已部署合约
 */
export function displayAddresses(): void {
    const addresses = loadAddresses();
    const networkName = getNetworkName();

    console.log(`\n📋 Deployed contracts on ${networkName}:`);
    console.log("=".repeat(60));

    const networkAddresses = addresses[networkName];
    if (!networkAddresses || Object.keys(networkAddresses).length === 0) {
        console.log("  No contracts deployed yet.");
        return;
    }

    Object.entries(networkAddresses).forEach(([name, info]) => {
        console.log(`  ${name.padEnd(25)} ${info.address}`);
        console.log(`  ${"".padEnd(25)} Deployed: ${new Date(info.deployedAt).toLocaleString()}`);
    });

    console.log("=".repeat(60));
}
