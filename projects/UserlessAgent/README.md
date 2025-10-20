# UserlessAgent
为每个用户量身定制的AI去中心化治理代理人平台。

解决当前用户参与去中心化治理的主要痛点，利用量身定制的最能体现用户自身价值观的AI代理人帮助用户进行投票决策，极大降低参与门槛；将提案以流的形式进行推送，整合进入钱包插件，让参与治理像查看余额一样简便。

目前投票参与率普遍较低，我们旨在利用AI技术释放去中心化治理的庞大潜力，让治理变得触手可及，让成千上万的代币持有者能轻松参与投票和治理。

## 快速开始
在本地运行网页UI演示：
```bash
cd frontend
npm install
npm run dev
```

## 项目背景
> [Onchain governance needs more participation](https://www.coinbase.com/institutional/research-insights/research/monthly-outlook/monthly-outlook-november-2024): 
> relatively low levels of participation do pose greater challenges today. Many of the large DeFi protocols including Aave, Compound, Uniswap have all faced situations where non-contentious votes failed as a result of low participation rates.

### 1. 价值观
- 我们相信web3的价值：去中心化
- 去中心化自治是区块链最早的用例之一
- 民主，反大公司大资本垄断独裁

### 2. 去中心化治理现状
- 参与率（voting turnout）普遍较低
- 一千个真实的holder可能只有十个人参与治理
- 甚至许多大型的DeFi protocol都面临参与率低的问题，例如AAVE、Uniswap，甚至有可能有不够quorum的情况

### 3. 真实的AAVE案例
- 流通数量：15.09M
- 总量：16M
- governance中一个提案的voting power总和：0.774M，人数不到500，有时甚至不到50
- 5%左右的参与率，（即使假设前十的holder（binance冷钱包、各方金库）都不投票，也只有10%左右）
- [governance](https://aave.com/docs/developers/governance#voting)
- [an example proposal](https://vote.onaave.com/proposal/?proposalId=142)

### 4. 当下去中心化治理的痛点
- **accessibility**：治理提案一般都在专门的官方论坛上，不在大家日常生活的范围内，一般用户并不会主动去查看这些论坛，自然不会了解和参与治理
- **time-consuming**：正式的提案一般文字较长，专业性较强，大家不愿意花时间去看和研究

## UserlessAgent解决方案
- 为每个用户量身定制的AI投票代理人，将voting power delegate给AI代理，做出最符合用户自己的价值观的投票决策
- 用户只需要回答一份价值观问卷，我们会据此生成用户自己的价值观向量
- 接着我们用多个典型的性格各异的AI原型体，它们有着不同价值观向量，用原型体的价值观向量去拟合用户的价值观向量，就得到了与用户价值观最相符的代理
- 相较传统的delegate给其他真人的优势：我们往往只能找到意见与我们自身"较为符合"的代表，不可能找到一个各方面价值观都和自己相符的代表。而我们量身定制的AI代理人可以完美匹配用户的价值观

## 链上架构
![img](./media/architecture.png)

which can be abstracted as below:

![blackbox](./media/black-box.png)

VotingContract stands for **Business-end**: DAOs or Protocols which want to use our service to boost voting turnout and governance participation rate. User Interface stands for **Consumer-end**: users who utilize EchoVote to be easily get involved in decentralized governance. Both ends should be able to easily take advantage EchoVote service.

## 未来规划
将proposal stream整合入钱包插件，使用户参与治理就像查看余额一样简便。

- 解决accessibility问题的重磅产品
- 将proposal stream集成在用户每天使用的钱包中，极大地方便了用户接触治理的门槛和成本，让每个用户都能轻松地了解到自己持有的币的治理社区正在发生什么，并且能很容易地参与提案表决
- 人格/价值观测试自带流量，如果能够配合OKX的web3人格测试这样的巨头的活动，能很快地积累起用户基础

## UI演示
![ui1](./media/UIdemo/ui1.png)
![ui2](./media/UIdemo/ui2.png)
![ui3](./media/UIdemo/ui3.png)
![ui4](./media/UIdemo/ui4.png)
![ui5](./media/UIdemo/ui5.png)
![ui6](./media/UIdemo/ui6.png)
![ui7](./media/UIdemo/ui7.png)

## 技术栈
- **Frontend**: React + TypeScript + Vite
- **Authentication**: Privy
- **Smart Contracts**: Solidity
- **AI Agents**: Custom AI character system

## 贡献指南
欢迎提交Issue和Pull Request来帮助改进EchoVote项目。

## 许可证
本项目采用MIT许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。