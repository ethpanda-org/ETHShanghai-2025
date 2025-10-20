## Solana 和以太坊双链兼容性研究

为了实现 Protocol Bank 在 Solana 和以太坊上的双链兼容性，本研究重点关注了跨链桥技术和 Solana 的 EVM 兼容性解决方案。

### 1. 跨链桥技术

**跨链桥**是连接不同区块链网络，实现资产和数据安全传输的关键基础设施。对于 Solana 和以太坊之间的互操作性，存在多种解决方案：

*   **Wormhole**: Wormhole 是一个通用的消息传递协议，允许在 Solana 和其他 EVM 兼容链之间进行资产和任意数据传输。它通过一组验证者（Guardians）来监控和验证跨链消息，从而实现资产的封装和解封装。例如，ERC-20 代币可以通过 Wormhole 桥接到 Solana 网络，并在 Solana dApp 中使用 [1]。
*   **Sollet**: Sollet 曾是一个用于将 ERC-20 代币桥接到 Solana 的工具，但现在通常建议使用更通用和去中心化的桥接方案，如 Wormhole。
*   **Across Protocol**: Across Protocol 被描述为一个跨链意图协议，旨在提供快速、低成本的互操作性解决方案，且不牺牲安全性 [2]。
*   **其他桥**: 还有许多其他 Web3 桥接方案支持 Solana，如 Alchemy 的 Dapp Store 中列出的多种桥接服务 [3]。

**工作原理**: 跨链桥通常通过锁定源链上的资产并在目标链上铸造等量的封装资产来实现。当资产从目标链桥回源链时，封装资产被销毁，源链上的原始资产被解锁。

### 2. Solana EVM 兼容性解决方案

Solana 原生并非 EVM 兼容链，这意味着它不能直接运行以太坊智能合约（用 Solidity 编写）。然而，为了吸引以太坊开发者并促进生态系统互通，已经出现了多种 EVM 兼容性解决方案：

*   **Neon EVM**: Neon Labs 开发的 Neon EVM 是一个在 Solana 上运行的以太坊虚拟机 (EVM)。它允许开发者在 Solana 区块链上部署和运行以太坊智能合约，并与现有的以太坊工具（如 MetaMask、Truffle、Hardhat）兼容 [4, 5]。Neon EVM 通过将以太坊交易打包成 Solana 交易，并在 Solana 虚拟机 (SVM) 上执行 EVM 字节码来实现兼容性。这使得 Ethereum 用户能够利用 Solana 的高吞吐量和低交易成本 [6]。
*   **Solang**: Solang 是一个 Solidity 编译器，可以将 Solidity 代码编译成 Solana 虚拟机 (SVM) 字节码。这使得开发者可以直接在 Solana 上部署 Solidity 智能合约，而无需通过 EVM 模拟层 [7]。
*   **EIP 协议支持**: 
    *   **EIP-2612 (ERC-20 Permit Extension)**: 允许代币持有者通过链下签名授权智能合约或另一个账户进行消费，而无需预先批准交易。Solana 开发者正在探索如何将其引入 Solana 生态系统 [8]。
    *   **EIP-4361 (Sign in with Ethereum)**: 这是一个广泛采用的标准，用于通过以太坊钱包进行链下认证。Solana 也支持基于此标准的链下钱包认证 [9]。
    *   **ERC-7694 (Solana Storage Router)**: 这是一个提案，旨在允许以太坊协议通过 HTTP 网关检索存储在 Solana 上的数据，并将其转换为 EIP-3668 兼容格式 [10]。

### 总结与建议

为了实现 Protocol Bank 的双链兼容性，建议采取以下策略：

1.  **资产桥接**: 利用 **Wormhole** 等成熟的跨链桥协议，实现 PBX 代币和相关资产在 Solana 和以太坊之间的无缝转移。这将允许用户在两个链上持有和交易 Protocol Bank 的代币。
2.  **智能合约部署**: 
    *   对于核心业务逻辑，考虑在 Solana 上使用 **Neon EVM** 或 **Solang** 部署以太坊兼容的智能合约。这将允许 Protocol Bank 利用 Solana 的高性能，同时保持与以太坊生态系统的兼容性。
    *   或者，可以在两个链上分别部署针对各自链原生优化的智能合约，并通过跨链桥进行通信和协调。这可能需要更复杂的合约设计和维护。
3.  **API 和后端**: 后端 API 需要能够与 Solana RPC 节点和以太坊 RPC 节点（或第三方服务如 Infura/Alchemy）进行交互，以获取链上数据和发送交易。
4.  **钱包集成**: 前端需要支持主流的 Solana 钱包（如 Phantom）和以太坊钱包（如 MetaMask），并提供用户友好的界面来管理双链资产和交易。

实现双链兼容性将大大增加 Protocol Bank 的灵活性和用户基础，但也需要仔细的架构设计和严格的安全审计。

### 参考文献

[1] QuickNode. (n.d.). *Top 10 Ethereum Bridges for Cross-Chain Transactions*. Available at: [https://www.quicknode.com/builders-guide/top-10-ethereum-bridges](https://www.quicknode.com/builders-guide/top-10-ethereum-bridges)
[2] Across Protocol. (n.d.). *Home*. Available at: [https://across.to/](https://across.to/)
[3] Alchemy. (n.d.). *List of 19 Web3 Bridges on Solana (2025)*. Available at: [https://www.alchemy.com/dapps/list-of/web3-bridges-on-solana](https://www.alchemy.com/dapps/list-of/web3-bridges-on-solana)
[4] Alchemy. (n.d.). *An Introduction to the Solana EVM*. Available at: [https://www.alchemy.com/overviews/solana-evm](https://www.alchemy.com/overviews/solana-evm)
[5] Odaily News. (n.d.). *Solana EVM compatibility solution Neon has been ...*. Available at: [http://m.odaily.news/en/newsflash/329790](http://m.odaily.news/en/newsflash/329790)
[6] Neon EVM. (n.d.). *Ethereum & Solana in Synergy*. Available at: [https://neonevm.org/docs/architecture/eth_sol_solution](https://neonevm.org/docs/architecture/eth_sol_solution)
[7] Solana. (n.d.). *EVM to SVM: Smart Contracts*. Available at: [https://solana.com/developers/evm-to-svm/smart-contracts](https://solana.com/developers/evm-to-svm/smart-contracts)
[8] Solana. (n.d.). *What is EIP-2612 on Solana?*. Available at: [https://solana.com/developers/evm-to-svm/eip2612](https://solana.com/developers/evm-to-svm/eip2612)
[9] Supabase. (2025, October 3). *gm 👋 web3, welcome aboard to Sign in with Web3 (Solana ...)*. Available at: [https://supabase.com/blog/login-with-solana-ethereum](https://supabase.com/blog/login-with-solana-ethereum)
[10] Ethereum Improvement Proposals. (2024, April 18). *ERC-7694: Solana Storage Router*. Available at: [https://eips.ethereum.org/EIPS/eip-7694](https://eips.ethereum.org/EIPS/eip-7694)

