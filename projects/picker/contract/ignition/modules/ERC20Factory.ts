import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("ERC20FactoryModule", (m) => {
    // 部署ERC20Factory合约
    const erc20Factory = m.contract("ERC20Factory");

    // 返回部署的合约实例
    return { erc20Factory };
});
