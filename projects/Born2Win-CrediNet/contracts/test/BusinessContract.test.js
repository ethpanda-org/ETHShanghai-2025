const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("BusinessContract", function () {
  async function deployAll() {
    const [owner, client, agentOwner, validator, payee] = await ethers.getSigners();

    const Id = await ethers.getContractFactory("MockIdentityRegistry");
    const Rep = await ethers.getContractFactory("MockReputationRegistry");
    const Val = await ethers.getContractFactory("MockValidationRegistry");
    const id = await Id.deploy();
    const rep = await Rep.deploy();
    const val = await Val.deploy();
    await Promise.all([id.waitForDeployment(), rep.waitForDeployment(), val.waitForDeployment()]);

    const Biz = await ethers.getContractFactory("BusinessContract");
    const biz = await Biz.deploy(await id.getAddress(), await rep.getAddress(), await val.getAddress(), 70, 100);
    await biz.waitForDeployment();
    await biz.setGovernance(await id.getAddress(), await rep.getAddress(), await val.getAddress(), 70, 100, validator.address, true);

    // set identity & rep & val
    await id.set(11, agentOwner.address, "");
    await rep.set(11, 5, 80);
    const okHash = ethers.keccak256(ethers.toUtf8Bytes("job-ok"));
    await val.set(okHash, validator.address, 11, 100, ethers.ZeroHash);

    return { owner, client, agentOwner, validator, payee, id, rep, val, biz, okHash };
  }

  it("assignJob fails when reputation low", async () => {
    const { biz, id, rep } = await deployAll();
    await rep.set(11, 5, 60);
    await expect(biz.assignJob(ethers.id("job1"), await id.getAddress(), 11, { value: 1 })).to.be.revertedWith("reputation low");
  });

  it("releasePayment requires validation pass and validator match", async () => {
    const { biz, okHash, agentOwner } = await deployAll();
    const jobId = ethers.id("job2");
    await biz.assignJob(jobId, ethers.ZeroAddress, 11, { value: ethers.parseEther("0.1") });
    await expect(biz.releasePayment(jobId, ethers.keccak256(ethers.toUtf8Bytes("bad")), agentOwner.address)).to.be.reverted;
    // 成功路径：验证通过且验证者匹配，完成转账（余额增加 0.1 ETH）
    const before = await ethers.provider.getBalance(agentOwner.address);
    const tx = await biz.releasePayment(jobId, okHash, agentOwner.address);
    await tx.wait();
    const after = await ethers.provider.getBalance(agentOwner.address);
    expect(after - before).to.equal(ethers.parseEther("0.1"));
  });
});


