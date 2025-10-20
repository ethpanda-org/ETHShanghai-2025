# OnChain Data Copyright SaaS
# DimSum RightProof

important links:

* GitHub 仓库：https://github.com/noncegeek/onchain-data-copyright-saas

* Demo 视频: [https://youtu.be/92nSSL3cfxE](https://youtu.be/92nSSL3cfxE)
* 在线演示链接: [https://rightproof.app.aidimsum.com/](https://rightproof.app.aidimsum.com/)
* Pitch Deck[【腾讯文档】RightProof](https://docs.qq.com/slide/DQ1J4U3pIV2ZMZFZC)
* 合约信息：
  * [Smart Contract BodhiBasedCopyright](https://sepolia.etherscan.io/address/0x558D4A4C35d00A03A3CF831A2DcFe73BeBE58fc8#code)
  * [Smart Contract LicenseNFT](https://sepolia.etherscan.io/address/0x52e3EBaDAe5fBE562D997220Ea819BF46D4c35f5#code)
  * [Smart Contract CopyrightNFT](https://sepolia.etherscan.io/address/0x2e742854e540E5cFc8E715EFeaDea6e49b2De6C6#code)


keypoints:

* 从「现实订单」出发，推导「区块链基础设施」，而非「假设需求🤔」
* 基于 Bodhi 协议，实现数据代币化（RWA 化），支持链上购买「数据的股份」
* 参考开源协议的设计，设计面向数据集的「链上确权协议」与「数据确权合约」

## 🌟 Overview

![image-20251020161015270](https://p.ipic.vip/ruqpkx.png)

- **项目名称**：DimSum RightProof: OnChain Data Copyright SaaS
- **一句话介绍**：三大功能 — 数据存证、确权与代币化
- **目标用户**：已有平台的数据集提供方、外部平台的数据集提供方与内容创作者。
- **核心问题与动机（Pain Points）**：
  1. 数据集不像开源项目一样有「协议」，尤其是关于收益如何分配的条款。
  2. 数据集的代币化方案还未被考虑。
- **解决方案（Solution）**：设计一套针对数据集的存证、确权与代币化的 AI SaaS 服务。

### ⚖️ On-Chain Data Rights Confirmation

- **Design on-chain data protocols (License)**
- **Clear usage methods and revenue distribution**
- Automated royalty distribution
- Flexible licensing models

## 🏗️ Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                           Frontend (dApp)                          │
├────────────────────────────────────────────────────────────────────┤
│  Dataset Manager  │  DATA LICENSE Manager  │  Galleries | API Docs │
└────────────────────────────────────────────────────────────────────┘
                              ▲
                              │
┌─────────────────────────────────────────────────────────────┐
│              Bodhi-based Data Rights Contract               │
├─────────────────────────────────────────────────────────────┤
│ Tokenization │ Rights Confirmation │ Proof of Existence     │
└─────────────────────────────────────────────────────────────┘
                              ▲
                              │
┌───────────────────────────────────────────────────────────────────────────┐
│  Bodhi Protocol      │  DATA LICENSE NFT          | dataset NFT           │
│  (Data Tokenization) │  (Data License Collection) | (Dataset Collection)  │
└───────────────────────────────────────────────────────────────────────────┘
```

### 🔒 Contract Structure (Solidity UML)

<img width="1228" height="728" alt="image" src="https://github.com/user-attachments/assets/c506cceb-9cb3-4937-aebe-4756c778a0e2" />


## 🛠️ Technical Stack

- **Frontend**: Next.js, React, TypeScript
- **Blockchain**: Ethereum (Sepolia Testnet)
- **Smart Contracts**: Solidity
- **Protocol**: Bodhi Data Tokenization Protocol
- **Network**: Sepolia Testnet

## 📋 Core Components

### Dataset Gallery
- Browse and discover datasets
- Filter by license type and ownership
- View dataset metadata and licensing information
- Support for various data formats

### License Gallery
- Comprehensive license templates
- Support for major open-source licenses (MIT, Apache, GPL, etc.)
- Custom license creation
- License status management

### Debug Interface
- Interactive contract testing
- Real-time contract interaction
- Contract information display
- Network configuration management

## 🎨 User Interface & Experience

### 📱 Interface Screenshots

<img width="1439" height="782" alt="image" src="https://github.com/user-attachments/assets/3252f9f6-fa4d-4384-a856-4c169ff998c1" />

<img width="1440" height="775" alt="image" src="https://github.com/user-attachments/assets/c69ac09f-7273-4742-a3e1-1959ac4f6e73" />

<img width="866" height="751" alt="image" src="https://github.com/user-attachments/assets/ad0edd1d-af1a-4f21-93b7-1a5b838969b6" />


### 🔄 User Journey Flow

See in [demo video](https://youtu.be/92nSSL3cfxE).

The platform provides a modern, intuitive interface with:

- **Dark theme** optimized for developers
- **Responsive design** for all devices
- **Card-based layouts** for easy navigation
- **Real-time updates** and status indicators
- **Comprehensive filtering** and search capabilities

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- MetaMask or compatible wallet
- Holesky testnet ETH

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/ninglinLiu/onchain-data-copyright-saas.git
   cd onchain-data-copyright-saas
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Start the development server**
   ```bash
   cd packages/nextjs
   npm run dev
   # or
   yarn dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:3000`

### Usage

1. **Connect your wallet** to Sepolia Network
2. **Browse datasets** in the Dataset Gallery
3. **Explore licenses** in the License Gallery
4. **Interact with contracts** in the Debug interface
5. **Dataset to nft** in homepage

## 📈 Business Model & Real Impact

### 🎯 Market-Driven Approach
- **Pre-launch client reservations** ensure R&D cost coverage
- **B2B focus** with multiple enterprise clients
- **Minimum Viable Business Model** for sustainable growth

### 💼 Real-World Use Cases
**Scenario 1**: AI Training Company
- Uploads proprietary training datasets
- Generates custom licensing terms
- Receives ongoing royalties from AI model developers
- **Result**: 40% increase in data monetization

**Scenario 2**: Research Institution
- Publishes research data with open licenses
- Tracks usage across multiple projects
- Ensures proper attribution and funding
- **Result**: Transparent research impact measurement

### 🚀 Future Plans
![image-20251020161544155](https://p.ipic.vip/0bjki2.png)

## 👥 Team

**AI DimSum Lab × Root.AI**

- **Vision**: Building next-generation corpus × AI system and ecosystem
- **Founded**: 2025
- **Team**: Leeduckgo, Ning Lin and others.

## 🔗 Demo & Links

- **Demo Video**: [https://youtu.be/92nSSL3cfxE](https://youtu.be/92nSSL3cfxE)
- **Deck**: [docs.qq.com](https://docs.qq.com/slide/DQ1J4U3pIV2ZMZFZC)
- **GitHub**: [Repository](https://github.com/ninglinLiu/onchain-data-copyright-saas)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

## 📞 Contact

- **Email**: leeduckgo@gmail.com
- **Wechat**: 197626581
- **Twitter**: https://x.com/0xleeduckgo

## 🙏 Acknowledgments

- **Bodhi Protocol** for data tokenization infrastructure
- **Ethereum Foundation** for blockchain technology
- **Open Source Community** for inspiration and tools

---

## 🚀 Ready to Revolutionize Data Rights?

**Built with ❤️ by AI DimSum Lab × Root.AI**

*Empowering data creators in the AI era through blockchain technology.*

### 🎯 Join the Revolution
- **Data Creators**: Turn your datasets into passive income streams
- **AI Companies**: Access licensed data with clear usage terms
- **Developers**: Build on programmable data ownership primitives
- **Researchers**: Ensure your data contributions are properly attributed

**This is just the beginning. The future of data is programmable, verifiable, and profitable.**

---

*"In 72 hours, we didn't just build an app—we built the future of data ownership."*
