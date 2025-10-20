const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CrediNetSBT with registries", function () {
  async function deployAll() {
    const [owner, issuer, user, validator, payee] = await ethers.getSigners();

    const Id = await ethers.getContractFactory("MockIdentityRegistry");
    const Rep = await ethers.getContractFactory("MockReputationRegistry");
    const Val = await ethers.getContractFactory("MockValidationRegistry");
    const id = await Id.deploy();
    const rep = await Rep.deploy();
    const val = await Val.deploy();
    await Promise.all([id.waitForDeployment(), rep.waitForDeployment(), val.waitForDeployment()]);

    const SBT = await ethers.getContractFactory("CrediNetSBT");
    const sbt = await SBT.deploy("CrediNet SBT", "CNSBT", "");
    await sbt.waitForDeployment();

    // governance setup
    await sbt.connect(owner).setRegistries(await id.getAddress(), await rep.getAddress(), await val.getAddress());
    await sbt.connect(owner).setThresholds(70, 100);
    await sbt.connect(owner).setPreferredValidator(validator.address);
    await sbt.connect(owner).setIssuerAgentId(owner.address, 1);
    await sbt.connect(owner).setEnforceRegistryChecks(true);

    // identity & reputation & validation states
    await id.set(1, owner.address, "");
    await rep.set(1, 10, 80);
    const requestHash = ethers.keccak256(ethers.toUtf8Bytes("req-1"));
    await val.set(requestHash, validator.address, 1, 100, ethers.ZeroHash);

    return { owner, issuer, user, validator, payee, id, rep, val, sbt, requestHash };
  }

  it("reverts when reputation below threshold", async () => {
    const { sbt, id, rep } = await deployAll();
    await rep.set(1, 10, 60);
    const badHash = ethers.keccak256(ethers.toUtf8Bytes("req-bad"));
    await expect(sbt.mintBadgeWithValidation(await id.getAddress(), 1, "", badHash)).to.be.revertedWith("SBT: reputation below threshold");
  });

  it("reverts when validation not passed", async () => {
    const { sbt, user, validator } = await deployAll();
    const agentId = 1;
    const badHash = ethers.keccak256(ethers.toUtf8Bytes("req-bad2"));
    // 写入相同 agentId 但 response < threshold
    const Val = await ethers.getContractFactory("MockValidationRegistry");
    // 获取部署实例地址
    // 通过合约上的 public 变量无法直接拿到现有实例；直接使用 sbt 中的存储读取更复杂，简化：重新设置 registries 并注入新的 Mock
    const newVal = await Val.deploy();
    await newVal.waitForDeployment();
    await newVal.set(badHash, validator.address, agentId, 50, ethers.ZeroHash);
    const id = await (await ethers.getContractFactory("MockIdentityRegistry")).deploy();
    const rep = await (await ethers.getContractFactory("MockReputationRegistry")).deploy();
    await Promise.all([id.waitForDeployment(), rep.waitForDeployment()]);
    await id.set(agentId, (await ethers.getSigners())[0].address, "");
    await rep.set(agentId, 10, 80);
    await sbt.setRegistries(await id.getAddress(), await rep.getAddress(), await newVal.getAddress());
    await expect(sbt.mintBadgeWithValidation(user.address, 1, "", badHash)).to.be.revertedWith("SBT: validation not passed");
  });

  it("mints when all checks satisfied and stores requestHash", async () => {
    const { sbt, user, requestHash } = await deployAll();
    const tx = await sbt.mintBadgeWithValidation(user.address, 2, "", requestHash);
    await tx.wait();
    expect(await sbt.hasBadge(user.address, 2)).to.eq(true);
    const tokenId = await sbt.getBadgeTokenId(user.address, 2);
    expect(await sbt.tokenValidationHashOf(tokenId)).to.eq(requestHash);
  });
});


