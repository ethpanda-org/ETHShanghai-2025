import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("ERC721FactoryModule", (m) => {
    // 部署ERC721Factory合约
    const erc721Factory = m.contract("ERC721Factory");

    // 返回部署的合约实例
    return { erc721Factory };
});