## Protocol Bank 双链智能合约架构设计

为了实现 Protocol Bank 在 Solana 和以太坊上的双链兼容性，本设计文档将概述核心智能合约的架构，包括 PBX 代币、跨链桥集成以及核心业务逻辑在双链环境下的部署策略。

### 1. PBX 代币架构

**PBX 代币**是 Protocol Bank 生态系统的原生代币，总供应量为 10 亿。为实现双链支持，将采用以下策略：

*   **Solana 上的原生 PBX 代币**: Protocol Bank 的原生 PBX 代币将部署在 Solana 区块链上，遵循 SPL Token 标准。这是 PBX 代币的权威发行方和主要流动性池所在地。
*   **以太坊上的 ERC-20 PBX 代币**: 在以太坊上，将部署一个符合 ERC-20 标准的 PBX 代币合约。这个合约将代表以太坊上的 PBX 代币，其供应量将与通过跨链桥从 Solana 锁定过来的原生 PBX 代币数量严格挂钩。

**总供应量管理**: 核心原则是保持 PBX 代币在所有链上的总流通供应量恒定为 10 亿。这将通过 **锁定-铸造/销毁-解锁** 机制实现，并由跨链桥协议进行协调。

### 2. 跨链桥集成

**Wormhole** 将作为 Protocol Bank 的主要跨链桥解决方案，用于实现 PBX 代币和潜在的协议消息在 Solana 和以太坊之间的安全传输。

*   **资产桥接**: 
    *   当用户希望将 Solana 上的 PBX 转移到以太坊时，原生 PBX 代币将在 Solana 上的 Wormhole 锁定合约中被锁定。Wormhole 守护者网络将验证此锁定事件，并在以太坊上铸造等量的 ERC-20 PBX 代币，发送给用户的以太坊地址。
    *   当用户希望将以太坊上的 ERC-20 PBX 转移回 Solana 时，ERC-20 PBX 代币将在以太坊上的 Wormhole 销毁合约中被销毁。Wormhole 守护者网络将验证此销毁事件，并在 Solana 上解锁等量的原生 PBX 代币，发送给用户的 Solana 地址。
*   **消息传递**: 跨链桥不仅用于资产转移，未来还可以用于传递关键的治理投票、协议升级信号或跨链操作指令，以确保双链生态系统的一致性。

### 3. 核心业务逻辑部署策略

Protocol Bank 的核心业务功能包括 DeFi 借贷、自动支付拆分和流支付。为了在双链环境中优化性能和用户体验，将采用混合部署策略：

*   **Solana 上的核心逻辑**: 
    *   **高性能交易**: 鉴于 Solana 的高吞吐量和低交易成本，大部分需要高频交互和实时处理的核心业务逻辑将优先部署在 Solana 上。这包括：
        *   **DeFi 借贷池**: 借贷池的资金管理、利率计算、清算逻辑等将在 Solana 智能合约中实现。
        *   **自动支付拆分**: B2B 供应链中的自动支付拆分逻辑将在 Solana 上执行，利用其高效的并行处理能力。
        *   **流支付**: 基于项目进度的实时流支付合约将部署在 Solana 上。
    *   **智能合约语言**: 主要使用 Rust 和 Anchor 框架进行开发，以充分利用 Solana 的原生性能。
    *   **EVM 兼容性层**: 对于部分需要与以太坊生态系统紧密结合的业务逻辑，可以考虑在 Solana 上使用 **Neon EVM** 或 **Solang** 部署 Solidity 合约。这将允许以太坊开发者更容易地贡献和集成。

*   **以太坊上的代理/接口合约**: 
    *   **简化交互**: 在以太坊上部署轻量级的代理合约或接口合约，作为用户与 Solana 上核心逻辑交互的入口点。
    *   **跨链指令**: 这些合约将接收以太坊用户的请求（例如，发起借贷、查询 Solana 上的账户余额），并通过 Wormhole 协议将这些指令转发给 Solana 上的相应智能合约。
    *   **状态查询**: 提供接口允许以太坊用户查询 Solana 上的关键状态数据，例如其在 Solana 借贷池中的头寸、PBX 余额等，这些查询可以通过后端 API 或去中心化的预言机网络实现。
    *   **安全性**: 以太坊上的合约将专注于验证和转发，将复杂的业务逻辑和资金管理职责保留在 Solana 上，从而降低以太坊合约的攻击面。

### 4. 后端 API 与前端集成

*   **多链 RPC 适配**: 后端 API 将扩展以支持与 Solana RPC 节点和以太坊 RPC 节点（或 Infura/Alchemy 等服务）的连接。这将允许后端聚合来自两个链的数据，并协调跨链交易。
*   **统一的用户界面**: 前端将提供一个统一的界面，允许用户无缝切换和管理他们在 Solana 和以太坊上的资产和操作。这将包括：
    *   **多链钱包连接**: 支持 Phantom (Solana) 和 MetaMask (Ethereum) 等主流钱包。
    *   **网络选择**: 用户可以明确选择在哪个链上执行操作，或由系统智能推荐。
    *   **资产视图**: 聚合显示用户在两个链上的 PBX 代币和其他资产余额。

### 5. 治理与升级

*   **去中心化治理**: PBX 代币将赋予持有者治理权。治理决策（如协议参数调整、升级）将通过链上投票机制进行。对于跨链治理，可能需要通过 Wormhole 传递治理投票结果，以在两个链上同步执行决策。
*   **模块化升级**: 智能合约将设计为模块化，以便在不影响整个系统的情况下进行升级和维护。

### 总结

Protocol Bank 的双链智能合约架构旨在结合 Solana 的高性能和以太坊的广泛生态系统。通过精心设计的 PBX 代币桥接、Wormhole 跨链通信以及核心业务逻辑的混合部署，Protocol Bank 将能够为用户提供一个强大、灵活且用户友好的数字银行体验。

### 参考文献

[1] QuickNode. (n.d.). *Top 10 Ethereum Bridges for Cross-Chain Transactions*. Available at: [https://www.quicknode.com/builders-guide/top-10-ethereum-bridges](https://www.quicknode.com/builders-guide/top-10-ethereum-bridges)
[2] Alchemy. (n.d.). *An Introduction to the Solana EVM*. Available at: [https://www.alchemy.com/overviews/solana-evm](https://www.alchemy.com/overviews/solana-evm)
[3] Neon EVM. (n.d.). *Ethereum & Solana in Synergy*. Available at: [https://neonevm.org/docs/architecture/eth_sol_solution](https://neonevm.org/docs/architecture/eth_sol_solution)
[4] Solana. (n.d.). *EVM to SVM: Smart Contracts*. Available at: [https://solana.com/developers/evm-to-svm/smart-contracts](https://solana.com/developers/evm-to-svm/smart-contracts)

