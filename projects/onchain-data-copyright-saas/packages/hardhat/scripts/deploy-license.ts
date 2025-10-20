import hre from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  const { ethers, artifacts } = hre;

  console.log("🚀 开始部署 License 合约...");
  
  // 1) 部署 License
  const License = await ethers.getContractFactory("License");
  const license = await License.deploy();
  await license.deployed();
  const address = license.address;
  console.log("✅ License deployed to:", address);

  // 2) 读取 ABI（更稳：直接用 Hardhat 的 artifacts）
  const artifact = await artifacts.readArtifact("License");
  const abi = artifact.abi;

  // 3) 写回前端配置（monorepo: packages/nextjs）
  const nextDir = path.join(__dirname, "..", "..", "nextjs");
  if (fs.existsSync(nextDir)) {
    const outDir = path.join(nextDir, "config");
    fs.mkdirSync(outDir, { recursive: true });
    
    // 读取现有配置
    const configPath = path.join(outDir, "deployedContracts.ts");
    let existingConfig: any = {};
    
    if (fs.existsSync(configPath)) {
      try {
        const content = fs.readFileSync(configPath, "utf8");
        // 简单解析现有配置
        const match = content.match(/export const deployedContracts = ({[\s\S]*?});/);
        if (match) {
          existingConfig = eval("(" + match[1] + ")");
        }
      } catch (e) {
        console.log("⚠️ 无法解析现有配置，将创建新配置");
      }
    }
    
    // 更新配置
    existingConfig.license = address;
    
    const ts = `export const deployedContracts = {
  registry: "${existingConfig.registry || ''}",
  licenseCenter: "${existingConfig.licenseCenter || ''}",
  bodhi1155: "${existingConfig.bodhi1155 || ''}",
  license: "${address}"
};

export const LICENSE_ADDRESS = "${address}";
export const LICENSE_ABI = ${JSON.stringify(abi, null, 2)} as const;

const licenseContract = { address: LICENSE_ADDRESS, abi: LICENSE_ABI };
export default licenseContract;
`;
    fs.writeFileSync(configPath, ts, "utf8");
    console.log("📝 Wrote: packages/nextjs/config/deployedContracts.ts");
  } else {
    console.log("⚠️ packages/nextjs 目录不存在，跳过前端配置写入");
  }
  
  console.log("\n✅ 部署完成！");
  console.log("合约地址:", address);
  console.log("网络:", hre.network.name);
}

main().catch((e) => {
  console.error("❌ 部署失败:", e);
  process.exit(1);
});




