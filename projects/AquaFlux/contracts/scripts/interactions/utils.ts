import { network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

// 部署地址文件（从 deploy 文件夹读取）
const DEPLOY_ADDRESSES_FILE = path.join(__dirname, "../deploy/addresses.json");

// 交互数据文件（存储中间结果）
const INTERACTIONS_DATA_FILE = path.join(__dirname, "interactions.json");

// 部署地址结构
interface DeploymentAddresses {
    [network: string]: {
        [contractName: string]: {
            address: string;
            deployedAt: string;
            txHash?: string;
        };
    };
}

// 交互数据结构
interface InteractionsData {
    [network: string]: {
        mockToken?: {
            address: string;
            name: string;
            symbol: string;
            deployedAt: string;
        };
        assetId?: string;
        registeredAt?: string;
        verifiedAt?: string;
        wrapAmount?: string;
        splitAmount?: string;
    };
}

/**
 * 获取当前网络名称
 */
export function getNetworkName(): string {
    return network.name;
}

/**
 * 从部署文件加载地址
 */
export function loadDeployedAddress(contractName: string): string {
    if (!fs.existsSync(DEPLOY_ADDRESSES_FILE)) {
        throw new Error(
            `❌ Deployment addresses file not found: ${DEPLOY_ADDRESSES_FILE}\n` +
            `   Please deploy contracts first using scripts in deploy/ folder.`
        );
    }

    try {
        const content = fs.readFileSync(DEPLOY_ADDRESSES_FILE, "utf-8");
        const addresses: DeploymentAddresses = JSON.parse(content);
        const networkName = getNetworkName();
        const address = addresses[networkName]?.[contractName]?.address;

        if (!address) {
            throw new Error(
                `❌ Address for ${contractName} not found on network ${networkName}.\n` +
                `   Please deploy ${contractName} first.`
            );
        }

        return address;
    } catch (error: any) {
        if (error.message.includes("not found")) {
            throw error;
        }
        throw new Error(`❌ Failed to load deployment addresses: ${error.message}`);
    }
}

/**
 * 加载交互数据
 */
export function loadInteractionsData(): InteractionsData {
    if (!fs.existsSync(INTERACTIONS_DATA_FILE)) {
        return {};
    }

    try {
        const content = fs.readFileSync(INTERACTIONS_DATA_FILE, "utf-8");
        return JSON.parse(content);
    } catch (error) {
        console.warn("⚠️  Failed to load interactions.json, returning empty object");
        return {};
    }
}

/**
 * 保存交互数据
 */
export function saveInteractionsData(data: any): void {
    const allData = loadInteractionsData();
    const networkName = getNetworkName();

    // 合并数据
    if (!allData[networkName]) {
        allData[networkName] = {};
    }
    Object.assign(allData[networkName], data);

    // 写入文件
    fs.writeFileSync(
        INTERACTIONS_DATA_FILE,
        JSON.stringify(allData, null, 2),
        "utf-8"
    );
}

/**
 * 读取特定字段
 */
export function getInteractionData(key: string): any {
    const data = loadInteractionsData();
    const networkName = getNetworkName();
    return data[networkName]?.[key];
}

/**
 * 要求特定字段存在
 */
export function requireInteractionData(key: string, errorHint?: string): any {
    const value = getInteractionData(key);

    if (!value) {
        throw new Error(
            `❌ Required data '${key}' not found for network ${getNetworkName()}.\n` +
            `   ${errorHint || `Please run the previous steps first.`}`
        );
    }

    return value;
}

/**
 * 清空当前网络的交互数据
 */
export function clearInteractionsData(): void {
    const allData = loadInteractionsData();
    const networkName = getNetworkName();

    if (allData[networkName]) {
        delete allData[networkName];
        fs.writeFileSync(
            INTERACTIONS_DATA_FILE,
            JSON.stringify(allData, null, 2),
            "utf-8"
        );
        console.log(`🗑️  Cleared interactions data for ${networkName}`);
    }
}

/**
 * 显示当前网络的交互数据
 */
export function displayInteractionsData(): void {
    const data = loadInteractionsData();
    const networkName = getNetworkName();

    console.log(`\n📋 Interactions data on ${networkName}:`);
    console.log("=".repeat(60));

    const networkData = data[networkName];
    if (!networkData || Object.keys(networkData).length === 0) {
        console.log("  No interactions data yet.");
        console.log("  Run demo scripts to create data.");
    } else {
        console.log(JSON.stringify(networkData, null, 2));
    }

    console.log("=".repeat(60));
}
