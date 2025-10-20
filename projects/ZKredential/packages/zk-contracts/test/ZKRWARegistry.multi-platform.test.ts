import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import * as snarkjs from "snarkjs";
import path from "path";
import fs from "fs";

/**
 * 多平台 ZK 证明系统测试
 * 测试三个平台：PropertyFy, RealT, RealestateIO
 */
describe("ZKRWARegistry 多平台测试", function () {
  // 测试夹具
  async function deployFixture() {
    const [owner, user1, user2] = await ethers.getSigners();

    // 部署 Groth16Verifier (支持 12 个公共信号)
    // 注意：CompositeProofVerifier.sol 文件中的合约名是 Groth16Verifier
    const Groth16VerifierFactory = await ethers.getContractFactory(
      "Groth16Verifier",
      {
        libraries: {}
      }
    );
    const verifier = await Groth16VerifierFactory.deploy();
    await verifier.waitForDeployment();

    console.log(`   📍 Groth16Verifier 部署到: ${await verifier.getAddress()}`);

    // 部署 ZKRWARegistry
    const ZKRWARegistry = await ethers.getContractFactory("ZKRWARegistry");
    const registry = await ZKRWARegistry.deploy(await verifier.getAddress());
    await registry.waitForDeployment();

    console.log(`   📍 ZKRWARegistry 部署到: ${await registry.getAddress()}`);

    return { verifier, registry, owner, user1, user2 };
  }

  // 生成测试证明
  async function generateTestProof(platform: string) {
    console.log(`\n🔧 生成 ${platform} 平台测试证明...`);
    
    const circuitPaths = {
      propertyfy: {
        wasm: path.join(__dirname, "../../zk-proof-server/circuits/build/propertyfy/propertyfy_circuit_js/propertyfy_circuit.wasm"),
        zkey: path.join(__dirname, "../../zk-proof-server/circuits/keys/propertyfy_final.zkey"),
        vkey: path.join(__dirname, "../../zk-proof-server/circuits/keys/propertyfy_verification_key.json"),
        signals: 12
      },
      realt: {
        wasm: path.join(__dirname, "../../zk-proof-server/circuits/build/realt/realt_circuit_js/realt_circuit.wasm"),
        zkey: path.join(__dirname, "../../zk-proof-server/circuits/keys/realt_final.zkey"),
        vkey: path.join(__dirname, "../../zk-proof-server/circuits/keys/realt_verification_key.json"),
        signals: 12
      },
      realestate: {
        wasm: path.join(__dirname, "../../zk-proof-server/circuits/build/realestate/realestate_circuit_js/realestate_circuit.wasm"),
        zkey: path.join(__dirname, "../../zk-proof-server/circuits/keys/realestate_final.zkey"),
        vkey: path.join(__dirname, "../../zk-proof-server/circuits/keys/realestate_verification_key.json"),
        signals: 16
      }
    };

    const circuitPath = circuitPaths[platform as keyof typeof circuitPaths];
    if (!circuitPath) {
      throw new Error(`不支持的平台: ${platform}`);
    }

    // 检查文件是否存在
    if (!fs.existsSync(circuitPath.wasm)) {
      throw new Error(`WASM 文件不存在: ${circuitPath.wasm}`);
    }
    if (!fs.existsSync(circuitPath.zkey)) {
      throw new Error(`zkey 文件不存在: ${circuitPath.zkey}`);
    }

    // 准备测试输入
    const baseInput = {
      actualAge: 25,
      actualCountry: 156,
      kycLevel: 3,
      credentialHash: "5315466344957146263666072837649359744017266469581992124286820189821047085896",
      secret: "2263666072837649359744017266469581992124286820189821047085896531546634495744",
      minAge: 18,
      allowedCountry: 156,
      minKycLevel: 2,
      walletAddress: "1228224755904541334214116991276721762349428082776",
      timestamp: Math.floor(Date.now() / 1000).toString()
    };

    let input;
    if (platform === 'propertyfy') {
      input = {
        ...baseInput,
        actualNetWorth: 100000,
        actualLiquidAssets: 50000,
        isAccreditedInvestor: 1,
        incomeLast12Months: 80000,
        minNetWorth: 50000,
        minLiquidAssets: 20000,
        requireAccredited: 0,
        minIncome: 30000
      };
    } else if (platform === 'realt') {
      input = {
        ...baseInput,
        amlRiskScore: 15,
        isOnSanctionsList: 0,
        isPEP: 0,
        sourceOfFundsVerified: 1,
        transactionPatternScore: 85,
        maxAMLRiskScore: 50,
        allowPEP: 0,
        requireFundsVerification: 1,
        minTransactionScore: 60
      };
    } else {
      // realestate - 所有字段
      input = {
        ...baseInput,
        actualNetWorth: 100000,
        actualLiquidAssets: 50000,
        isAccreditedInvestor: 1,
        incomeLast12Months: 80000,
        amlRiskScore: 15,
        isOnSanctionsList: 0,
        isPEP: 0,
        sourceOfFundsVerified: 1,
        transactionPatternScore: 85,
        minNetWorth: 50000,
        minLiquidAssets: 20000,
        requireAccredited: 0,
        minIncome: 30000,
        maxAMLRiskScore: 50,
        allowPEP: 0,
        requireFundsVerification: 1,
        minTransactionScore: 60
      };
    }

    console.log(`   生成证明中...`);
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      input,
      circuitPath.wasm,
      circuitPath.zkey
    );

    console.log(`   ✅ 证明生成成功`);
    console.log(`   📊 公共信号数量: ${publicSignals.length} (预期: ${circuitPath.signals})`);

    // 验证证明
    const vkey = JSON.parse(fs.readFileSync(circuitPath.vkey, 'utf8'));
    const isValid = await snarkjs.groth16.verify(vkey, publicSignals, proof);
    console.log(`   🔍 本地验证: ${isValid ? '✅ 通过' : '❌ 失败'}`);

    expect(publicSignals.length).to.equal(circuitPath.signals, `${platform} 平台公共信号数量应该是 ${circuitPath.signals}`);
    expect(isValid).to.be.true;

    return { proof, publicSignals };
  }

  describe("基础功能测试", function () {
    it("应该成功部署合约", async function () {
      const { verifier, registry } = await loadFixture(deployFixture);
      
      expect(await registry.getAddress()).to.be.properAddress;
      expect(await verifier.getAddress()).to.be.properAddress;
      
      console.log(`   ✅ Registry 地址: ${await registry.getAddress()}`);
      console.log(`   ✅ Verifier 地址: ${await verifier.getAddress()}`);
    });

    it("验证器合约应该关联到注册合约", async function () {
      const { verifier, registry } = await loadFixture(deployFixture);
      
      const registeredVerifier = await registry.verifier();
      expect(registeredVerifier).to.equal(await verifier.getAddress());
      
      console.log(`   ✅ 验证器地址匹配`);
    });
  });

  describe("PropertyFy 平台测试 (12个公共信号)", function () {
    it("应该成功生成 PropertyFy 证明", async function () {
      this.timeout(60000); // 增加超时时间
      
      const { proof, publicSignals } = await generateTestProof('propertyfy');
      
      expect(proof).to.have.property('pi_a');
      expect(proof).to.have.property('pi_b');
      expect(proof).to.have.property('pi_c');
      expect(publicSignals).to.have.lengthOf(12);
    });

    it("PropertyFy 证明应该通过链上验证", async function () {
      this.timeout(60000);
      
      const { verifier } = await loadFixture(deployFixture);
      const { proof, publicSignals } = await generateTestProof('propertyfy');
      
      // 转换为合约格式
      const proofA = [BigInt(proof.pi_a[0]), BigInt(proof.pi_a[1])];
      const proofB = [
        [BigInt(proof.pi_b[0][1]), BigInt(proof.pi_b[0][0])],
        [BigInt(proof.pi_b[1][1]), BigInt(proof.pi_b[1][0])]
      ];
      const proofC = [BigInt(proof.pi_c[0]), BigInt(proof.pi_c[1])];
      const pubSignals = publicSignals.map((s: string) => BigInt(s));
      
      console.log(`   调用验证器合约...`);
      const isValid = await verifier.verifyProof(proofA, proofB, proofC, pubSignals);
      
      console.log(`   🔍 链上验证结果: ${isValid ? '✅ 通过' : '❌ 失败'}`);
      expect(isValid).to.be.true;
    });

    it("应该成功注册 PropertyFy 证明", async function () {
      this.timeout(60000);
      
      const { registry, user1 } = await loadFixture(deployFixture);
      const { proof, publicSignals } = await generateTestProof('propertyfy');
      
      const proofA = [BigInt(proof.pi_a[0]), BigInt(proof.pi_a[1])];
      const proofB = [
        [BigInt(proof.pi_b[0][1]), BigInt(proof.pi_b[0][0])],
        [BigInt(proof.pi_b[1][1]), BigInt(proof.pi_b[1][0])]
      ];
      const proofC = [BigInt(proof.pi_c[0]), BigInt(proof.pi_c[1])];
      const pubSignals = publicSignals.map((s: string) => BigInt(s));
      
      const expiresAt = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;
      
      console.log(`   注册身份到链上...`);
      const tx = await registry.connect(user1).registerIdentity(
        proofA,
        proofB,
        proofC,
        pubSignals,
        "propertyfy-kyc",
        expiresAt
      );
      
      await tx.wait();
      console.log(`   ✅ 注册成功！交易哈希: ${tx.hash}`);
      
      // 验证注册状态
      const hasValid = await registry.hasValidIdentity(user1.address);
      expect(hasValid).to.be.true;
      console.log(`   ✅ 身份有效性: 已注册`);
    });
  });

  describe("RealT 平台测试 (12个公共信号)", function () {
    it("应该成功生成 RealT 证明", async function () {
      this.timeout(60000);
      
      const { proof, publicSignals } = await generateTestProof('realt');
      
      expect(publicSignals).to.have.lengthOf(12);
      console.log(`   ✅ RealT 证明生成成功（12个信号）`);
    });

    it("RealT 证明应该通过链上验证", async function () {
      this.timeout(60000);
      
      const { verifier } = await loadFixture(deployFixture);
      const { proof, publicSignals } = await generateTestProof('realt');
      
      const proofA = [BigInt(proof.pi_a[0]), BigInt(proof.pi_a[1])];
      const proofB = [
        [BigInt(proof.pi_b[0][1]), BigInt(proof.pi_b[0][0])],
        [BigInt(proof.pi_b[1][1]), BigInt(proof.pi_b[1][0])]
      ];
      const proofC = [BigInt(proof.pi_c[0]), BigInt(proof.pi_c[1])];
      const pubSignals = publicSignals.map((s: string) => BigInt(s));
      
      const isValid = await verifier.verifyProof(proofA, proofB, proofC, pubSignals);
      
      console.log(`   🔍 RealT 链上验证: ${isValid ? '✅ 通过' : '❌ 失败'}`);
      expect(isValid).to.be.true;
    });
  });

  describe("RealestateIO 平台测试 (16个公共信号)", function () {
    it("应该成功生成 RealestateIO 证明", async function () {
      this.timeout(60000);
      
      const { proof, publicSignals } = await generateTestProof('realestate');
      
      expect(publicSignals).to.have.lengthOf(16);
      console.log(`   ✅ RealestateIO 证明生成成功（16个信号）`);
    });

    it("RealestateIO 证明验证（需要独立验证器）", async function () {
      this.timeout(60000);
      
      console.log(`   ⚠️  当前 CompositeProofVerifier 只支持 12 个信号`);
      console.log(`   ⚠️  RealestateIO 需要部署独立的 16 信号验证器`);
      console.log(`   ℹ️  跳过链上验证测试`);
      
      // 这个测试标记为待实现
      this.skip();
    });
  });

  describe("多平台隔离测试", function () {
    it("不同平台的证明应该有不同的公共信号", async function () {
      this.timeout(120000);
      
      const propertyfyProof = await generateTestProof('propertyfy');
      const realtProof = await generateTestProof('realt');
      
      console.log(`\n   📊 对比分析:`);
      console.log(`   PropertyFy 信号数: ${propertyfyProof.publicSignals.length}`);
      console.log(`   RealT 信号数: ${realtProof.publicSignals.length}`);
      
      // 两者都是 12 个信号
      expect(propertyfyProof.publicSignals).to.have.lengthOf(12);
      expect(realtProof.publicSignals).to.have.lengthOf(12);
      
      // 但字段 6-9 应该不同（Asset vs AML）
      const propertyfy_field6 = propertyfyProof.publicSignals[6]; // minNetWorth
      const realt_field6 = realtProof.publicSignals[6]; // maxAMLRiskScore
      
      console.log(`   PropertyFy [6]: ${propertyfy_field6} (minNetWorth)`);
      console.log(`   RealT [6]: ${realt_field6} (maxAMLRiskScore)`);
      
      // 值应该不同（因为含义不同）
      expect(propertyfy_field6).to.not.equal(realt_field6);
      console.log(`   ✅ 不同平台的字段值确实不同`);
    });
  });

  describe("Gas 估算测试", function () {
    it("应该能够估算注册 Gas", async function () {
      this.timeout(60000);
      
      const { registry, user1 } = await loadFixture(deployFixture);
      const { proof, publicSignals } = await generateTestProof('propertyfy');
      
      const proofA = [BigInt(proof.pi_a[0]), BigInt(proof.pi_a[1])];
      const proofB = [
        [BigInt(proof.pi_b[0][1]), BigInt(proof.pi_b[0][0])],
        [BigInt(proof.pi_b[1][1]), BigInt(proof.pi_b[1][0])]
      ];
      const proofC = [BigInt(proof.pi_c[0]), BigInt(proof.pi_c[1])];
      const pubSignals = publicSignals.map((s: string) => BigInt(s));
      
      const expiresAt = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;
      
      const gasEstimate = await registry.connect(user1).registerIdentity.estimateGas(
        proofA,
        proofB,
        proofC,
        pubSignals,
        "test-provider",
        expiresAt
      );
      
      console.log(`   ⛽ 预估 Gas: ${gasEstimate.toString()}`);
      expect(gasEstimate).to.be.greaterThan(0);
    });
  });
});

