import { expect } from "chai";
import { ethers } from "hardhat";

describe("CrediNetSBT", function () {
  async function deployFixture() {
    const [owner, alice, bob] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("CrediNetSBT");
    const sbt = await Factory.deploy("CrediNet SBT", "CNSBT", "");
    await sbt.waitForDeployment();
    return { sbt, owner, alice, bob };
  }

  it("owner can mint and query", async () => {
    const { sbt, owner, alice } = await deployFixture();
    const tx = await sbt.connect(owner).mintBadge(alice.address, 1, "");
    await tx.wait();
    expect(await sbt.hasBadge(alice.address, 1)).to.eq(true);
    const tokenId = await sbt.getBadgeTokenId(alice.address, 1);
    expect(tokenId).to.not.eq(0n);
  });

  it("non-owner cannot mint", async () => {
    const { sbt, alice, bob } = await deployFixture();
    await expect(sbt.connect(alice).mintBadge(bob.address, 1, "")).to.be.reverted;
  });

  it("unique per type per address", async () => {
    const { sbt, owner, alice } = await deployFixture();
    await sbt.connect(owner).mintBadge(alice.address, 2, "");
    await expect(sbt.connect(owner).mintBadge(alice.address, 2, "")).to.be.revertedWith("SBT: already has type");
  });

  it("batch mint", async () => {
    const { sbt, owner, alice, bob } = await deployFixture();
    await sbt.connect(owner).batchMintBadges([alice.address, bob.address], 3, "");
    expect(await sbt.hasBadge(alice.address, 3)).to.eq(true);
    expect(await sbt.hasBadge(bob.address, 3)).to.eq(true);
  });

  it("non-transferable", async () => {
    const { sbt, owner, alice, bob } = await deployFixture();
    await sbt.connect(owner).mintBadge(alice.address, 4, "");
    await expect(sbt.connect(alice).transferFrom(alice.address, bob.address, 1)).to.be.revertedWith("SBT: transfer disabled");
    await expect(sbt.connect(alice).safeTransferFrom(alice.address, bob.address, 1)).to.be.revertedWith("SBT: transfer disabled");
    await expect(sbt.connect(alice).approve(bob.address, 1)).to.be.revertedWith("SBT: approve disabled");
    await expect(sbt.connect(alice).setApprovalForAll(bob.address, true)).to.be.revertedWith("SBT: setApprovalForAll disabled");
  });

  it("burn resets mappings", async () => {
    const { sbt, owner, alice } = await deployFixture();
    const r = await sbt.connect(owner).mintBadge(alice.address, 5, "");
    await r.wait();
    const tokenId = await sbt.getBadgeTokenId(alice.address, 5);
    await sbt.connect(owner).burnBadge(tokenId);
    expect(await sbt.hasBadge(alice.address, 5)).to.eq(false);
    expect(await sbt.getBadgeTokenId(alice.address, 5)).to.eq(0n);
  });
});


