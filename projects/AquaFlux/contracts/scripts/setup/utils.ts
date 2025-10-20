import { network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

// 地址存储文件路径（从 deploy 文件夹读取）
const ADDRESSES_FILE = path.join(__dirname, "../deploy/addresses.json");

// 地址存储结构
interface DeploymentAddresses {
    [network: string]: {
        [contractName: string]: {
            address: string;
            deployedAt: string;
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
        throw new Error(
            `❌ Addresses file not found: ${ADDRESSES_FILE}\n` +
            `   Please deploy contracts first using scripts in deploy/ folder.`
        );
    }

    try {
        const content = fs.readFileSync(ADDRESSES_FILE, "utf-8");
        return JSON.parse(content);
    } catch (error) {
        throw new Error(`❌ Failed to load addresses.json: ${error}`);
    }
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
            `   Please deploy ${contractName} first using scripts in deploy/ folder.`
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
        console.log(`  ${name.padEnd(30)} ${info.address}`);
    });

    console.log("=".repeat(60));
}
