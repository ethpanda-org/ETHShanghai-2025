const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DynamicSBTAgent Integration Tests", function () {
  async function deployIntegrationFixture() {
    const [owner, alice, bob, oracle] = await ethers.getSigners();

    // 1. 部署 DynamicSBTAgent
    const Agent = await ethers.getContractFactory("DynamicSBTAgent");
    const agent = await Agent.deploy();
    await agent.waitForDeployment();

    // 2. 部署 CrediNetSBT
    const SBT = await ethers.getContractFactory("CrediNetSBT");
    const sbt = await SBT.deploy("CrediNet SBT", "CNSBT", "");
    await sbt.waitForDeployment();

    // 3. 配置集成
    await sbt.setDynamicAgent(await agent.getAddress());
    
    // 4. 授予 SBT 合约 UPDATER_ROLE
    const UPDATER_ROLE = await agent.UPDATER_ROLE();
    await agent.grantRole(UPDATER_ROLE, await sbt.getAddress());
    
    // 5. 授予 oracle ORACLE_ROLE
    const ORACLE_ROLE = await agent.ORACLE_ROLE();
    await agent.grantRole(ORACLE_ROLE, oracle.address);

    return { sbt, agent, owner, alice, bob, oracle };
  }

  describe("铸造时自动注册到Agent", function () {
    it("应该在铸造SBT时自动调用 registerSBT()", async function () {
      const { sbt, agent, alice } = await deployIntegrationFixture();

      // 铸造 SBT
      const tx = await sbt.mintBadge(alice.address, 1, "");
      await tx.wait();

      // 验证已注册
      const tokenId = await agent.userTokenIds(alice.address);
      expect(tokenId).to.not.equal(0n);
      
      const owner = await agent.tokenOwners(tokenId);
      expect(owner).to.equal(alice.address);
    });

    it("应该为新用户初始化默认评分", async function () {
      const { sbt, agent, alice } = await deployIntegrationFixture();

      await sbt.mintBadge(alice.address, 1, "");

      const score = await agent.userScores(alice.address);
      expect(score.keystone).to.equal(500);
      expect(score.ability).to.equal(500);
      expect(score.wealth).to.equal(500);
      expect(score.health).to.equal(500);
      expect(score.behavior).to.equal(500);
    });
  });

  describe("动态元数据生成", function () {
    it("tokenURI() 应该返回动态生成的 Base64 JSON", async function () {
      const { sbt, agent, alice } = await deployIntegrationFixture();

      const tx = await sbt.mintBadge(alice.address, 1, "");
      await tx.wait();
      const tokenId = await sbt.getBadgeTokenId(alice.address, 1);

      const uri = await sbt.tokenURI(tokenId);
      
      // 验证是 Base64 格式
      expect(uri).to.include("data:application/json;base64,");
      
      // 解码并验证 JSON 内容
      const base64Data = uri.replace("data:application/json;base64,", "");
      const jsonStr = Buffer.from(base64Data, 'base64').toString();
      const metadata = JSON.parse(jsonStr);
      
      expect(metadata.name).to.include("CrediNet Badge");
      expect(metadata.description).to.include("Dynamic Soulbound Token");
      expect(metadata.attributes).to.be.an('array');
    });

    it("应该包含完整的五维评分属性", async function () {
      const { sbt, agent, alice } = await deployIntegrationFixture();

      await sbt.mintBadge(alice.address, 1, "");
      const tokenId = await sbt.getBadgeTokenId(alice.address, 1);

      const uri = await sbt.tokenURI(tokenId);
      const base64Data = uri.replace("data:application/json;base64,", "");
      const jsonStr = Buffer.from(base64Data, 'base64').toString();
      const metadata = JSON.parse(jsonStr);

      const attrs = metadata.attributes;
      const traitTypes = attrs.map(a => a.trait_type);
      
      expect(traitTypes).to.include("C-Score");
      expect(traitTypes).to.include("Keystone");
      expect(traitTypes).to.include("Ability");
      expect(traitTypes).to.include("Wealth");
      expect(traitTypes).to.include("Health");
      expect(traitTypes).to.include("Behavior");
      expect(traitTypes).to.include("Rarity");
    });
  });

  describe("评分更新后元数据动态变化", function () {
    it("更新评分后 tokenURI 应该返回新的元数据", async function () {
      const { sbt, agent, alice, oracle } = await deployIntegrationFixture();

      // 铸造 SBT
      await sbt.mintBadge(alice.address, 1, "");
      const tokenId = await sbt.getBadgeTokenId(alice.address, 1);

      // 初始元数据（默认评分500）
      const uri1 = await sbt.tokenURI(tokenId);
      const json1 = JSON.parse(Buffer.from(uri1.replace("data:application/json;base64,", ""), 'base64').toString());
      const cScore1 = json1.attributes.find(a => a.trait_type === "C-Score").value;
      
      expect(cScore1).to.equal(500); // 默认评分

      // Oracle 更新评分
      await agent.connect(oracle).updateCreditScore(
        alice.address,
        800, 850, 700, 900, 750 // 新评分
      );

      // 更新后的元数据
      const uri2 = await sbt.tokenURI(tokenId);
      const json2 = JSON.parse(Buffer.from(uri2.replace("data:application/json;base64,", ""), 'base64').toString());
      const cScore2 = json2.attributes.find(a => a.trait_type === "C-Score").value;
      
  // 计算期望的加权总分：800*25 + 850*30 + 700*20 + 900*15 + 750*10 = 80500/100 = 805
  expect(cScore2).to.equal(805);
    });

    it("稀有度应该根据评分变化", async function () {
      const { sbt, agent, alice, oracle } = await deployIntegrationFixture();

      await sbt.mintBadge(alice.address, 1, "");
      const tokenId = await sbt.getBadgeTokenId(alice.address, 1);

      // 初始稀有度（默认500分 = COMMON）
      let uri = await sbt.tokenURI(tokenId);
      let json = JSON.parse(Buffer.from(uri.replace("data:application/json;base64,", ""), 'base64').toString());
      let rarity = json.attributes.find(a => a.trait_type === "Rarity").value;
      expect(rarity).to.equal("COMMON");

      // 更新到 RARE (700-799)
      await agent.connect(oracle).updateCreditScore(alice.address, 750, 750, 750, 750, 750);
      uri = await sbt.tokenURI(tokenId);
      json = JSON.parse(Buffer.from(uri.replace("data:application/json;base64,", ""), 'base64').toString());
      rarity = json.attributes.find(a => a.trait_type === "Rarity").value;
      expect(rarity).to.equal("RARE");

      // 更新到 EPIC (800-899)
      await agent.connect(oracle).updateCreditScore(alice.address, 850, 850, 850, 850, 850);
      uri = await sbt.tokenURI(tokenId);
      json = JSON.parse(Buffer.from(uri.replace("data:application/json;base64,", ""), 'base64').toString());
      rarity = json.attributes.find(a => a.trait_type === "Rarity").value;
      expect(rarity).to.equal("EPIC");

      // 更新到 LEGENDARY (900-1000)
      await agent.connect(oracle).updateCreditScore(alice.address, 950, 950, 950, 950, 950);
      uri = await sbt.tokenURI(tokenId);
      json = JSON.parse(Buffer.from(uri.replace("data:application/json;base64,", ""), 'base64').toString());
      rarity = json.attributes.find(a => a.trait_type === "Rarity").value;
      expect(rarity).to.equal("LEGENDARY");
    });

    it("应该触发 ScoreUpdated 事件", async function () {
      const { sbt, agent, alice, oracle } = await deployIntegrationFixture();

      await sbt.mintBadge(alice.address, 1, "");
      const tokenId = await sbt.getBadgeTokenId(alice.address, 1);

      // 监听事件
      await expect(
        agent.connect(oracle).updateCreditScore(alice.address, 800, 850, 700, 900, 750)
      ).to.emit(agent, "ScoreUpdated")
        .withArgs(alice.address, tokenId, 800, 850, 700, 900, 750, 805);
    });

    it("应该触发 SBTMetadataUpdated 事件", async function () {
      const { sbt, agent, alice, oracle } = await deployIntegrationFixture();

      await sbt.mintBadge(alice.address, 1, "");

      // 监听事件
      const tx = await agent.connect(oracle).updateCreditScore(alice.address, 800, 850, 700, 900, 750);
      const receipt = await tx.wait();
      
      // 查找 SBTMetadataUpdated 事件
      const event = receipt.logs.find(log => {
        try {
          const parsed = agent.interface.parseLog(log);
          return parsed.name === "SBTMetadataUpdated";
        } catch {
          return false;
        }
      });
      
      expect(event).to.not.be.undefined;
    });
  });

  describe("批量更新功能", function () {
    it("应该支持批量更新多个用户的评分", async function () {
      const { sbt, agent, alice, bob, oracle } = await deployIntegrationFixture();

      // 为两个用户铸造 SBT
      await sbt.mintBadge(alice.address, 1, "");
      await sbt.mintBadge(bob.address, 1, "");

      // 批量更新
      await agent.connect(oracle).batchUpdateCreditScores(
        [alice.address, bob.address],
        [800, 700],
        [850, 750],
        [700, 800],
        [900, 850],
        [750, 700]
      );

      // 验证 Alice 的评分
      const aliceScore = await agent.userScores(alice.address);
      expect(aliceScore.keystone).to.equal(800);
      
      // 验证 Bob 的评分
      const bobScore = await agent.userScores(bob.address);
      expect(bobScore.keystone).to.equal(700);
    });

    it("批量更新应该节省 Gas", async function () {
      const { sbt, agent, alice, bob, oracle } = await deployIntegrationFixture();

      await sbt.mintBadge(alice.address, 1, "");
      await sbt.mintBadge(bob.address, 1, "");

      // 批量更新
      const batchTx = await agent.connect(oracle).batchUpdateCreditScores(
        [alice.address, bob.address],
        [800, 700],
        [850, 750],
        [700, 800],
        [900, 850],
        [750, 700]
      );
      const batchReceipt = await batchTx.wait();
      const batchGas = batchReceipt.gasUsed;

      // 单独更新两次
      const tx1 = await agent.connect(oracle).updateCreditScore(alice.address, 800, 850, 700, 900, 750);
      const receipt1 = await tx1.wait();
      const tx2 = await agent.connect(oracle).updateCreditScore(bob.address, 700, 750, 800, 850, 700);
      const receipt2 = await tx2.wait();
      const separateGas = receipt1.gasUsed + receipt2.gasUsed;

      // 批量更新应该更省 Gas
      expect(batchGas).to.be.lessThan(separateGas);
    });
  });

  describe("权限控制", function () {
    it("非 Oracle 不能更新评分", async function () {
      const { sbt, agent, alice, bob } = await deployIntegrationFixture();

      await sbt.mintBadge(alice.address, 1, "");

      await expect(
        agent.connect(bob).updateCreditScore(alice.address, 800, 850, 700, 900, 750)
      ).to.be.reverted;
    });

    it("非 Updater 不能注册 SBT", async function () {
      const { agent, alice } = await deployIntegrationFixture();

      await expect(
        agent.connect(alice).registerSBT(alice.address, 123)
      ).to.be.reverted;
    });

    it("只有 Owner 能设置 DynamicAgent 地址", async function () {
      const { sbt, alice } = await deployIntegrationFixture();

      await expect(
        sbt.connect(alice).setDynamicAgent(alice.address)
      ).to.be.reverted;
    });
  });

  describe("边界条件测试", function () {
    it("评分不能超过1000", async function () {
      const { sbt, agent, alice, oracle } = await deployIntegrationFixture();

      await sbt.mintBadge(alice.address, 1, "");

      await expect(
        agent.connect(oracle).updateCreditScore(alice.address, 1001, 850, 700, 900, 750)
      ).to.be.revertedWith("Score out of range");
    });

    it("未铸造SBT的用户也可以更新评分（但不触发元数据事件）", async function () {
      const { agent, alice, oracle } = await deployIntegrationFixture();

      // 不铸造 SBT，直接更新评分
      await agent.connect(oracle).updateCreditScore(alice.address, 800, 850, 700, 900, 750);

      const score = await agent.userScores(alice.address);
      expect(score.keystone).to.equal(800);
    });

    it("如果未设置 DynamicAgent，tokenURI 应该回退到静态 URI", async function () {
      const { sbt, alice } = await deployIntegrationFixture();

      // 清除 DynamicAgent
      await sbt.setDynamicAgent(ethers.ZeroAddress);

      await sbt.mintBadge(alice.address, 1, "static-uri");
      const tokenId = await sbt.getBadgeTokenId(alice.address, 1);

      const uri = await sbt.tokenURI(tokenId);
      expect(uri).to.equal("static-uri");
    });
  });

  describe("计算逻辑验证", function () {
    it("加权总分计算应该正确", async function () {
      const { agent, alice } = await deployIntegrationFixture();

      // 设置评分
      await agent.userScores(alice.address);

      // 手动设置评分（通过合约存储）
      const ORACLE_ROLE = await agent.ORACLE_ROLE();
      const [oracle] = await ethers.getSigners();
      await agent.grantRole(ORACLE_ROLE, oracle.address);
      
      await agent.updateCreditScore(alice.address, 800, 850, 700, 900, 750);
      
  // 验证加权计算：800*25 + 850*30 + 700*20 + 900*15 + 750*10 = 80500/100 = 805
  const totalScore = await agent.calculateTotalScore(alice.address);
  expect(totalScore).to.equal(805);
    });

    it("稀有度边界值应该正确", async function () {
      const { agent } = await deployIntegrationFixture();

      expect(await agent.getRarity(0)).to.equal(0);     // COMMON
      expect(await agent.getRarity(699)).to.equal(0);   // COMMON
      expect(await agent.getRarity(700)).to.equal(1);   // RARE
      expect(await agent.getRarity(799)).to.equal(1);   // RARE
      expect(await agent.getRarity(800)).to.equal(2);   // EPIC
      expect(await agent.getRarity(899)).to.equal(2);   // EPIC
      expect(await agent.getRarity(900)).to.equal(3);   // LEGENDARY
      expect(await agent.getRarity(1000)).to.equal(3);  // LEGENDARY
    });
  });
});

